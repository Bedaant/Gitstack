import React, { useState } from "react";
import { Twitter, Linkedin, Facebook, Link2, Check } from "lucide-react";

export const ShareButtons = ({ url, title, className = "" }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || window.location.href;
  const shareTitle = title || document.title;
  const utmUrl = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}utm_source=share&utm_medium=social&utm_campaign=gitstack`;

  const shareData = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(utmUrl)}&text=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(utmUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(utmUrl)}`,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: utmUrl });
        return;
      } catch {
        // fallback to copy
      }
    }
    handleCopy();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(utmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={shareData.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 border-2 border-foreground hover:bg-sky-100 hover:text-sky-700 transition-colors"
        aria-label="Share on X"
      >
        <Twitter className="w-4 h-4" />
      </a>
      <a
        href={shareData.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 border-2 border-foreground hover:bg-blue-100 hover:text-blue-700 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </a>
      <a
        href={shareData.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 border-2 border-foreground hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
        aria-label="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </a>
      <button
        onClick={handleNativeShare}
        className="p-2 border-2 border-foreground hover:bg-muted transition-colors"
        aria-label="Copy link"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
