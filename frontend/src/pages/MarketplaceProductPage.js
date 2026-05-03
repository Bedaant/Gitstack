import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ReviewsSection } from "../components/marketplace/ReviewsSection";
import { useRazorpay } from "../hooks/useRazorpay";
import { useAuth } from "../context/AuthContext";
import { API } from "../utils/api";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Share2, BadgeCheck, Wrench, ShoppingBag,
  Star, ExternalLink, Github, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

export default function MarketplaceProductPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { openCheckout } = useRazorpay();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [hasPurchase, setHasPurchase] = useState(false);
  const [purchaseId, setPurchaseId] = useState(searchParams.get("purchase_id") || null);
  const [purchased, setPurchased] = useState(searchParams.get("purchased") === "1");
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        // BUG-11 FIX: backend returns the product object directly (not wrapped in {product:...}).
        // It also does not return a `purchase` field; hasPurchase is set only from URL params.
        const { data } = await axios.get(`${API}/marketplace/products/${productId}`);
        if (!cancelled) {
          setProduct(data);
          // hasPurchase is derived from URL params (set on payment callback) — keep as-is.
        }
      } catch {
        toast.error("Product not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [productId]);

  const handleBuy = async (purchaseType) => {
    if (!user) { login(); return; }
    setBuying(true);
    try {
      const { data } = await axios.post(`${API}/marketplace/checkout/create-order`, {
        product_id: productId,
        purchase_type: purchaseType,
      }, { withCredentials: true });
      openCheckout({
        orderId: data.order_id,
        amountCents: data.amount_cents,
        keyId: data.razorpay_key_id,
        description: product.title,
        prefill: { name: user.name, email: user.email },
        onSuccess: async (resp) => {
          await axios.post(`${API}/marketplace/checkout/verify-payment`, resp, { withCredentials: true });
          toast.success("Payment successful!");
          navigate(`/marketplace/${productId}?purchased=1&purchase_id=${data.purchase_id}`);
        },
        onDismiss: () => setBuying(false),
      });
    } catch (e) {
      toast.error("Could not start checkout");
      setBuying(false);
    }
  };

  const handleDownload = async () => {
    if (!purchaseId) return;
    try {
      const { data } = await axios.get(`${API}/marketplace/download/${purchaseId}`, { withCredentials: true });
      // BUG-07 FIX: backend returns `download_url`, not `signed_url`.
      window.location.href = data.download_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Download failed");
    }
  };

  const share = () => {
    const url = `https://gitstack.pro/marketplace/${productId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const price = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header /><main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></main><Footer />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase mb-2">Not Found</h1>
          <Link to="/marketplace" className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black">Back to Marketplace</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  const screenshots = product.screenshots || [];
  const videoId = product.demo_video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/)?.[1];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={`${product.title} — GitStack`} description={product.tagline} image={screenshots[0]} />
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <Breadcrumbs items={[
          { label: "Marketplace", href: "/marketplace" },
          ...(product.category ? [{ label: product.category, href: `/marketplace?category=${encodeURIComponent(product.category)}` }] : []),
          { label: product.title },
        ]} />

        {purchased && (
          <div className="neo-card p-4 mb-6 bg-pastel-mint/30 border-primary">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-black uppercase text-sm">Purchase Confirmed</p>
                <p className="text-xs text-muted-foreground">You now own this product.</p>
              </div>
              <button onClick={handleDownload} className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black inline-flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
            {product.setup_available && product.purchase_type === "source_and_setup" && (
              <p className="text-xs text-muted-foreground mt-2">
                Your setup request has been sent to the seller — track it in your <Link to="/dashboard" className="underline font-bold">Dashboard</Link>.
              </p>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {screenshots.length > 0 && (
              <div className="neo-card overflow-hidden border-4 border-black">
                <div className="aspect-video bg-muted relative">
                  <img src={screenshots[imgIdx]} alt={product.title} className="w-full h-full object-cover" />
                  {screenshots.length > 1 && (
                    <>
                      <button onClick={() => setImgIdx((i) => (i - 1 + screenshots.length) % screenshots.length)} className="absolute left-2 top-1/2 -translate-y-1/2 neo-btn neo-btn-secondary p-1">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setImgIdx((i) => (i + 1) % screenshots.length)} className="absolute right-2 top-1/2 -translate-y-1/2 neo-btn neo-btn-secondary p-1">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-2 p-2 overflow-x-auto">
                  {screenshots.map((url, i) => (
                    <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 border-2 flex-shrink-0 ${i === imgIdx ? "border-primary" : "border-transparent"}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {videoId && (
              <div className="neo-card overflow-hidden border-4 border-black">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="Demo video"
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-1">{product.title}</h1>
              <p className="text-muted-foreground mb-4">{product.tagline}</p>
              <div className="prose-gitstack" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(product.description || "", { breaks: true, gfm: true })) }} />
            </div>

            {product.github_repo_url && (() => {
              const m = product.github_repo_url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
              if (!m) return null;
              return (
                <div className="neo-card p-4 bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Github className="w-5 h-5" />
                      <span className="font-bold text-sm">Open in Repo Translator</span>
                    </div>
                    <Link to={`/r/${m[1]}/${m[2]}`} className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Explain with AI
                    </Link>
                  </div>
                </div>
              );
            })()}

            <ReviewsSection
              productId={productId}
              canReview={hasPurchase}
              avgRating={product.avg_rating}
              reviewCount={product.review_count}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="neo-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase bg-foreground text-background px-2 py-0.5">{product.category}</span>
                  {product.seller_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                </div>
                <div className="mb-4">
                  <p className="text-3xl font-black">{price(product.source_price_cents)}</p>
                  <p className="text-xs text-muted-foreground">One-time purchase</p>
                </div>

                {product.setup_available && (
                  <div className="neo-card p-3 mb-4 bg-pastel-yellow/20 border-primary">
                    <div className="flex items-center gap-1 mb-1">
                      <Wrench className="w-3.5 h-3.5" />
                      <span className="text-xs font-black uppercase">Setup Service</span>
                    </div>
                    <p className="text-lg font-black">{price(product.setup_price_cents)}</p>
                    <p className="text-[10px] text-muted-foreground">{product.setup_delivery_days || 3} day delivery</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{product.setup_description}</p>
                  </div>
                )}

                {!user ? (
                  <button onClick={login} className="neo-btn neo-btn-primary px-4 py-2 w-full font-black text-sm">
                    Login to Buy
                  </button>
                ) : (
                  <div className="space-y-2">
                    {hasPurchase ? (
                      <button onClick={handleDownload} className="neo-btn neo-btn-primary px-4 py-2 w-full font-black text-sm inline-flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleBuy("source")} disabled={buying} className="neo-btn neo-btn-primary px-4 py-2 w-full font-black text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
                          <ShoppingBag className="w-4 h-4" />
                          {buying ? "Processing..." : `Buy Source — ${price(product.source_price_cents)}`}
                        </button>
                        {product.setup_available && (
                          <button onClick={() => handleBuy("source_and_setup")} disabled={buying} className="neo-btn neo-btn-secondary px-4 py-2 w-full font-black text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
                            <Wrench className="w-4 h-4" />
                            {buying ? "Processing..." : `Buy + Setup — ${price(product.source_price_cents + product.setup_price_cents)}`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                <button onClick={share} className="mt-3 text-xs font-bold text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>

              <div className="neo-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-muted border-2 border-black flex items-center justify-center font-black text-sm">
                    {product.seller_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <Link to={`/u/${product.seller_user_id}`} className="font-bold text-sm hover:text-primary inline-flex items-center gap-1">
                      {product.seller_name}
                      {product.seller_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
                    </Link>
                    <p className="text-xs text-muted-foreground">{product.seller_bio || "Indie builder on GitStack"}</p>
                  </div>
                </div>
              </div>

              <div className="neo-card p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {product.purchase_count} sold</span>
                {product.review_count > 0 && (
                  <span className="font-bold text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3 fill-primary" /> {product.avg_rating} ({product.review_count})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
