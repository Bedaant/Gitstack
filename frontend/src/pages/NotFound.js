import React from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Browse 600+ open-source tools or generate a custom tech stack."
        noindex={true}
      />
      <Header />
      <main id="main-content" className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-8xl font-black mb-4">404</h1>
          <p className="text-2xl font-bold mb-2">Page not found</p>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/" className="neo-btn neo-btn-primary px-8 py-3">
              Go Home
            </Link>
            <Link to="/tools" className="neo-btn neo-btn-secondary px-8 py-3">
              Browse Tools
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
