import { useCallback, useEffect, useState } from "react";

const SDK_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export const useRazorpay = () => {
  const [ready, setReady] = useState(typeof window !== "undefined" && !!window.Razorpay);

  useEffect(() => {
    if (ready) return;
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, [ready]);

  const openCheckout = useCallback(({ orderId, amountCents, currency = "INR", keyId, name, description, prefill, onSuccess, onDismiss }) => {
    if (!window.Razorpay) {
      onDismiss?.(new Error("Razorpay SDK not loaded"));
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId,
      amount: amountCents,
      currency,
      order_id: orderId,
      name: "GitStack",
      description,
      prefill: prefill || {},
      theme: { color: "#2563EB" },
      modal: { ondismiss: () => onDismiss?.() },
      handler: (resp) => onSuccess?.(resp),
    });
    rzp.open();
  }, []);

  return { ready, openCheckout };
};
