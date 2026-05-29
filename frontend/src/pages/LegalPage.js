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
      <main id="main-content" className="flex-1 py-12 px-4">
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
        <h2 className="font-heading text-2xl font-black uppercase mb-3">1. Data We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Account:</strong> Email, name, profile picture (via Clerk authentication).</li>
          <li><strong>Activity:</strong> Repos viewed, stacks generated, marketplace purchases, search queries.</li>
          <li><strong>Technical:</strong> IP address, browser type, device info, cookies for session and analytics.</li>
          <li><strong>Payment:</strong> Processed by Razorpay/Stripe — we never store card numbers or banking details.</li>
          <li><strong>Communications:</strong> Support emails, seller onboarding forms, newsletter subscriptions.</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">2. How We Use It</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Operate the platform and fulfill marketplace purchases</li>
          <li>Personalize tool recommendations (opt-out available in account settings)</li>
          <li>Send transactional emails (purchase receipts, seller payouts, security alerts)</li>
          <li>Improve AI models using fully anonymized usage patterns</li>
          <li>Detect fraud, abuse, and security threats</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">3. Legal Basis (GDPR)</h2>
        <p>We process personal data under the following lawful bases:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Contractual necessity:</strong> To provide services you signed up for (account, purchases, seller payouts).</li>
          <li><strong>Legitimate interests:</strong> Fraud prevention, platform security, and product improvement.</li>
          <li><strong>Consent:</strong> Marketing emails and analytics cookies. You can withdraw consent anytime.</li>
          <li><strong>Legal obligation:</strong> Tax reporting, regulatory compliance, and law enforcement requests.</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">4. Data Retention</h2>
        <p>We keep your data only as long as necessary:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Account data:</strong> Until you delete your account or 2 years of inactivity.</li>
          <li><strong>Purchase records:</strong> 7 years for tax and accounting compliance.</li>
          <li><strong>Analytics data:</strong> 26 months, then anonymized or deleted.</li>
          <li><strong>Newsletter emails:</strong> Until you unsubscribe or we delete inactive subscribers after 12 months.</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">5. Third Parties</h2>
        <p>We use carefully vetted service providers:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Clerk</strong> — Authentication and user management</li>
          <li><strong>MongoDB Atlas</strong> — Database hosting</li>
          <li><strong>Razorpay</strong> — Payment processing</li>
          <li><strong>Google Gemini</strong> — AI summarization and recommendations</li>
          <li><strong>Google Analytics</strong> — Anonymous usage analytics</li>
          <li><strong>Resend</strong> — Transactional and marketing email delivery</li>
        </ul>
        <p className="mt-2">Each provider has their own privacy policy and is bound by GDPR/data processing agreements where applicable.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">6. Cookies & Tracking</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Essential:</strong> Authentication tokens, session state — required for the site to work.</li>
          <li><strong>Analytics:</strong> Google Analytics and Plausible for anonymous traffic analysis. You can decline these.</li>
          <li><strong>Preferences:</strong> Theme settings, dismissed popups, newsletter state.</li>
        </ul>
        <p className="mt-2">You can clear cookies anytime via your browser settings. We respect Do Not Track signals.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">7. Your Rights</h2>
        <p>Under GDPR and similar laws, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Delete your account and associated data ("right to be forgotten")</li>
          <li>Export your data in a portable format</li>
          <li>Object to processing for marketing or analytics</li>
          <li>Restrict processing while we investigate a dispute</li>
        </ul>
        <p className="mt-2">To exercise any right, email <a href="mailto:hello@gitstack.pro" className="underline font-bold">hello@gitstack.pro</a>. We respond within 30 days.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">8. Security Measures</h2>
        <p>We protect your data with industry-standard practices:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>TLS 1.3 encryption for all data in transit</li>
          <li>Encrypted database connections via MongoDB Atlas</li>
          <li>Clerk-managed authentication with JWT tokens</li>
          <li>Regular dependency audits and security patches</li>
          <li>No storage of payment card details — all handled by Razorpay</li>
        </ul>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">9. Children's Privacy</h2>
        <p>GitStack is not intended for users under 16. We do not knowingly collect data from children. If you believe a child has provided us personal information, contact us immediately and we will delete it.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy as laws or our services evolve. Material changes will be announced via email and a site banner 30 days before taking effect. The "Last updated" date at the top of this page reflects the latest revision.</p>
      </section>
      <section className="neo-card p-6">
        <h2 className="font-heading text-2xl font-black uppercase mb-3">11. Contact</h2>
        <p>Questions, complaints, or data requests? Email <a href="mailto:hello@gitstack.pro" className="underline font-bold">hello@gitstack.pro</a> or write to GitStack, C/O Bedaant Srivastav, India.</p>
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
