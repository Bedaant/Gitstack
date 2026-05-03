import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Package, Share2, Trash2, BookmarkCheck, ShoppingBag, Download, Wrench, Clock, CheckCircle, Star, Send, Loader2, Briefcase, ArrowRight } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { getLocalStacks, deleteLocalStack } from "../utils/localStacks";
import { RecommendationsSection } from "../components/sections/RecommendationsSection";
import { API } from "../utils/api";

export default function Dashboard() {
  const [stacks, setStacks] = useState([]);
  const [tab, setTab] = useState("stacks");
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  useEffect(() => {
    setStacks(getLocalStacks());
  }, []);

  useEffect(() => {
    if (tab !== "purchases") return;
    setPurchasesLoading(true);
    axios.get(`${API}/marketplace/my-purchases`, { withCredentials: true })
      .then(({ data }) => setPurchases(data.purchases || []))
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false));
  }, [tab]);

  const handleDelete = (stackId, stackName) => {
    deleteLocalStack(stackId);
    setStacks(getLocalStacks());
    toast.success(`"${stackName.slice(0, 40)}" removed.`);
  };

  const handleShare = (stack) => {
    const text = `My stack for "${stack.name}":\n${stack.tools.map((t, i) => `${i + 1}. ${t.name} — ${t.description}`).join('\n')}\n\nBuilt with GitStack: ${window.location.origin}/stack-generator`;
    if (navigator.share) {
      navigator.share({ title: `My Stack: ${stack.name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Stack copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <RecommendationsSection />
      <main className="py-12 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-black uppercase tracking-tight" data-testid="dashboard-title">Dashboard</h1>
            <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3" data-testid="new-stack-btn">
              <Sparkles className="w-5 h-5 mr-2" /> Generate New Stack
            </Link>
          </div>
          <div className="flex gap-2 mb-6 border-b-4 border-border pb-2">
            <button onClick={() => setTab("stacks")} className={`px-3 py-2 text-sm font-black uppercase border-2 border-black flex items-center gap-1.5 ${tab === "stacks" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}>
              <BookmarkCheck className="w-4 h-4" /> My Stacks
            </button>
            <button onClick={() => setTab("purchases")} className={`px-3 py-2 text-sm font-black uppercase border-2 border-black flex items-center gap-1.5 ${tab === "purchases" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}>
              <ShoppingBag className="w-4 h-4" /> My Purchases
            </button>
          </div>

          {tab === "stacks" && (
          <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">My Stacks</h2>
              <p className="text-muted-foreground mt-1">Your saved stacks — stored locally in this browser.</p>
            </div>
          </div>

          {stacks.length === 0 ? (
            <div className="neo-card p-12 text-center bg-pastel-yellow text-black">
              <Package className="w-16 h-16 mx-auto mb-4 text-foreground/50" />
              <h2 className="text-2xl font-bold mb-2">No stacks saved yet</h2>
              <p className="text-foreground/70 mb-6">Generate a stack and hit "Save Stack" to keep it here.</p>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3">
                Generate My First Stack
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {stacks.map(stack => (
                <div key={stack.stack_id} className="neo-card p-6 bg-background" data-testid={`my-stack-${stack.stack_id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-lg leading-tight line-clamp-2">{stack.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {new Date(stack.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <BookmarkCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {stack.tools.slice(0, 4).map(t => (
                      <span key={t.name} className="text-xs font-mono bg-muted border border-border px-2 py-0.5">
                        {t.name}
                      </span>
                    ))}
                    {stack.tools.length > 4 && (
                      <span className="text-xs font-mono text-muted-foreground px-1">+{stack.tools.length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Link
                      to={`/stack-generator?idea=${encodeURIComponent(stack.idea)}`}
                      className="neo-btn neo-btn-primary px-4 py-2 text-sm flex-1 justify-center"
                    >
                      <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                    </Link>
                    <button
                      onClick={() => handleShare(stack)}
                      className="neo-btn neo-btn-secondary px-3 py-2 text-sm"
                      data-testid={`share-stack-${stack.stack_id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(stack.stack_id, stack.name)}
                      className="neo-btn px-3 py-2 text-sm border-red-300 text-red-500 hover:bg-red-50"
                      data-testid={`delete-stack-${stack.stack_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}

          {tab === "purchases" && (
            <PurchasesPanel purchases={purchases} loading={purchasesLoading} />
          )}

          {/* Cross-link to Seller Dashboard — bridges the split experience */}
          <div className="neo-card mt-10 p-6 bg-pastel-purple flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-2 border-black flex-shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black uppercase text-lg">Ship something? Sell it on GitStack.</h3>
                <p className="text-sm opacity-80 mt-1">List your indie SaaS, MCP server, template, or skill. 15% fee, payouts via UPI/PayPal/Bank.</p>
              </div>
            </div>
            <Link to="/sell" className="neo-btn neo-btn-primary px-5 py-3 font-black flex items-center gap-2 flex-shrink-0" data-testid="dashboard-become-seller">
              Become a Seller <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PurchasesPanel({ purchases, loading }) {
  const handleDownload = async (purchaseId) => {
    try {
      const { data } = await axios.get(`${API}/marketplace/download/${purchaseId}`, { withCredentials: true });
      // BUG-07 FIX: backend returns `download_url`, not `signed_url`.
      window.location.href = data.download_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Download failed");
    }
  };

  const confirmSetup = async (requestId) => {
    try {
      await axios.post(`${API}/marketplace/setup-requests/${requestId}/confirm`, {}, { withCredentials: true });
      toast.success("Setup marked as received!");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to confirm");
    }
  };

  const StatusBadge = (status) => {
    const map = {
      pending: <span className="text-[10px] font-black uppercase bg-pastel-yellow px-1.5 py-0.5 border-2 border-black inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>,
      in_progress: <span className="text-[10px] font-black uppercase bg-pastel-lavender px-1.5 py-0.5 border-2 border-black inline-flex items-center gap-1"><Wrench className="w-3 h-3" /> In Progress</span>,
      completed: <span className="text-[10px] font-black uppercase bg-pastel-mint px-1.5 py-0.5 border-2 border-black inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>,
    };
    return map[status] || status;
  };

  if (loading) return <div className="neo-card p-8 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin inline mr-2" /> Loading...</div>;

  if (purchases.length === 0) return (
    <div className="neo-card p-10 text-center">
      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <h2 className="text-2xl font-black uppercase mb-2">No purchases yet</h2>
      <p className="text-muted-foreground mb-4">Browse the marketplace to find indie tools.</p>
      <Link to="/marketplace" className="neo-btn neo-btn-primary px-4 py-2 font-black">Browse Marketplace</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black uppercase tracking-tight mb-4">My Purchases</h2>
      {purchases.map((p) => (
        <div key={p.purchase_id} className="neo-card p-4 flex flex-col sm:flex-row gap-4">
          {/* BUG-09 FIX: screenshots are nested under p.product */}
          <div className="w-full sm:w-32 h-24 bg-muted border-2 border-black flex-shrink-0">
            {p.product?.screenshots?.[0] ? (
              <img src={p.product.screenshots[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-muted-foreground" /></div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {/* BUG-09 FIX: product info is nested under p.product (from my-purchases join) */}
              <h3 className="font-black text-sm">{p.product?.title}</h3>
              <span className="text-[10px] font-black uppercase bg-foreground text-background px-1.5 py-0.5">{p.purchase_type?.replace("_", " ")}</span>
              {p.setup_request && StatusBadge(p.setup_request.status)}
            </div>
            {/* BUG-09 FIX: field is created_at (not purchased_at) and amount_cents (not price_paid_cents) */}
            <p className="text-xs text-muted-foreground mb-2">{new Date(p.created_at).toLocaleDateString()} · {(p.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => handleDownload(p.purchase_id)} className="neo-btn neo-btn-primary px-3 py-1.5 text-xs font-black inline-flex items-center gap-1">
                <Download className="w-3 h-3" /> Download
              </button>
              {/* BUG-10 FIX: setup_request uses `request_id`, not `id` */}
              {p.setup_request?.status === "completed" && !p.setup_request?.buyer_confirmed && (
                <button onClick={() => confirmSetup(p.setup_request.request_id)} className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs font-black inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Mark as Received
                </button>
              )}
              {p.setup_request?.auto_release_at && !p.setup_request?.buyer_confirmed && (
                <span className="text-[10px] text-muted-foreground">Auto-releases {new Date(p.setup_request.auto_release_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
