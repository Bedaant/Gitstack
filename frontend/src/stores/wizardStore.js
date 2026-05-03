import { create } from "zustand";

export const useWizardStore = create((set, get) => ({
  step: 0,
  productId: null,
  title: "",
  tagline: "",
  category: "SaaS",
  sourcePrice: "",
  setupAvailable: false,
  setupPrice: "",
  setupDays: 3,
  setupDesc: "",
  githubRepo: "",
  demoVideo: "",
  description: "",
  screenshots: [],
  uploadProgress: 0,
  saving: false,

  setField: (field, value) => set({ [field]: value }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
  setStep: (step) => set({ step }),
  reset: () =>
    set({
      step: 0,
      productId: null,
      title: "",
      tagline: "",
      category: "SaaS",
      sourcePrice: "",
      setupAvailable: false,
      setupPrice: "",
      setupDays: 3,
      setupDesc: "",
      githubRepo: "",
      demoVideo: "",
      description: "",
      screenshots: [],
      uploadProgress: 0,
      saving: false,
    }),
  initFromProduct: (product) =>
    set({
      productId: product?.product_id || null,
      title: product?.title || "",
      tagline: product?.tagline || "",
      category: product?.category || "SaaS",
      sourcePrice: product ? (product.source_price_cents / 100).toFixed(2) : "",
      setupAvailable: product?.setup_available || false,
      setupPrice: product?.setup_price_cents ? (product.setup_price_cents / 100).toFixed(2) : "",
      setupDays: product?.setup_delivery_days || 3,
      setupDesc: product?.setup_description || "",
      githubRepo: product?.github_repo_url || "",
      demoVideo: product?.demo_video_url || "",
      description: product?.description || "",
      screenshots: product?.screenshots || [],
      step: product ? 1 : 0,
    }),

  isStep1Valid: () => {
    const s = get();
    return s.title.trim() && s.tagline.trim() && s.sourcePrice && parseFloat(s.sourcePrice) > 0;
  },
  isStep2Valid: () => {
    const s = get();
    return s.description.trim().length >= 50;
  },
  isStep3Valid: () => {
    const s = get();
    return s.screenshots.length >= 1;
  },
}));
