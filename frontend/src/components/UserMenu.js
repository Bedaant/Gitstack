import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Briefcase, LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const UserMenu = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const avatar = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6C5CE7&color=fff&bold=true`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 hover:bg-muted p-1 border-2 border-transparent hover:border-foreground transition-colors"
        data-testid="user-menu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <img src={avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-foreground" />
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-60 bg-background border-4 border-foreground neo-shadow-lg z-50"
          data-testid="user-menu-dropdown"
        >
          <div className="p-3 border-b-2 border-foreground bg-pastel-mint text-black">
            <p className="font-black text-sm truncate">{user.name}</p>
            <p className="text-xs truncate opacity-80">{user.email}</p>
          </div>
          <Link
            to={`/u/me`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 p-3 hover:bg-pastel-lavender hover:text-black font-bold text-sm border-b-2 border-border"
          >
            <UserIcon className="w-4 h-4" /> My Profile
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 p-3 hover:bg-pastel-yellow hover:text-black font-bold text-sm border-b-2 border-border"
          >
            <LayoutDashboard className="w-4 h-4" /> Buyer Dashboard
          </Link>
          <Link
            to="/sell"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 p-3 hover:bg-pastel-green hover:text-black font-bold text-sm border-b-2 border-border"
          >
            <Briefcase className="w-4 h-4" /> Seller Dashboard
          </Link>
          <Link
            to="/marketplace"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 p-3 hover:bg-pastel-pink hover:text-black font-bold text-sm border-b-2 border-border"
          >
            <ShoppingBag className="w-4 h-4" /> Marketplace
          </Link>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2 p-3 hover:bg-red-500 hover:text-white font-bold text-sm text-red-600"
            data-testid="user-menu-logout"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
};
