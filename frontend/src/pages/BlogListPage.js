import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Calendar, User, Tag, ArrowRight } from "lucide-react";

export default function BlogListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/blog-data/manifest.json")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "GitStack Blog",
    url: "https://gitstack.pro/blog",
    description: "Open-source tool discovery, setup guides, and founder playbooks.",
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Blog"
        description="Guides, tutorials, and insights on open-source tools for non-technical founders."
        path="/blog"
        jsonLd={jsonLd}
      />
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">GitStack Blog</h1>
          <p className="text-lg text-muted-foreground">
            Guides, tutorials, and insights on open-source tools for non-technical founders.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No posts yet. Check back soon!
          </div>
        ) : (
          <div className="grid gap-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group neo-card p-6 hover:border-primary/50 transition-colors"
              >
                <Link to={`/blog/${post.slug}`} className="block">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {post.author}
                    </span>
                    {post.tags?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {post.tags.join(", ")}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {post.description}
                  </p>

                  <span className="inline-flex items-center gap-2 text-primary font-medium">
                    Read more <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
