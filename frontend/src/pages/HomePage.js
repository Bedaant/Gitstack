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
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Helmet } from "react-helmet-async";
import { API } from "../utils/api";

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
      "description": "AI-powered platform that helps non-technical founders discover free open-source tools, generate tech stacks, and understand GitHub repos in plain English."
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
      <SocialProof />
      <ViralFeatures />
      <RepoOfTheDay />
      <TopicsGrid topics={topics} loading={loading} />
      <TrendingSection />
      <CommunityStacks />
      <NewsletterSignup />
      <Footer />
    </div>
  );
}
