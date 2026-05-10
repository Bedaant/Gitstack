import React, { useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { ChevronDown, Search } from "lucide-react";

const FAQS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is GitStack?",
        a: "GitStack is an AI-powered platform that helps non-technical founders discover, understand, and deploy free open-source tools. We bridge the gap between GitHub repositories and practical usage.",
      },
      {
        q: "Is GitStack free to use?",
        a: "Yes! GitStack's core features — tool discovery, stack generation, repo translation, and the dead tool detector — are completely free. We also offer a marketplace for premium setups.",
      },
      {
        q: "Do I need to know how to code?",
        a: "Not at all. GitStack is built specifically for non-technical founders. We explain every tool in plain English and provide step-by-step setup guides.",
      },
    ],
  },
  {
    category: "Tools & Discovery",
    questions: [
      {
        q: "How do I find alternatives to a paid SaaS tool?",
        a: "Use our Alternatives feature. Simply search for the paid tool (e.g., 'Zapier' or 'Airtable') and we'll show you the best free, open-source replacements with setup instructions.",
      },
      {
        q: "What is the Dead Tool Detector?",
        a: "The Dead Tool Detector analyzes GitHub repositories to identify projects that haven't been updated recently, have unresolved security issues, or lack community activity — helping you avoid abandoned tools.",
      },
      {
        q: "How accurate is the Repo Translator?",
        a: "Our AI-powered Repo Translator reads GitHub READMEs, documentation, and code structure to explain what a project does in plain English. It's designed for non-technical founders and focuses on practical use cases.",
      },
      {
        q: "Can I self-host these tools?",
        a: "Absolutely. Most tools we recommend are self-hostable. We provide setup guides for popular platforms like Railway, Render, DigitalOcean, and local deployment.",
      },
    ],
  },
  {
    category: "Stacks & Building",
    questions: [
      {
        q: "What is the Stack Generator?",
        a: "The Stack Generator asks what you're building, then recommends a complete set of open-source tools that work together — complete with setup order and estimated cost savings versus SaaS alternatives.",
      },
      {
        q: "Can I save and share my stacks?",
        a: "Yes! Create an account to save stacks to your dashboard. You can also share stacks publicly via a unique URL or email them to yourself.",
      },
      {
        q: "How much can I save using open-source tools?",
        a: "Most founders save $500–$2,000/month by replacing SaaS subscriptions with open-source alternatives. Our Stack Generator shows exact savings for each recommendation.",
      },
    ],
  },
  {
    category: "Marketplace",
    questions: [
      {
        q: "What is the GitStack Marketplace?",
        a: "The Marketplace connects you with developers who can set up, configure, and customize open-source tools for your specific needs — like Fiverr, but specialized for open-source deployment.",
      },
      {
        q: "How do I buy a product on the Marketplace?",
        a: "Browse products, view details and screenshots, then click 'Buy Now'. We use secure payment processing and hold funds in escrow until you confirm the delivery.",
      },
    ],
  },
  {
    category: "Account & Support",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click 'Sign In' in the header and follow the quick authentication flow. We support email, Google, and GitHub sign-in.",
      },
      {
        q: "How can I contact support?",
        a: "Reach out via our contact form or email support@gitstack.pro. For feature requests, join our community on Discord or GitHub Discussions.",
      },
    ],
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);
  const [search, setSearch] = useState("");

  const allQuestions = FAQS.flatMap((cat) =>
    cat.questions.map((q) => ({ ...q, category: cat.category }))
  );

  const filtered = search.trim()
    ? allQuestions.filter(
        (q) =>
          q.q.toLowerCase().includes(search.toLowerCase()) ||
          q.a.toLowerCase().includes(search.toLowerCase())
      )
    : allQuestions;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: filtered.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.a,
      },
    })),
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="FAQ"
        description="Frequently asked questions about GitStack, open-source tools, stack generation, and the marketplace."
        path="/faq"
        jsonLd={faqSchema}
      />
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about GitStack and open-source tools.
          </p>
        </div>

        <div className="relative mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {search.trim() ? (
          <div className="space-y-4">
            {filtered.map((item, idx) => (
              <FaqItem
                key={idx}
                question={item.q}
                answer={item.a}
                isOpen={openIndex === idx}
                onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No questions found. Try a different search term.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {FAQS.map((category) => (
              <div key={category.category}>
                <h2 className="text-xl font-bold mb-4 text-primary">{category.category}</h2>
                <div className="space-y-3">
                  {category.questions.map((item, idx) => {
                    const globalIdx = allQuestions.findIndex(
                      (q) => q.q === item.q && q.category === category.category
                    );
                    return (
                      <FaqItem
                        key={idx}
                        question={item.q}
                        answer={item.a}
                        isOpen={openIndex === globalIdx}
                        onToggle={() => setOpenIndex(openIndex === globalIdx ? null : globalIdx)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="neo-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
