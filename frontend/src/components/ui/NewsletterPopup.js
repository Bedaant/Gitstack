import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Loader2, Mail } from "lucide-react";
import { API } from "../../utils/api";
import { useLocation } from "react-router-dom";

export const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if already subscribed or closed previously
    if (localStorage.getItem("gitstack_newsletter_closed") || localStorage.getItem("gitstack_subscribed")) {
      return;
    }

    // Trigger on 2nd view of a tool or repo page
    const viewCount = parseInt(localStorage.getItem("gitstack_tool_views") || "0", 10);
    
    if (location.pathname.startsWith('/r/') || location.pathname.startsWith('/tools/')) {
      const newCount = viewCount + 1;
      localStorage.setItem("gitstack_tool_views", newCount.toString());
      
      // If they've viewed 2 or more tools, show popup after 3 seconds
      if (newCount >= 2) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("gitstack_newsletter_closed", "true");
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setSubscribed(true);
      localStorage.setItem("gitstack_subscribed", "true");
      toast.success("Welcome! You'll get 3 new tools next Monday.");
      setTimeout(() => setIsOpen(false), 2000);
    } catch (e) {
      toast.error("Failed to subscribe. Try again.");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="neo-card bg-background max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        
        {subscribed ? (
          <div className="text-center py-4">
            <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-black mb-2">You're on the list!</h3>
            <p className="text-muted-foreground">Keep an eye on your inbox next Monday.</p>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-3xl font-black mb-3">Get 3 open-source tools every Monday</h3>
            <p className="text-muted-foreground mb-6">
              Hand-picked open-source tools that replace expensive SaaS — straight to your inbox every Monday.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@startup.com"
                className="neo-input px-4 py-3 text-center"
                autoFocus
              />
              <button 
                type="submit"
                disabled={loading || !email.trim()}
                className="neo-btn neo-btn-primary px-6 py-3 w-full"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Subscribe'}
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">No spam. One email per week. Unsubscribe anytime.</p>
          </div>
        )}
      </div>
    </div>
  );
};
