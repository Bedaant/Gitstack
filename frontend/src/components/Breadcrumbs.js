import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/**
 * Breadcrumb navigation for deep pages.
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { label: "Tools", href: "/tools" },
 *     { label: "Notion Alternatives" },  // last item has no href (current page)
 *   ]} />
 */
export const Breadcrumbs = ({ items = [] }) => {
  const all = [{ label: "Home", href: "/", icon: Home }, ...items];

  // Emit JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": all.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.label,
      ...(item.href ? { "item": `https://gitstack.pro${item.href}` } : {}),
    })),
  };

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex-wrap"
      >
        {all.map((item, i) => {
          const isLast = i === all.length - 1;
          const Icon = item.icon;
          return (
            <React.Fragment key={i}>
              {isLast || !item.href ? (
                <span className="text-foreground flex items-center gap-1">
                  {Icon && <Icon className="w-3 h-3" />}
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="hover:text-primary transition-colors flex items-center gap-1">
                  {Icon && <Icon className="w-3 h-3" />}
                  {item.label}
                </Link>
              )}
              {!isLast && <ChevronRight className="w-3 h-3 opacity-50" />}
            </React.Fragment>
          );
        })}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
};

export default Breadcrumbs;
