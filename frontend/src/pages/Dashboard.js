import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Sparkles, Package, Share2 } from "lucide-react";
import { Header } from "../components/Header";
import { API } from "../utils/api";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }
    
    const fetchStacks = async () => {
      try {
        const res = await axios.get(`${API}/my-stacks`, { withCredentials: true });
        setStacks(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    
    if (user) {
      fetchStacks();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight" data-testid="dashboard-title">
                My Stack
              </h1>
              <p className="text-zinc-500">Your saved tools and generated stacks.</p>
            </div>
            <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3" data-testid="new-stack-btn">
              <Sparkles className="w-5 h-5 mr-2" /> Generate New Stack
            </Link>
          </div>

          {stacks.length === 0 ? (
            <div className="neo-card p-12 text-center bg-pastel-yellow">
              <Package className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
              <h2 className="text-2xl font-bold mb-2">No stacks yet</h2>
              <p className="text-zinc-600 mb-6">Generate your first stack or save tools you discover.</p>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3">
                Generate My First Stack
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {stacks.map(stack => (
                <div key={stack.stack_id} className="neo-card p-6" data-testid={`my-stack-${stack.stack_id}`}>
                  <h3 className="font-bold text-lg mb-2">{stack.name}</h3>
                  <p className="text-sm text-zinc-500 mb-4">{stack.tools.length} tools</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">
                      {stack.is_public ? 'Public' : 'Private'} * {stack.copy_count} copies
                    </span>
                    <button className="neo-btn neo-btn-secondary px-4 py-2 text-sm">
                      <Share2 className="w-4 h-4 mr-1" /> Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
