import { init, track } from "@plausible-analytics/tracker";

let isInitialized = false;

export function initAnalytics() {
  if (isInitialized || typeof window === "undefined") return;
  
  init({
    domain: "www.gitstack.pro",
    apiHost: "https://plausible.io",
    trackLocalhost: false,
    autoPageviews: false, // We'll track manually for SPA
  });
  
  isInitialized = true;
}

export function trackPageView(path) {
  if (typeof window === "undefined") return;
  track("pageview", { u: `https://www.gitstack.pro${path}` });
}

export function trackEvent(eventName, props = {}) {
  if (typeof window === "undefined") return;
  track(eventName, { props });
}
