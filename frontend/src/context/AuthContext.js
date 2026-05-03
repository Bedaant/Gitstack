import React, { createContext, useContext, useEffect, useRef } from "react";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../utils/api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { openSignIn, signOut } = useClerk();
  const { getToken, isSignedIn } = useClerkAuth();

  const user = clerkUser ? {
    user_id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    name: clerkUser.fullName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress || "",
    picture: clerkUser.imageUrl || null,
  } : null;

  // Set up axios interceptor to attach Clerk JWT to all API requests
  useEffect(() => {
    const interceptorId = axios.interceptors.request.use(async (config) => {
      // Only attach token to our backend API calls
      if (config.url && config.url.startsWith(API) && isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (e) {
          // Silently fail — request will proceed without auth
        }
      }
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, [getToken, isSignedIn]);

  const welcomedRef = useRef(false);
  useEffect(() => {
    if (isLoaded && clerkUser) {
      const sync = async () => {
        try {
          const token = await getToken();
          await axios.post(`${API}/auth/sync`, {
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            name: clerkUser.fullName || clerkUser.username || "",
            picture: clerkUser.imageUrl || null,
          }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) {
          console.warn("User sync failed:", e);
        }
      };
      sync();
      // Show welcome toast once per mounted session (not on every re-render)
      if (!welcomedRef.current) {
        welcomedRef.current = true;
        const name = clerkUser.firstName || clerkUser.username || "back";
        toast.success(`Welcome, ${name}! 👋`);
      }
    }
  }, [isLoaded, clerkUser, getToken]);

  const login = () => openSignIn();
  const logout = () => signOut();
  const checkAuth = () => {};

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
