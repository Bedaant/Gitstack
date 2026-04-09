import React, { useState, useEffect } from "react";
import axios from "axios";
import { Header } from "../components/Header";
import { Hero } from "../components/sections/Hero";
import { ViralFeatures } from "../components/sections/ViralFeatures";
import { RepoOfTheDay } from "../components/sections/RepoOfTheDay";
import { TopicsGrid } from "../components/sections/TopicsGrid";
import { TrendingSection } from "../components/sections/TrendingSection";
import { CommunityStacks } from "../components/sections/CommunityStacks";
import { NewsletterSignup } from "../components/sections/NewsletterSignup";
import { API } from "../utils/api";

export default function HomePage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await axios.post(`${API}/seed`);
        const topicsRes = await axios.get(`${API}/topics`);
        setTopics(topicsRes.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="font-bold">Loading GitStack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <ViralFeatures />
      <RepoOfTheDay />
      <TopicsGrid topics={topics} />
      <TrendingSection />
      <CommunityStacks />
      <NewsletterSignup />
      <footer className="py-8 px-4 border-t-4 border-black">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-mono text-sm text-zinc-500">
            GitStack — GitHub, simplified for non-tech founders
          </p>
        </div>
      </footer>
    </div>
  );
}
