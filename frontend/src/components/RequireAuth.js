import React, { useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export const RequireAuth = ({ children }) => {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !promptedRef.current) {
      promptedRef.current = true;
      toast.info("Sign in to continue");
      login();
    }
  }, [loading, user, login]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Render a gentle "locked" state instead of silent redirect.
    // The sign-in modal already opened via the effect above.
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="neo-card p-8 max-w-md w-full text-center">
          <Lock className="w-10 h-10 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-black uppercase mb-2">Sign in required</h1>
          <p className="text-sm text-muted-foreground mb-5">
            This page needs an account. We just opened the sign-in box for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={login}
              className="neo-btn neo-btn-primary px-5 py-2.5 font-black flex-1"
            >
              Sign in
            </button>
            <Link
              to="/"
              state={{ from: location }}
              className="neo-btn px-5 py-2.5 font-black flex-1 text-center border-2 border-foreground"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
