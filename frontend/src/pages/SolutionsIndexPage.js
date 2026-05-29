import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Loader2, ArrowRight, Server, Layout } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { API } from "../utils/api";

export default function SolutionsIndexPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/solutions`)
      .then(res => setData(res.data))
      .catch(() => setData({ use_cases: [] }))
      .finally(() => setLoading(false));
  }, []);

  const jsonLd = data?.use_cases ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Open-Source Solutions Directory",
    "itemListElement": data.use_cases.map((uc, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": uc.name,
      "url": `https://gitstack.pro/solutions/${uc.slug}`,
    })),
  } : null;

  return (
    <div className="min-h-screen">
      <SEO
        title="Open Source Complete Solutions Directory"
        description="Browse our directory of complete, ready-to-deploy open-source solutions by use case. Find open-source CRMs, email marketing tools, and more."
        path="/solutions"
        jsonLd={jsonLd}
      />
      <Header />
      <main id="main-content" className="max-w-6xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: "Solutions" }]} />
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pastel-mint border-2 border-border mb-6">
            <Layout className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">
            Open-Source <span className="text-primary">Solutions</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Browse our directory of complete, ready-to-deploy open-source products. Skip the building blocks and find products that just work.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.use_cases.map((uc) => (
              <Link
                key={uc.slug}
                to={`/solutions/${uc.slug}`}
                className="neo-card p-5 hover:bg-muted/50 transition-colors flex flex-col items-start"
              >
                <h3 className="font-bold text-lg capitalize line-clamp-2 leading-tight">{uc.name}</h3>
                <div className="mt-auto pt-4 w-full flex items-center justify-between text-muted-foreground text-sm font-bold">
                  <span>{uc.repo_count} tools</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
