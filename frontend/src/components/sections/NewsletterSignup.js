import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { API } from "../../utils/api";

export const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get(`${API}/newsletter/count`);
        setSubscriberCount(res.data.count || 0);
      } catch (err) {
        console.error("Failed to fetch subscriber count:", err);
      }
    };
    fetchCount();
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setSubscribed(true);
      toast.success("You're in! First 3 tools arrive next Monday.");
    } catch (e) {
      toast.error("Failed to subscribe. Try again.");
    }
    setLoading(false);
  };

  if (subscribed) {
    return (
      <section className="py-12 px-4 bg-foreground text-background border-y-4 border-primary">
        <div className="max-w-3xl mx-auto text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h2 className="text-3xl font-black mb-2">You're In!</h2>
          <p className="text-background/70">Get ready for your daily dose of open-source goodness.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 bg-foreground text-background border-y-4 border-primary">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-black mb-2">Get 3 open-source tools every Monday</h2>
        <p className="text-background/70 mb-6">
          3 curated open-source tools that replace expensive SaaS. Sent every Monday.
          {subscriberCount > 0 && <span className="text-primary ml-2">Join {subscriberCount}+ founders</span>}
        </p>
        
        <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-3 border-4 border-background bg-transparent text-background placeholder-background/50 font-semibold focus:border-primary outline-none"
            data-testid="newsletter-email"
          />
          <button 
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-primary px-6 py-3 border-4 border-background"
            data-testid="newsletter-submit"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
          </button>
        </form>
      </div>
    </section>
  );
};
