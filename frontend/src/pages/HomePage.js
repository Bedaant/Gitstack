import React, { useState, useEffect } from "react";
import axios from "axios";
import { Header } from "../components/Header";
import { Hero } from "../components/sections/Hero";
import { ViralFeatures } from "../components/sections/ViralFeatures";
import { RepoOfTheDay } from "../components/sections/RepoOfTheDay";
import { TopicsGrid } from "../components/sections/TopicsGrid";
import { TrendingSection } from "../components/sections/TrendingSection";
import { CommunityStacks } from "../components/sections/CommunityStacks";
import { SocialProof } from "../components/sections/SocialProof";
import { NewsletterSignup } from "../components/sections/NewsletterSignup";
import { RecommendationsSection } from "../components/sections/RecommendationsSection";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Helmet } from "react-helmet-async";
import { API } from "../utils/api";
import { Link } from "react-router-dom";
import { Brain, ShoppingBag, Briefcase } from "lucide-react";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://gitstack.dev/#website",
      "url": "https://gitstack.dev",
      "name": "GitStack",
      "description": "Free open-source tool discovery and AI-powered stack generation for founders",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://gitstack.dev/stack-generator?idea={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "SoftwareApplication",
      "name": "GitStack",
      "url": "https://gitstack.dev",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "AI-powered platform that helps non-technical founders discover free open-source tools, generate tech stacks, and understand GitHub repos in plain English.",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1240",
        "bestRating": "5"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://gitstack.dev/#organization",
      "name": "GitStack",
      "url": "https://gitstack.dev",
      "logo": "https://gitstack.dev/logo.png",
      "sameAs": [
        "https://github.com/gitstack",
        "https://twitter.com/gitstackdev"
      ],
      "description": "Curated open-source tool discovery platform for non-technical founders."
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is GitStack?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "GitStack is a curated open-source tool discovery platform that helps non-technical founders find, understand, and acquire free alternatives to expensive SaaS tools. It features AI-powered repo translation, stack generation, and an indie developer marketplace."
          }
        },
        {
          "@type": "Question",
          "name": "How does GitStack explain GitHub repos?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Paste any GitHub URL into GitStack's Repo Translator. Our AI reads the README, codebase structure, and documentation, then explains the project in plain English — what it does, why you might use it, and how hard it is to set up."
          }
        },
        {
          "@type": "Question",
          "name": "Is GitStack free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Browsing tools, generating stacks, translating repos, and using AI features are completely free. The marketplace charges a 15% platform fee on paid transactions."
          }
        },
        {
          "@type": "Question",
          "name": "What are the best open-source alternatives to paid SaaS tools?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "GitStack curates open-source alternatives across 50+ categories. Popular swaps include Supabase for Firebase, n8n for Zapier, Plane for Jira, and PostHog for Mixpanel. Use the Dead Tool Detector to find replacements for any paid tool."
          }
        },
        {
          "@type": "Question",
          "name": "How do I sell my open-source tool on GitStack?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Navigate to the Sell page, complete seller onboarding with your payout details, then create a product listing using our 5-step wizard. You can sell source code ZIPs and offer setup services. GitStack handles payments via Razorpay with escrow protection."
          }
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "How to Find Free Open-Source Alternatives to Paid Tools",
      "description": "Use GitStack's AI-powered tools to discover, compare, and deploy free open-source alternatives to expensive SaaS products.",
      "totalTime": "PT5M",
      "supply": [ "A web browser", "Your idea or current tool name" ],
      "tool": [ { "@type": "HowToTool", "name": "GitStack Web App" } ],
      "step": [
        {
          "@type": "HowToStep",
          "name": "Search or paste a tool name",
          "text": "Enter the paid SaaS tool you want to replace in the search bar, or paste a GitHub repo URL to understand a project.",
          "url": "https://gitstack.dev"
        },
        {
          "@type": "HowToStep",
          "name": "Review AI-powered explanations",
          "text": "GitStack translates GitHub repos into plain English and compares tools on price, setup time, and founder-friendliness.",
          "url": "https://gitstack.dev/repo-translator"
        },
        {
          "@type": "HowToStep",
          "name": "Generate or buy a complete stack",
          "text": "Use the Stack Generator to build a custom tech stack, or browse the marketplace to buy source code + setup services from indie developers.",
          "url": "https://gitstack.dev/stack-generator"
        }
      ]
    }
  ]
};

export default function HomePage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const topicsRes = await axios.get(`${API}/topics`);
        setTopics(topicsRes.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      <SEO
        title="Free Tools for Founders — No Code Needed"
        description="Discover free open-source tools, roast your SaaS stack, generate tech stacks, and understand any GitHub repo in plain English. Built for non-technical founders."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>
      <Header />
      <Hero />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/repo-translator" className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all relative">
            <span className="absolute top-3 right-3 text-[10px] font-black bg-pastel-mint text-black border-2 border-black px-2 py-0.5 uppercase tracking-wider">Free</span>
            <Brain className="w-7 h-7 mb-2 text-primary" />
            <h3 className="font-black uppercase tracking-tight mb-1">Understand any repo</h3>
            <p className="text-sm text-muted-foreground">AI-translates GitHub READMEs into plain English in seconds.</p>
          </Link>
          <Link to="/marketplace" className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all relative">
            <span className="absolute top-3 right-3 text-[10px] font-black bg-pastel-yellow text-black border-2 border-black px-2 py-0.5 uppercase tracking-wider">From $19</span>
            <ShoppingBag className="w-7 h-7 mb-2 text-primary" />
            <h3 className="font-black uppercase tracking-tight mb-1">Buy or sell dev tools</h3>
            <p className="text-sm text-muted-foreground">Pay once for indie SaaS alternatives. Source code + optional setup.</p>
          </Link>
          <Link to="/marketplace" className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all relative">
            <span className="absolute top-3 right-3 text-[10px] font-black bg-pastel-lavender text-black border-2 border-black px-2 py-0.5 uppercase tracking-wider">From $49</span>
            <Briefcase className="w-7 h-7 mb-2 text-primary" />
            <h3 className="font-black uppercase tracking-tight mb-1">Hire indie builders</h3>
            <p className="text-sm text-muted-foreground">Browse builder profiles and hire them directly for setup or custom work.</p>
          </Link>
        </div>
      </section>
      {/* Above-the-fold priority: recommendations + trust */}
      <RecommendationsSection />
      <SocialProof />
      <TrendingSection />
      <ViralFeatures />
      {/* Secondary discovery — below the fold */}
      <RepoOfTheDay />
      <TopicsGrid topics={topics} loading={loading} />
      <CommunityStacks />
      <NewsletterSignup />
      <Footer />
    </div>
  );
}
