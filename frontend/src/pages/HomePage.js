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
import { Footer } from "../components/Footer";
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
      <Footer />
    </div>
  );
}
