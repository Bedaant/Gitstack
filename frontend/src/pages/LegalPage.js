import React from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";

// Generic legal page shell — pass title + sections
export function LegalShell({ title, description, path, lastUpdated, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO title={`${title} — GitStack`} description={description} path={path} />
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl md:text-5xl font-black uppercase mb-3">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground font-mono mb-8">Last updated: {lastUpdated}</p>
          )}
          <div className="prose-gitstack space-y-6">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      description="GitStack Terms of Service — rules for using the platform, marketplace, and services."
      path="/terms"
      lastUpdated="May 2026"
    >
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">1. Acceptance</h2>
        <p>By accessing GitStack you agree to these terms. If you don't agree, don't use the service.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">2. Accounts</h2>
        <p>You must provide accurate information. You're responsible for activity on your account and for keeping your credentials secure.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">3. AI Output</h2>
        <p>AI-generated summaries, recommendations, and translations are for informational purposes. Verify before acting on them. We don't guarantee accuracy.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">4. Marketplace</h2>
        <p>Sellers are responsible for their listings, deliverables, and support. Buyers are responsible for reviewing before purchase. GitStack charges a 15% platform fee and holds funds in escrow for setup services.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">5. Prohibited Content</h2>
        <p>No malware, illegal content, IP infringement, stolen code, or misleading listings. Violations result in account termination.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">6. Refunds</h2>
        <p>Digital downloads are final once delivered. Setup services auto-release after 7 days unless disputed.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">7. Limitation of Liability</h2>
        <p>GitStack is provided "as is." We're not liable for indirect, incidental, or consequential damages arising from platform use.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">8. Contact</h2>
        <p>Questions? Email <a href="mailto:hello@gitstack.pro" className="underline font-bold">hello@gitstack.pro</a>.</p>
      </section>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      description="How GitStack collects, uses, and protects your data."
      path="/privacy"
      lastUpdated="May 2026"
    >
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">Data We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Account:</strong> Email, name, profile picture (via Clerk authentication).</li>
          <li><strong>Activity:</strong> Repos viewed, stacks generated, marketplace purchases.</li>
          <li><strong>Technical:</strong> IP address, browser info, cookies for session and analytics.</li>
          <li><strong>Payment:</strong> Processed by Razorpay/Stripe — we don't store card numbers.</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">How We Use It</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Operate the platform and fulfill purchases</li>
          <li>Personalize recommendations (opt-out available in settings)</li>
          <li>Send transactional emails</li>
          <li>Improve AI tools (anonymized usage only)</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">Third Parties</h2>
        <p>We use Clerk (auth), MongoDB Atlas (database), Razorpay (payments), Gemini (AI), Google Analytics (usage). These providers have their own privacy policies.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">Your Rights</h2>
        <p>You can request data export or deletion at any time by emailing <a href="mailto:hello@gitstack.pro" className="underline font-bold">hello@gitstack.pro</a>. We comply with GDPR and applicable data protection laws.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">Cookies</h2>
        <p>Strictly necessary cookies for auth and session. Optional analytics cookies (can be declined).</p>
      </section>
    </LegalShell>
  );
}

export function AboutPage() {
  return (
    <LegalShell
      title="About GitStack"
      description="GitStack is the layer between open source tools existing and non-technical founders actually using them."
      path="/about"
    >
      <section className="neo-card p-6 bg-pastel-mint text-black">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">Why GitStack exists</h2>
        <p className="text-lg">GitHub has a million free tools. Founders pay $10k/year for SaaS anyway — because they don't know which repo solves their problem, or how to set it up.</p>
        <p className="mt-3 text-lg">GitStack fixes that. We translate repos to plain English, build tech stacks from ideas, and connect founders with indie builders who ship.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">What we do</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Repo Translator:</strong> Any GitHub URL → plain-English explanation in 10 seconds.</li>
          <li><strong>Repo X-Ray:</strong> Architecture, dependencies, and entry points for any repo.</li>
          <li><strong>Stack Generator:</strong> Describe your idea → get a ready-to-use open source stack.</li>
          <li><strong>Marketplace:</strong> Buy indie SaaS alternatives, templates, MCP servers once; own forever.</li>
          <li><strong>Hire Builders:</strong> Indie developers available for setup and custom work.</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">Built by</h2>
        <p><strong>Bedaant Srivastav</strong> — Founder. <a className="underline" href="mailto:bedaantsrivastav2001@gmail.com">bedaantsrivastav2001@gmail.com</a></p>
        <p className="mt-2"><strong>Atul Raj Sharan</strong> — Working Partner.</p>
      </section>
    </LegalShell>
  );
}

export default TermsPage;
