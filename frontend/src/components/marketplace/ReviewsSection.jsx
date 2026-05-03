import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Star, Send } from "lucide-react";
import { API } from "../../utils/api";
import { toast } from "sonner";

export const ReviewsSection = ({ productId, canReview, avgRating, reviewCount }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/marketplace/products/${productId}/reviews?page=${page}`);
      setReviews((prev) => page === 1 ? (data.reviews || []) : [...prev, ...(data.reviews || [])]);
      if (data.reviews?.some((r) => r.is_me)) setAlreadyReviewed(true);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.length > 500) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/marketplace/products/${productId}/reviews`, { rating, text: text.trim() }, { withCredentials: true });
      setText("");
      setAlreadyReviewed(true);
      setPage(1);
      await fetchReviews();
      toast.success("Review posted!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to post review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xl font-black uppercase">Reviews</h3>
        {reviewCount > 0 && (
          <span className="flex items-center gap-1 text-sm font-bold bg-pastel-yellow px-2 py-0.5 border-2 border-black">
            <Star className="w-3 h-3 fill-current" /> {avgRating} from {reviewCount} review{reviewCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {canReview && !alreadyReviewed && (
        <form onSubmit={handleSubmit} className="neo-card p-4 mb-6 bg-pastel-mint/20">
          <p className="font-bold text-sm mb-2">Leave a review</p>
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="focus:outline-none">
                <Star className={`w-5 h-5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you like? (max 500 chars)"
            maxLength={500}
            rows={3}
            className="neo-input w-full mb-2 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length}/500</span>
            <button type="submit" disabled={!text.trim() || submitting} className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black inline-flex items-center gap-2 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="neo-card p-4 animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reviews yet. Be the first after your purchase!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r, idx) => (
            <div key={idx} className="neo-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-black flex items-center justify-center font-black text-xs">
                  {r.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-sm">{r.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{r.relative_time}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-foreground mt-1">{r.text}</p>
            </div>
          ))}
          {reviews.length >= 10 && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="neo-btn neo-btn-secondary px-4 py-2 text-sm font-bold mx-auto block"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
};
