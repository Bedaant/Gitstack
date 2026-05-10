import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Calendar, User, Tag, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/blog-data/${slug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.image?.startsWith("http") ? post.image : `https://gitstack.pro${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "GitStack",
      logo: {
        "@type": "ImageObject",
        url: "https://gitstack.pro/logo.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://gitstack.pro/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen">
      <SEO
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
        ogImage={post.image?.startsWith("http") ? post.image : `https://gitstack.pro${post.image}`}
        ogType="article"
        jsonLd={jsonLd}
      />
      <Helmet>
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        {post.tags?.map((t) => (
          <meta property="article:tag" content={t} key={t} />
        ))}
      </Helmet>

      <Header />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Breadcrumbs
          items={[
            { label: "Blog", href: "/blog" },
            { label: post.title },
          ]}
        />

        <article className="mt-8">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
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

          <h1 className="text-4xl font-bold mb-6">{post.title}</h1>

          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(post.body) }}
          />
        </article>

        <div className="mt-12 pt-8 border-t">
          <Link to="/blog" className="text-primary inline-flex items-center gap-2 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to all posts
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Simple markdown-to-HTML converter for blog posts
function markdownToHtml(md) {
  if (!md) return "";
  return md
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/gim, "<br />");
}
