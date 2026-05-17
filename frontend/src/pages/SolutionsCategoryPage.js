import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Loader2, Star, ExternalLink, Container, Monitor, Shield, ArrowRight, Server, PlayCircle } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { API } from "../utils/api";

function HealthBar({ score }) {
  if (score === undefined || score === null) return null;
  const percentage = Math.min(Math.max(score, 0), 100);
  const color = percentage > 70 ? 'bg-green-500' : percentage > 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2" title={`Health Score: ${percentage}%`}>
      <div className="w-16 h-1.5 bg-muted overflow-hidden flex">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground">{percentage}%</span>
    </div>
  );
}

export default function SolutionsCategoryPage() {
  const { category } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/solutions/${category}`)
      .then(res => setData(res.data))
      .catch(() => setData({ use_case: category, repos: [] }))
      .finally(() => setLoading(false));
  }, [category]);

  const useCaseName = data?.use_case || category?.replace(/-/g, " ");
  const title = `Top Open-Source ${useCaseName} Tools — Ready to Deploy`;
  const description = `Find the best open-source complete solutions for ${useCaseName}. Ready-to-deploy products with Docker support, high health scores, and community validation.`;

  const jsonLd = data?.repos ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Open-Source ${useCaseName} Tools`,
    "itemListElement": data.repos.map((sol, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "SoftwareApplication",
        "name": sol.name || sol.full_name?.split('/')[1],
        "description": sol.description,
        "applicationCategory": useCaseName,
        "operatingSystem": "Linux, macOS, Windows",
        "softwareVersion": "latest",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": Math.min((sol.stars || 0) / 100, 5).toFixed(1),
          "ratingCount": sol.stars || 0,
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
        "url": sol.html_url || `https://github.com/${sol.full_name}`,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen">
      <SEO
        title={title}
        description={description}
        path={`/solutions/${category}`}
        jsonLd={jsonLd}
      />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { label: "Solutions", href: "/solutions" },
          { label: useCaseName || "…" },
        ]} />
        
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-block bg-primary text-primary-foreground px-3 py-1 text-xs font-black uppercase mb-3">
            Open-Source Products
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4 capitalize">
            {useCaseName} Tools
          </h1>
          <p className="text-lg text-muted-foreground">
            Complete, ready-to-deploy open-source {useCaseName} solutions. Avoid building from scratch and start using these fully-featured products today.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.repos?.map((sol, i) => (
              <div key={i} className="neo-card flex flex-col p-5 bg-card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg leading-tight truncate max-w-[280px]">
                      {sol.name || sol.full_name?.split('/')[1]}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{sol.full_name}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center text-sm font-bold bg-muted px-2 py-0.5 mb-1">
                      <Star className="w-3.5 h-3.5 mr-1 text-yellow-500 fill-current" />
                      {typeof sol.stars === 'number' ? sol.stars.toLocaleString() : sol.stars}
                    </div>
                    {sol.health_score !== undefined && <HealthBar score={sol.health_score} />}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {sol.description || "No description provided."}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {sol.has_docker && <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold uppercase"><Container className="w-3 h-3 mr-1" /> Docker</span>}
                  {sol.has_ui && <span className="inline-flex items-center bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase"><Monitor className="w-3 h-3 mr-1" /> UI</span>}
                  {sol.license && <span className="inline-flex items-center bg-gray-50 text-gray-700 px-2 py-0.5 text-[10px] font-bold uppercase"><Shield className="w-3 h-3 mr-1" /> {sol.license}</span>}
                </div>

                {sol.marketplace_setup && (
                  <div className="bg-green-50 p-3 mb-4 border border-green-200">
                    <p className="text-xs font-bold text-green-800 mb-1 flex items-center">
                      <PlayCircle className="w-3 h-3 mr-1" /> Managed Setup Available
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700">By {sol.marketplace_setup.seller_name}</span>
                      <Link to={`/marketplace/p/${sol.marketplace_setup.product_id}`} className="text-xs font-bold bg-green-600 text-white px-2 py-1 hover:bg-green-700 transition-colors">
                        Get for ${sol.marketplace_setup.price}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-border flex items-center gap-2">
                  <Link
                    to={`/repo-translator?url=${encodeURIComponent('https://github.com/' + (sol.full_name || sol.name))}&auto=true`}
                    className="neo-btn neo-btn-primary px-3 py-1.5 text-xs font-black flex items-center flex-1 justify-center"
                  >
                    Translate <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                  <a
                    href={sol.html_url || `https://github.com/${sol.full_name}`}
                    target="_blank" rel="noopener noreferrer"
                    className="neo-btn px-3 py-1.5 text-xs font-black flex items-center"
                  >
                    GitHub <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.repos?.length === 0 && !loading && (
          <div className="text-center py-20 bg-muted/30 neo-card">
            <h3 className="text-xl font-bold mb-2">No solutions found</h3>
            <p className="text-muted-foreground mb-6">We haven't indexed any complete solutions for this category yet.</p>
            <Link to="/solution-finder" className="neo-btn neo-btn-primary px-6 py-2">
              Use AI Solution Finder Instead
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
