import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Star, Clock, CheckCircle2, Github, BookOpen, Scale, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { API } from "../utils/api";
import { saveStackLocally, isStackSaved } from "../utils/localStacks";
import { useAuth } from "../context/AuthContext";
import { GitHubLink } from "../components/ui/GitHubLink";
import { RelatedTools } from "../components/RelatedTools";
import { Helmet } from "react-helmet-async";

export default function ToolDetailPage() {
  const { toolId } = useParams();
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedToStack, setAddedToStack] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTool = async () => {
      try {
        const res = await axios.get(`${API}/tools/${toolId}`);
        setTool(res.data);
        setAddedToStack(isStackSaved(res.data.name));
      } catch (e) {
        toast.error("Failed to load tool. Please try again.");
        console.error(e);
      }
      setLoading(false);
    };
    fetchTool();
  }, [toolId]);

  // Track activity for recommendations (fire and forget)
  useEffect(() => {
    if (!user || !toolId) return;
    axios.post(`${API}/activity`, { event_type: "tool_viewed", entity_id: toolId }, { withCredentials: true }).catch(() => {});
  }, [user, toolId]);

  const handleAddToStack = () => {
    if (!tool || addedToStack) return;
    saveStackLocally(tool.name, [{
      name: tool.name,
      description: tool.description,
      difficulty: tool.difficulty,
      setupTime: tool.setup_time,
      githubUrl: tool.github_url,
      setupSteps: tool.setup_steps || [],
    }]);
    setAddedToStack(true);
    toast.success(`${tool.name} saved to My Stacks!`, {
      action: { label: "View", onClick: () => window.location.href = '/dashboard' },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold">Tool not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={`${tool.name} — ${tool.category} Tool`}
        description={tool.description?.slice(0, 160) || `${tool.name} open source tool for ${tool.category || "development"}. Free, self-hosted alternative.`}
        path={`/tools/${toolId}`}
        ogType="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                "name": tool.name,
                "applicationCategory": tool.category ? `${tool.category}Application` : "DeveloperApplication",
                "operatingSystem": "Web / Self-Hosted",
                "url": `https://gitstack.pro/tools/${toolId}`,
                "description": tool.description,
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                "aggregateRating": tool.stars ? {
                  "@type": "AggregateRating",
                  "ratingValue": Math.min(tool.stars / 1000, 5).toFixed(1),
                  "ratingCount": Math.floor(tool.stars / 100),
                  "bestRating": "5"
                } : undefined,
                "isRelatedTo": tool.paid_alternative ? {
                  "@type": "SoftwareApplication",
                  "name": tool.paid_alternative
                } : undefined,
                "featureList": tool.what_you_can_build?.join(", ") || undefined
              },
              {
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": `What is ${tool.name} used for?`,
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": tool.description || `${tool.name} is an open-source ${tool.category || "developer"} tool.`
                    }
                  },
                  {
                    "@type": "Question",
                    "name": `Is ${tool.name} free and open source?`,
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": `${tool.name} is an open-source tool available for free self-hosting. It can replace ${tool.paid_alternative || "paid SaaS alternatives"} without monthly subscription costs.`
                    }
                  },
                  {
                    "@type": "Question",
                    "name": `How hard is it to set up ${tool.name}?`,
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": tool.difficulty ? `${tool.name} is rated ${tool.difficulty} difficulty${tool.setup_time ? ` and takes approximately ${tool.setup_time}` : ""}. GitStack provides step-by-step setup guides in plain English.` : `${tool.name} has a setup guide with step-by-step instructions available on GitStack.`
                    }
                  },
                  ...(tool.paid_alternative ? [{
                    "@type": "Question",
                    "name": `What is the best free alternative to ${tool.paid_alternative}?`,
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": `${tool.name} is a top open-source alternative to ${tool.paid_alternative}${tool.monthly_cost ? ` (${tool.monthly_cost})` : ""}. It offers similar functionality without monthly fees. You can compare both tools side-by-side on GitStack.`
                    }
                  }] : [])
                ].filter(Boolean)
              }
            ]
          })}
        </script>
      </Helmet>
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={[
            { label: "Tools", href: "/tools" },
            ...(tool.category ? [{ label: tool.category, href: `/tools?category=${encodeURIComponent(tool.category)}` }] : []),
            { label: tool.name },
          ]} />
          <div className="neo-card p-8 mb-8" data-testid="tool-detail-card">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h1 className="text-4xl font-black mb-2">{tool.name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  {tool.difficulty && (
                    <span className={`text-sm font-bold px-3 py-1 ${
                      tool.difficulty === 'Beginner' ? 'badge-beginner' :
                      tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {tool.difficulty}
                    </span>
                  )}
                  {tool.setup_time && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" /> {tool.setup_time}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {tool.stars}
                  </span>
                </div>
              </div>
              <GitHubLink
                url={tool.github_url}
                label="GitHub"
                className="neo-btn neo-btn-secondary px-4 py-2 flex-shrink-0"
                data-testid="github-link"
              />
            </div>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">{tool.description}</p>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">Who it's for</h2>
              <p className="text-muted-foreground">{tool.who_its_for}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">What you can build</h2>
              <ul className="space-y-2">
                {tool.what_you_can_build?.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {tool.paid_alternative && (
              <div className="p-4 bg-pastel-mint border-2 border-black mb-8 text-black">
                <p className="text-sm font-mono uppercase tracking-wider mb-1">Replaces</p>
                <p className="font-bold">{tool.paid_alternative} <span className="font-normal">({tool.monthly_cost})</span></p>
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-border">
              <button
                onClick={handleAddToStack}
                disabled={addedToStack}
                className={`neo-btn px-5 py-2 text-sm font-bold ${addedToStack ? 'bg-pastel-mint border-black text-black cursor-default' : 'neo-btn-primary'}`}
              >
                {addedToStack
                  ? <><BookmarkCheck className="w-4 h-4 mr-2" /> Saved</>
                  : <><BookmarkPlus className="w-4 h-4 mr-2" /> Add to My Stack</>}
              </button>
              {tool.github_url && (
                <Link
                  to={`/repo-translator?url=${encodeURIComponent(tool.github_url)}`}
                  className="neo-btn neo-btn-secondary px-5 py-2 text-sm font-bold bg-pastel-mint text-black"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Plain-English Guide
                </Link>
              )}
              <Link
                to={`/compare?t1=${encodeURIComponent(tool.name)}`}
                className="neo-btn neo-btn-secondary px-5 py-2 text-sm font-bold bg-pastel-lavender text-black"
              >
                <Scale className="w-4 h-4 mr-2" /> Compare
              </Link>
            </div>
          </div>

          <div className="neo-card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" /> How to Set Up
            </h2>
            <ol className="space-y-4">
              {tool.setup_steps?.map((step, i) => (
                <li key={`detail-step-${i}-${step.slice(0, 20)}`} className="flex gap-4">
                  <span className="w-8 h-8 bg-primary text-primary-foreground font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-lg pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {tool.related_tools?.length > 0 && (
            <div className="neo-card p-8">
              <h2 className="text-2xl font-bold mb-6">Tools that work well with this</h2>
              <div className="flex flex-wrap gap-2">
                {tool.related_tools.map(t => (
                  <Link 
                    key={t} 
                    to={`/tools/${t}`}
                    className="px-4 py-2 border-2 border-foreground font-semibold bg-background hover:bg-pastel-yellow hover:text-black transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <RelatedTools toolId={toolId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

