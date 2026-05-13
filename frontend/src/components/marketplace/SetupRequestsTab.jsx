import React, { useState, useEffect } from "react";
import axios from "axios";
import { Mail, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { API } from "../../utils/api";
import { toast } from "sonner";

export const SetupRequestsTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const { data } = await axios.get(`${API}/marketplace/setup-requests`, { withCredentials: true });
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const updateStatus = async (id, status, note = "") => {
    try {
      await axios.patch(`${API}/marketplace/setup-requests/${id}/status`, { status, note }, { withCredentials: true });
      toast.success(`Marked ${status}`);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    }
  };

  const groups = {
    pending: requests.filter((r) => r.status === "pending"),
    in_progress: requests.filter((r) => r.status === "in_progress"),
    completed: requests.filter((r) => r.status === "completed"),
  };

  const StatusBadge = ({ status }) => {
    const map = {
      pending: <span className="text-[10px] font-black uppercase bg-pastel-yellow px-1.5 py-0.5 border-2 border-black inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>,
      in_progress: <span className="text-[10px] font-black uppercase bg-pastel-lavender px-1.5 py-0.5 border-2 border-black inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> In Progress</span>,
      completed: <span className="text-[10px] font-black uppercase bg-pastel-mint px-1.5 py-0.5 border-2 border-black inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>,
    };
    return map[status] || status;
  };

  if (loading) return <div className="neo-card p-8 text-center text-muted-foreground">Loading...</div>;

  if (requests.length === 0) return (
    <div className="neo-card p-8 text-center">
      <p className="text-muted-foreground">No setup requests yet.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {["pending", "in_progress", "completed"].map((group) => (
        groups[group].length > 0 && (
          <div key={group}>
            <h4 className="font-black uppercase text-sm mb-2">{group.replace("_", " ")} ({groups[group].length})</h4>
            <div className="space-y-3">
              {groups[group].map((r) => (
                <div key={r.request_id} className="neo-card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={r.status} />
                        <span className="text-sm font-black">{r.product_title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Buyer: {r.buyer?.name || "Unknown"} · {r.buyer?.email || "No email"}</p>
                      {r.auto_release_at && (
                        <p className="text-xs text-primary font-bold mt-1">Auto-releases {r.auto_release_at}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`mailto:${r.buyer?.email || ""}`} className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email Buyer
                      </a>
                      {r.status === "pending" && (
                        <button onClick={() => updateStatus(r.request_id, "in_progress")} className="neo-btn neo-btn-primary px-3 py-1.5 text-xs font-bold">
                          Mark In Progress
                        </button>
                      )}
                      {r.status === "in_progress" && (
                        <button onClick={() => {
                          const note = window.prompt("Optional completion note:") || "";
                          updateStatus(r.request_id, "completed", note);
                        }} className="neo-btn neo-btn-primary px-3 py-1.5 text-xs font-bold">
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
};
