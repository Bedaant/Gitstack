import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { API } from "../utils/api";

const bgColors = ['bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lavender', 'bg-pastel-pink', 'bg-pastel-lavender', 'bg-pastel-yellow'];

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await axios.get(`${API}/collections`);
        setCollections(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchCollections();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="py-12 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="collections-title">
            Collections
          </h1>
          <p className="text-muted-foreground mb-8">Curated tool stacks for specific goals.</p>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {collections.map((col, i) => (
                <button
                  key={col.collection_id}
                  onClick={() => navigate(`/collections/${col.collection_id}`)}
                  className={`neo-card p-8 text-left text-foreground ${bgColors[i % bgColors.length]}`}
                  data-testid={`collection-${col.collection_id}`}
                >
                  <h2 className="text-2xl font-bold mb-2">{col.title}</h2>
                  <p className="text-foreground/70 mb-4">{col.description}</p>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold px-2 py-1 ${
                      col.difficulty === 'Beginner' ? 'badge-beginner' :
                      col.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {col.difficulty}
                    </span>
                    <span className="text-sm text-foreground/60 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {col.completion_time}
                    </span>
                    <span className="text-sm text-foreground/60">{col.tools?.length} tools</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
