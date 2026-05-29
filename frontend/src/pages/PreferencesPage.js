import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { API } from "../utils/api";
import { Loader2, CheckCircle2, AlertTriangle, Save, Mail, Bell, Package } from "lucide-react";
import { SEO } from "../components/SEO";

export default function PreferencesPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const [prefs, setPrefs] = useState({
    daily_drop: true,
    stack_reminders: true,
    product_updates: false,
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No token found. Use the link from your email.");
      return;
    }

    axios
      .get(`${API}/newsletter/preferences?token=${token}`)
      .then((res) => {
        setEmail(res.data.email);
        setPrefs(res.data.preferences);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setError(
          err.response?.data?.detail || "Invalid or expired link. Request a new one."
        );
      });
  }, [token]);

  const handleToggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await axios.put(`${API}/newsletter/preferences`, {
        token,
        preferences: prefs,
      });
      setSaveSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Loading your preferences...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            <div className="neo-card bg-white p-8 md:p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pastel-pink border-2 border-black neo-shadow mb-6">
                <AlertTriangle className="w-10 h-10 text-black" />
              </div>
              <h1 className="text-3xl font-black mb-3 tracking-tight">Link expired</h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">{error}</p>
              <Link to="/" className="neo-btn neo-btn-primary px-6 py-3 text-sm">
                Go Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const unsubscribeUrl = `/unsubscribe?token=${token}`;

  const PreferenceRow = ({ icon, label, description, keyName, bgColor }) => (
    <div className="neo-card bg-white p-5 mb-4 flex items-start gap-4">
      <div
        className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-2 border-black neo-shadow"
        style={{ backgroundColor: bgColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">{label}</h3>
          <button
            onClick={() => handleToggle(keyName)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 border-black transition-colors ${
              prefs[keyName] ? "bg-pastel-mint" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full border-2 border-black bg-white transform transition-transform ${
                prefs[keyName] ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Email Preferences" noindex />
      <Header />
      <main id="main-content" className="flex-1 px-4 py-12">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-2">
              Email Preferences
            </h1>
            <p className="text-muted-foreground">
              Managing settings for <strong>{email}</strong>
            </p>
          </div>

          {/* Preferences */}
          <PreferenceRow
            icon={<Mail className="w-5 h-5 text-black" />}
            label="Daily Drop"
            description="One curated open-source tool every morning. Explained in plain English."
            keyName="daily_drop"
            bgColor="var(--pastel-mint)"
          />

          <PreferenceRow
            icon={<Bell className="w-5 h-5 text-black" />}
            label="Stack Reminders"
            description="Follow-up emails when you save a stack. Includes setup tips."
            keyName="stack_reminders"
            bgColor="var(--pastel-yellow)"
          />

          <PreferenceRow
            icon={<Package className="w-5 h-5 text-black" />}
            label="Product Updates"
            description="New features, marketplace launches, and major announcements."
            keyName="product_updates"
            bgColor="var(--pastel-lavender)"
          />

          {/* Save */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="neo-btn neo-btn-primary px-6 py-3 text-sm flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>

            {saveSuccess && (
              <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>

          {/* Unsubscribe */}
          <div className="mt-10 pt-8 border-t-2 border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Want to stop all emails?
            </p>
            <Link
              to={unsubscribeUrl}
              className="neo-btn px-5 py-2.5 text-sm bg-white text-black hover:bg-red-50"
              style={{ boxShadow: "4px 4px 0px 0px #09090B" }}
            >
              Unsubscribe from all
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
