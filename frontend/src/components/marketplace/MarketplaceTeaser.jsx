import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ShoppingBag, Wrench, BadgeCheck } from "lucide-react";
import { API } from "../../utils/api";

export const MarketplaceTeaser = ({ owner, repo, toolId, variant = "banner", fallback = null }) => {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const url = toolId
          ? `${API}/marketplace/products/by-tool/${toolId}`
          : `${API}/marketplace/products/by-repo?owner=${owner}&repo=${repo}`;
        const res = await axios.get(url);
        if (!cancelled) setProducts(res.data.products || []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    };
    if ((owner && repo) || toolId) fetch();
    return () => { cancelled = true; };
  }, [owner, repo, toolId]);

  if (products === null) return null;
  if (products.length === 0) return fallback;

  const first = products[0];
  const price = (first.source_price_cents / 100).toLocaleString("en-IN", { style: "currency", currency: first.currency || "INR" });

  if (variant === "inline") {
    return (
      <Link to={`/marketplace/${first.product_id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary border-2 border-primary px-2 py-1 hover:bg-primary hover:text-white transition-colors">
        <ShoppingBag className="w-3.5 h-3.5" /> Buy ready-to-deploy version — {price}
      </Link>
    );
  }

  return (
    <div className="neo-card p-4 mb-6 bg-pastel-yellow/20 border-primary">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div>
            <p className="font-black text-sm uppercase tracking-wide">Available on the Marketplace</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{first.title}</span>
              {first.setup_available && <> · <Wrench className="w-3 h-3 inline" /> Setup service available</>}
              {" by "}<span className="font-bold">{first.seller_name}</span>
              {first.seller_verified && <BadgeCheck className="w-3.5 h-3.5 inline ml-0.5 text-primary" />}
            </p>
          </div>
        </div>
        <Link to={`/marketplace/${first.product_id}`} className="neo-btn neo-btn-primary px-4 py-2 font-black">
          Buy — {price}
        </Link>
      </div>
      {products.length > 1 && (
        <Link to={`/marketplace?q=${repo || ""}`} className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
          and {products.length - 1} more listing{products.length > 2 ? "s" : ""} →
        </Link>
      )}
    </div>
  );
};
