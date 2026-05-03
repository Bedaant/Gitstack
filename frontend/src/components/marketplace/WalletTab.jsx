import React, { useState } from "react";
import axios from "axios";
import { Wallet, ArrowDownToLine, Lock, TrendingUp } from "lucide-react";
import { API } from "../../utils/api";
import { toast } from "sonner";

export const WalletTab = ({ wallet, transactions, onChange }) => {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // BUG-08 FIX: backend stores balance_cents / escrow_cents, not available_balance_cents / escrow_balance_cents.
  const available = wallet?.balance_cents || 0;
  const escrow = wallet?.escrow_cents || 0;
  const total = wallet?.total_earned_cents || 0;

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 1000) { toast.error("Minimum withdrawal is $10"); return; }
    if (cents > available) { toast.error("Amount exceeds available balance"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/marketplace/wallet/withdraw`, { amount_cents: cents }, { withCredentials: true });
      toast.success("Withdrawal requested — processing within 3 business days");
      setShowWithdraw(false);
      setAmount("");
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to request withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="neo-card p-4 bg-pastel-mint/20">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase">Available</span>
          </div>
          <p className="text-2xl font-black">{fmt(available)}</p>
          <button onClick={() => setShowWithdraw(true)} className="mt-2 neo-btn neo-btn-primary px-3 py-1.5 text-xs font-black">Request Withdrawal</button>
        </div>
        <div className="neo-card p-4 bg-pastel-yellow/20">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase">In Escrow</span>
          </div>
          <p className="text-2xl font-black">{fmt(escrow)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Held until buyers confirm setup</p>
        </div>
        <div className="neo-card p-4 bg-pastel-lavender/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase">Total Earned</span>
          </div>
          <p className="text-2xl font-black">{fmt(total)}</p>
        </div>
      </div>

      {showWithdraw && (
        <div className="neo-card p-4">
          <h4 className="font-black uppercase text-sm mb-2">Request Withdrawal</h4>
          <form onSubmit={handleWithdraw} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold block mb-1">Amount ($)</label>
              <input
                type="number"
                min="10"
                max={available / 100}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="neo-input w-full"
                placeholder="10.00"
                required
              />
            </div>
            <button type="submit" disabled={submitting} className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black disabled:opacity-50">
              <ArrowDownToLine className="w-3.5 h-3.5 inline mr-1" /> Submit
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">By submitting, your funds will be processed within 3 business days.</p>
        </div>
      )}

      <div>
        <h4 className="font-black uppercase text-sm mb-2">Transaction History</h4>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-2 border-black neo-shadow-sm">
              <thead className="bg-foreground text-background">
                <tr>
                  <th className="px-3 py-2 text-left font-black text-xs uppercase">Date</th>
                  <th className="px-3 py-2 text-left font-black text-xs uppercase">Type</th>
                  <th className="px-3 py-2 text-left font-black text-xs uppercase">Product</th>
                  <th className="px-3 py-2 text-right font-black text-xs uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-t-2 border-border">
                    <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-bold uppercase text-xs">{t.type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2">{t.product_title || "—"}</td>
                    <td className={`px-3 py-2 text-right font-black ${t.amount_cents > 0 ? "text-primary" : ""}`}>
                      {fmt(t.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
