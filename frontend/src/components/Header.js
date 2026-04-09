import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, LogOut } from "lucide-react";

export const Header = () => {
  const { user, login, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b-4 border-black py-4">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="GitStack" className="w-10 h-10" />
          <span className="text-2xl font-extrabold tracking-tight">GitStack</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/collections" className="font-semibold hover:text-primary transition-colors" data-testid="nav-collections">Collections</Link>
          <Link to="/tools" className="font-semibold hover:text-primary transition-colors" data-testid="nav-tools">Tools</Link>
          {user && (
            <Link to="/dashboard" className="font-semibold hover:text-primary transition-colors" data-testid="nav-dashboard">My Stack</Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-medium text-sm">{user.name}</span>
              <button onClick={logout} className="neo-btn neo-btn-secondary px-4 py-2 text-sm" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </button>
            </div>
          ) : (
            <button onClick={login} className="neo-btn neo-btn-primary px-6 py-2" data-testid="login-btn">
              Sign in with Google
            </button>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4">
          <nav className="flex flex-col gap-4">
            <Link to="/collections" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Collections</Link>
            <Link to="/tools" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Tools</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>My Stack</Link>
                <button onClick={logout} className="neo-btn neo-btn-secondary px-4 py-2 w-full mt-2">Logout</button>
              </>
            ) : (
              <button onClick={login} className="neo-btn neo-btn-primary px-4 py-2 w-full mt-2">Sign in with Google</button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
