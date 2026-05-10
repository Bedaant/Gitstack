import React, { useEffect, useState } from "react";
import axios from "axios";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { MyListingsTab } from "../components/marketplace/MyListingsTab";
import { SetupRequestsTab } from "../components/marketplace/SetupRequestsTab";
import { WalletTab } from "../components/marketplace/WalletTab";
import { CreateProductWizard } from "../components/marketplace/CreateProductWizard";
import { API } from "../utils/api";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { toast } from "sonner";
import { Loader2, TrendingUp, Package, Wrench, Wallet as WalletIcon } from "lucide-react";

const OnboardingCard = ({ onDone }) => {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [availableForHire, setAvailableForHire] = useState(false);
  const [hireContact, setHireContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid = () => {
    if (!displayName.trim() || !bio.trim()) return false;
    if (payoutMethod === "upi") return /^[\w.\-]+@[\w]+$/.test(upiId);
    if (payoutMethod === "bank") return accountHolder.trim() && accountNumber.trim() && ifsc.trim();
    if (payoutMethod === "paypal") return /.+@.+/.test(paypalEmail);
    return false;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    try {
      const payload = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        payout_method: payoutMethod,
        payout_details: payoutMethod === "upi" ? { upi_id: upiId } : payoutMethod === "bank" ? { account_holder_name: accountHolder, account_number: accountNumber, ifsc } : { paypal_email: paypalEmail },
        available_for_hire: availableForHire,
        hire_contact: availableForHire ? hireContact.trim() : null,
      };
      await axios.post(`${API}/marketplace/seller/onboard`, payload, { withCredentials: true });
      toast.success("Seller onboarding complete!");
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Onboarding failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="neo-card p-6">
        <h2 className="text-2xl font-black uppercase mb-1">Become a Seller</h2>
        <p className="text-sm text-muted-foreground mb-5">Set up your seller profile to start listing products.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1">Display Name *</label>
            <input className="neo-input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How buyers will see you" required />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">Bio *</label>
            <textarea className="neo-input w-full resize-none" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you build?" required />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">Payout Method</label>
            <div className="flex gap-2 mb-2">
              {["upi", "bank", "paypal"].map((m) => (
                <button key={m} type="button" onClick={() => setPayoutMethod(m)} className={`neo-btn text-xs font-black px-3 py-1.5 ${payoutMethod === m ? "neo-btn-primary" : "neo-btn-secondary"}`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            {payoutMethod === "upi" && (
              <input className="neo-input w-full" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" required />
            )}
            {payoutMethod === "bank" && (
              <div className="space-y-2">
                <input className="neo-input w-full" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Account Holder Name" required />
                <input className="neo-input w-full" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" required />
                <input className="neo-input w-full" value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="IFSC Code" required />
              </div>
            )}
            {payoutMethod === "paypal" && (
              <input className="neo-input w-full" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="PayPal Email" required />
            )}
          </div>
          <div className="neo-card p-3 bg-muted/20">
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={availableForHire} onChange={(e) => setAvailableForHire(e.target.checked)} className="w-4 h-4" />
              Available for hire
            </label>
            {availableForHire && (
              <div className="mt-2">
                <input className="neo-input w-full" value={hireContact} onChange={(e) => setHireContact(e.target.value)} placeholder="Email or Calendly URL" />
              </div>
            )}
          </div>
          <button type="submit" disabled={!isValid() || submitting} className="neo-btn neo-btn-primary px-6 py-2 font-black w-full disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null} Complete Onboarding
          </button>
        </form>
      </div>
    </div>
  );
};

export default function SellPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("listings");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const fetchDashboard = async () => {
    try {
      const { data: d } = await axios.get(`${API}/marketplace/seller/dashboard`, { withCredentials: true });
      setData(d);
    } catch {
      setData({ onboarded: false, products: [], wallet: null, transactions: [], setup_requests: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></main>
      <Footer />
    </div>
  );

  if (!data?.onboarded) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Sell on GitStack" description="List your indie dev tools on GitStack marketplace." />
        <Header />
        <main className="flex-1 py-10 px-4"><OnboardingCard onDone={fetchDashboard} /></main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Seller Dashboard — GitStack" description="Manage your listings, setup jobs, and earnings." />
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 py-10 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-black uppercase">Seller Dashboard</h1>
          <button onClick={() => { setEditProduct(null); setWizardOpen(true); }} className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black">+ New Product</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="neo-card p-3 bg-pastel-mint/20">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Wallet</p>
            {/* BUG-08 FIX: backend uses balance_cents, not available_balance_cents */}
            <p className="text-lg font-black">{((data.wallet?.balance_cents || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
          </div>
          <div className="neo-card p-3 bg-pastel-lavender/20">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Escrow</p>
            {/* BUG-08 FIX: backend uses escrow_cents, not escrow_balance_cents */}
            <p className="text-lg font-black">{((data.wallet?.escrow_cents || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
          </div>
          <div className="neo-card p-3 bg-pastel-yellow/20">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Listings</p>
            <p className="text-lg font-black">{data.products?.length || 0}</p>
          </div>
          <div className="neo-card p-3 bg-pastel-pink/20">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Pending Setups</p>
            <p className="text-lg font-black">{data.setup_requests?.filter((r) => r.status !== "completed").length || 0}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b-4 border-border pb-2">
          {[
            { id: "listings", label: "My Listings", icon: Package },
            { id: "setups", label: "Setup Requests", icon: Wrench },
            { id: "wallet", label: "Wallet", icon: WalletIcon },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-black uppercase border-2 border-black flex items-center gap-1.5 transition-colors ${
                tab === t.id ? "bg-foreground text-background" : "bg-background hover:bg-muted"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "listings" && (
          <MyListingsTab
            products={data.products || []}
            onChange={fetchDashboard}
          />
        )}
        {tab === "setups" && <SetupRequestsTab />}
        {tab === "wallet" && (
          <WalletTab
            wallet={data.wallet}
            transactions={data.transactions || []}
            onChange={fetchDashboard}
          />
        )}

        {wizardOpen && (
          <CreateProductWizard
            mode={editProduct ? "edit" : "create"}
            initialProduct={editProduct}
            onClose={() => setWizardOpen(false)}
            onSave={fetchDashboard}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
