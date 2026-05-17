import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { API } from "../utils/api";
import { Loader2, CheckCircle2, AlertTriangle, Frown, Smile } from "lucide-react";
import { SEO } from "../components/SEO";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("confirm"); // confirm | loading | success | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  // SEC-10: GET now returns a confirmation prompt instead of auto-unsubscribing
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No token found. Use the link from your email.");
      return;
    }

    // Validate the token and get the email
    axios
      .get(`${API}/newsletter/unsubscribe?token=${token}`)
      .then((res) => {
        setEmail(res.data.email || "");
        setStatus("confirm");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.detail || "Invalid or expired link. Request a new one."
        );
      });
  }, [token]);

  const handleConfirmUnsubscribe = async () => {
    setStatus("loading");
    try {
      const res = await axios.post(`${API}/newsletter/unsubscribe?token=${token}`);
      setStatus("success");
      setMessage(res.data.message);
    } catch (err) {
      setStatus("error");
      setMessage(
        err.response?.data?.detail || "Something went wrong. Try again."
      );
    }
  };

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">
            Unsubscribing you...
          </p>
        </div>
      );
    }

    if (status === "confirm") {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pastel-yellow border-2 border-black neo-shadow mb-6">
            <AlertTriangle className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tight">
            Confirm Unsubscribe
          </h1>
          <p className="text-muted-foreground text-lg mb-2 max-w-sm mx-auto">
            {email ? `Unsubscribe ${email} from` : "Unsubscribe from"} the GitStack Daily Drop?
          </p>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            You'll stop receiving our curated open-source tool digests.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/"
              className="neo-btn neo-btn-secondary px-6 py-3 text-sm"
            >
              Keep Subscribed
            </Link>
            <button
              onClick={handleConfirmUnsubscribe}
              className="neo-btn neo-btn-primary px-6 py-3 text-sm bg-red-100 hover:bg-red-200"
            >
              Yes, Unsubscribe
            </button>
          </div>
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pastel-mint border-2 border-black neo-shadow mb-6">
            <Frown className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tight">
            We're sad to see you go
          </h1>
          <p className="text-muted-foreground text-lg mb-2 max-w-sm mx-auto">
            {message}
          </p>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            You won't receive any more Daily Drop emails. If you change your
            mind, you can always resubscribe.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/"
              className="neo-btn neo-btn-primary px-6 py-3 text-sm"
            >
              <Smile className="w-4 h-4 mr-2" />
              Resubscribe on Homepage
            </Link>
          </div>
        </div>
      );
    }

    // error
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pastel-pink border-2 border-black neo-shadow mb-6">
          <AlertTriangle className="w-10 h-10 text-black" />
        </div>
        <h1 className="text-3xl font-black mb-3 tracking-tight">
          Couldn't unsubscribe
        </h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
          {message}
        </p>
        <Link to="/" className="neo-btn neo-btn-primary px-6 py-3 text-sm">
          Go Home
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Unsubscribe" noindex />
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="neo-card bg-white p-8 md:p-10">
            {renderContent()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
