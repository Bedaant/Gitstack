import React from "react";
import { Link } from "react-router-dom";
import { Download, ShoppingBag, Star, BadgeCheck, Wrench } from "lucide-react";

export const ProductCard = ({ product }) => {
  const price = (product.source_price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <Link to={`/marketplace/${product.product_id}`} className="neo-card block hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all bg-background overflow-hidden">
      <div className="aspect-video bg-muted border-b-4 border-black overflow-hidden">
        {product.screenshots?.[0] ? (
          <img src={product.screenshots[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-muted-foreground" /></div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-black text-foreground line-clamp-1">{product.title}</h3>
          <span className="font-black text-primary whitespace-nowrap">{price}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.tagline}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold flex items-center gap-1">
            {product.seller_name || "Seller"}
            {product.seller_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
          </span>
          <span className="flex items-center gap-2">
            {product.review_count > 0 && (
              <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" /> {product.avg_rating}</span>
            )}
            <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {product.purchase_count}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs font-black bg-foreground text-background px-2 py-0.5 uppercase tracking-wide">{product.category}</span>
          {product.setup_available && <span className="text-xs font-bold bg-pastel-yellow text-black px-2 py-0.5 border border-black flex items-center gap-1"><Wrench className="w-3 h-3" /> SETUP</span>}
        </div>
      </div>
    </Link>
  );
};
