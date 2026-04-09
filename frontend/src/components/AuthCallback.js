import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { API } from "../utils/api";

export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const hasProcessed = React.useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionId = new URLSearchParams(hash.replace('#', '?')).get('session_id');
      
      if (sessionId) {
        try {
          await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
          await checkAuth();
          toast.success("Logged in successfully!");
          navigate('/dashboard', { replace: true });
        } catch (e) {
          console.error("Auth error:", e);
          toast.error("Login failed");
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    };

    processAuth();
  }, [location, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="font-bold">Logging you in...</p>
      </div>
    </div>
  );
};
