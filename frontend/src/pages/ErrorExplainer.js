import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Sparkles, Copy } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";

export default function ErrorExplainer() {
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const handleExplain = async (e) => {
    e.preventDefault();
    if (!errorText.trim()) return;

    setLoading(true);
    setExplanation(null);
    try {
      const res = await axios.post(`${API}/ai/error-explainer`, { error_text: errorText });
      setExplanation(res.data.explanation);
    } catch (e) {
      toast.error("Failed to explain error. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Error Explainer — Understand Any Code Error in Plain English"
        description="Paste any error message and get a plain-English explanation of what went wrong and exactly how to fix it. Free for developers and non-technical founders."
        path="/error-explainer"
      />
      <Header />
      <main id="main-content" className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-pink border-4 border-black neo-shadow-lg mb-6 text-black">
              <AlertTriangle className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="error-explainer-title">
              Explain This Error
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Paste any error message or stack trace. Get a plain-English explanation instantly.
            </p>
          </div>

          <form onSubmit={handleExplain} className="mb-12">
            <textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder="Paste your error message or stack trace here..."
              rows={6}
              className="neo-input p-4 w-full font-mono text-sm resize-none"
              data-testid="error-input"
            />
            <button
              type="submit"
              disabled={loading || !errorText.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg mt-4 disabled:opacity-50"
              data-testid="error-explain-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6 mr-2" /> Explain in Plain English</>}
            </button>
          </form>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4"></div>
              <p className="font-bold text-lg">Analyzing the error...</p>
              <p className="text-muted-foreground">Breaking it down into simple terms</p>
            </div>
          )}

          {explanation && (
            <div className="neo-card p-8 bg-pastel-mint text-black" data-testid="error-explanation">
              <div className="prose-gitstack" dangerouslySetInnerHTML={{ __html: formatContent(explanation) }} />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(explanation);
                  toast.success("Explanation copied!");
                }}
                className="neo-btn neo-btn-secondary px-6 py-3 w-full mt-6"
              >
                <Copy className="w-5 h-5 mr-2" /> Copy Explanation
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
