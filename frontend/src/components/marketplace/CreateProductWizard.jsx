import React, { useRef, useEffect } from "react";
import axios from "axios";
import { Pencil, FileText, Image, Upload, Eye, ChevronRight, X } from "lucide-react";
import { API } from "../../utils/api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { toast } from "sonner";
import { useWizardStore } from "../../stores/wizardStore";

const STEPS = [
  { label: "Details", icon: Pencil },
  { label: "Description", icon: FileText },
  { label: "Screenshots", icon: Image },
  { label: "Source ZIP", icon: Upload },
  { label: "Preview", icon: Eye },
];

const CATEGORY_OPTIONS = [
  { value: "saas", label: "SaaS" },
  { value: "mcp-server", label: "MCP Server" },
  { value: "computer-vision", label: "Computer Vision" },
  { value: "template", label: "Template" },
  { value: "skill", label: "Skill" },
  { value: "other", label: "Other" },
];

export const CreateProductWizard = ({ mode = "create", initialProduct = null, onClose, onSave }) => {
  const {
    step, setStep,
    productId, setField,
    title, tagline, category, currency, sourcePrice, setupAvailable, setupPrice, setupDays, setupDesc,
    githubRepo, demoVideo, description, screenshots, uploadProgress, saving,
    initFromProduct, reset,
  } = useWizardStore();

  const zipRef = useRef(null);

  const parsedSourcePrice = parseFloat(sourcePrice || "0");
  const parsedSetupPrice = parseFloat(setupPrice || "0");
  const parsedSetupDays = parseInt(setupDays || "0", 10);

  useEffect(() => {
    if (mode === "edit" && initialProduct) {
      initFromProduct(initialProduct);
    } else {
      reset();
    }
    return () => reset();
  }, [mode, initialProduct, initFromProduct, reset]);

  const isStep1Valid =
    title.trim().length >= 3 &&
    tagline.trim().length >= 10 &&
    sourcePrice &&
    parsedSourcePrice >= 1 &&
    parsedSourcePrice <= 1000 &&
    (!setupAvailable || (parsedSetupPrice >= 1 && parsedSetupPrice <= 1000 && parsedSetupDays >= 1 && setupDesc.trim().length > 0));
  const isStep2Valid = description.trim().length >= 50;
  const isStep3Valid = screenshots.length >= 1;

  const buildProductPayload = () => ({
    title: title.trim(),
    tagline: tagline.trim(),
    category,
    currency,
    source_price_cents: Math.round(parsedSourcePrice * 100),
    setup_available: setupAvailable,
    setup_price_cents: setupAvailable ? Math.round(parsedSetupPrice * 100) : null,
    setup_delivery_days: setupAvailable ? parsedSetupDays : null,
    setup_description: setupAvailable ? setupDesc.trim() : null,
    github_repo_url: githubRepo.trim() || null,
    demo_video_url: demoVideo.trim() || null,
  });

  const saveStep1 = async () => {
    if (mode !== "edit") {
      setField("step", 1);
      return;
    }

    setField("saving", true);
    try {
      const payload = buildProductPayload();
      if (productId) {
        await axios.patch(`${API}/marketplace/products/${productId}`, payload, { withCredentials: true });
      }
      toast.success("Product updated");
      setField("step", 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save"));
    } finally {
      setField("saving", false);
    }
  };

  const saveStep2 = async () => {
    setField("saving", true);
    try {
      if (mode === "edit" && productId) {
        await axios.patch(`${API}/marketplace/products/${productId}`, { description: description.trim() }, { withCredentials: true });
        toast.success("Description saved");
      } else {
        const payload = {
          ...buildProductPayload(),
          description: description.trim(),
        };
        const { data } = await axios.post(`${API}/marketplace/products`, payload, { withCredentials: true });
        setField("productId", data.product_id);
        toast.success("Product created");
      }
      setField("step", 2);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save"));
    } finally {
      setField("saving", false);
    }
  };

  const uploadScreenshots = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    try {
      let latestScreenshots = [...screenshots];
      for (const file of selectedFiles) {
        const form = new FormData();
        form.append("file", file);
        const { data } = await axios.post(`${API}/marketplace/products/${productId}/screenshots`, form, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (Array.isArray(data?.screenshots)) {
          latestScreenshots = data.screenshots;
        }
      }
      setField("screenshots", latestScreenshots);
      toast.success(selectedFiles.length > 1 ? "Screenshots uploaded" : "Screenshot uploaded");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload failed"));
    }
  };

  const uploadZip = async (file) => {
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post(`${API}/marketplace/products/${productId}/upload`, form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setField("uploadProgress", Math.round((ev.loaded * 100) / ev.total));
        },
      });
      toast.success("Source ZIP uploaded");
      setField("step", 4);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload failed"));
    } finally {
      setField("uploadProgress", 0);
    }
  };

  const publish = async (live) => {
    setField("saving", true);
    try {
      await axios.patch(`${API}/marketplace/products/${productId}/publish`, { published: live }, { withCredentials: true });
      toast.success(live ? "Product is now live!" : "Saved as draft");
      onSave?.();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to publish"));
    } finally {
      setField("saving", false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="neo-card bg-background w-full max-w-2xl my-8 relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto">
            {STEPS.map((s, idx) => (
              <div key={idx} className={`flex items-center gap-1 text-xs font-black uppercase whitespace-nowrap px-2 py-1 border-2 border-black ${idx === step ? "bg-primary text-primary-foreground" : idx < step ? "bg-pastel-mint" : "bg-muted text-muted-foreground"
                }`}>
                <s.icon className="w-3 h-3" /> {s.label}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <h3 className="font-black uppercase text-lg mb-2">Product Details</h3>
              <div>
                <label className="text-xs font-bold block mb-1">Title *</label>
                <input className="neo-input w-full" value={title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. AI SaaS Boilerplate" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Tagline *</label>
                <input className="neo-input w-full" value={tagline} onChange={(e) => setField("tagline", e.target.value)} placeholder="One-liner value prop" />
                <p className="text-[11px] text-muted-foreground mt-1">Minimum 10 characters</p>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Category</label>
                <select className="neo-input w-full" value={category} onChange={(e) => setField("category", e.target.value)}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Currency *</label>
                  <select className="neo-input w-full" value={currency} onChange={(e) => setField("currency", e.target.value)}>
                    {["INR", "USD", "EUR", "GBP"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Source Price *</label>
                  <input type="number" min="1" max="1000" step="0.01" className="neo-input w-full" value={sourcePrice} onChange={(e) => setField("sourcePrice", e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">Min ₹1 · Max ₹1,000</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={setupAvailable} onChange={(e) => setField("setupAvailable", e.target.checked)} className="w-4 h-4" />
                    Offer setup service?
                  </label>
                </div>
              </div>
              {setupAvailable && (
                <div className="space-y-3 neo-card p-3 bg-pastel-yellow/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Setup Price ({currency})</label>
                      <input type="number" min="1" max="1000" step="0.01" className="neo-input w-full" value={setupPrice} onChange={(e) => setField("setupPrice", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Delivery (days)</label>
                      <input type="number" min="1" className="neo-input w-full" value={setupDays} onChange={(e) => setField("setupDays", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Setup Description</label>
                    <textarea className="neo-input w-full resize-none" rows={2} value={setupDesc} onChange={(e) => setField("setupDesc", e.target.value)} placeholder="What's included in setup?" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold block mb-1">GitHub Repo URL (optional)</label>
                <input className="neo-input w-full" value={githubRepo} onChange={(e) => setField("githubRepo", e.target.value)} placeholder="https://github.com/owner/repo" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Demo Video URL (optional)</label>
                <input className="neo-input w-full" value={demoVideo} onChange={(e) => setField("demoVideo", e.target.value)} placeholder="YouTube or Loom URL" />
              </div>
              <button onClick={saveStep1} disabled={!isStep1Valid || saving} className="neo-btn neo-btn-primary px-6 py-2 font-black inline-flex items-center gap-2 disabled:opacity-50">
                Save & Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-black uppercase text-lg mb-2">Description</h3>
              <textarea
                className="neo-input w-full resize-none"
                rows={8}
                value={description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Markdown description (min 50 chars). Explain features, tech stack, how to run..."
              />
              <p className="text-xs text-muted-foreground">{description.length} chars {isStep2Valid ? "✓" : "(min 50)"}</p>
              <div className="flex items-center gap-2">
                <button onClick={saveStep2} disabled={!isStep2Valid || saving} className="neo-btn neo-btn-primary px-6 py-2 font-black inline-flex items-center gap-2 disabled:opacity-50">
                  Save & Continue <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setField("step", 0)} className="neo-btn neo-btn-secondary px-4 py-2 text-sm font-bold">Back</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-black uppercase text-lg mb-2">Screenshots</h3>
              <p className="text-xs text-muted-foreground mb-2">At least 1 required before publishing. Up to 5.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {screenshots.map((url, idx) => (
                  <div key={idx} className="relative w-24 h-24 border-2 border-black">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {screenshots.length < 5 && (
                  <label className="w-24 h-24 border-2 border-dashed border-foreground flex items-center justify-center cursor-pointer hover:bg-muted">
                    <Image className="w-6 h-6 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadScreenshots(e.target.files)} />
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setField("step", 3)} disabled={!isStep3Valid} className="neo-btn neo-btn-primary px-6 py-2 font-black inline-flex items-center gap-2 disabled:opacity-50">
                  Save & Continue <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setField("step", 1)} className="neo-btn neo-btn-secondary px-4 py-2 text-sm font-bold">Back</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="font-black uppercase text-lg mb-2">Source ZIP</h3>
              <p className="text-xs text-muted-foreground mb-2">Upload your source code as a .zip (max 500 MB).</p>
              <input type="file" accept=".zip" className="hidden" ref={zipRef} onChange={(e) => e.target.files?.[0] && uploadZip(e.target.files[0])} />
              <button onClick={() => zipRef.current?.click()} className="neo-btn neo-btn-secondary px-6 py-3 font-black inline-flex items-center gap-2">
                <Upload className="w-4 h-4" /> Select ZIP
              </button>
              {uploadProgress > 0 && (
                <div className="w-full bg-muted border-2 border-black h-4">
                  <div className="bg-primary h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => setField("step", 4)} className="neo-btn neo-btn-primary px-6 py-2 font-black inline-flex items-center gap-2 disabled:opacity-50">
                  Skip & Preview <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setField("step", 2)} className="neo-btn neo-btn-secondary px-4 py-2 text-sm font-bold">Back</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-black uppercase text-lg mb-2">Preview & Publish</h3>
              <div className="neo-card p-4 bg-muted/20">
                <p className="font-black text-sm mb-1">{title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground mb-2">{tagline}</p>
                <p className="text-sm font-black text-primary">
                  {(parseFloat(sourcePrice || 0)).toLocaleString("en-IN", { style: "currency", currency: currency || "INR" })}
                  {setupAvailable && <> + {(parseFloat(setupPrice || 0)).toLocaleString("en-IN", { style: "currency", currency: currency || "INR" })} setup</>}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] font-black uppercase bg-foreground text-background px-2 py-0.5">{category}</span>
                  {setupAvailable && <span className="text-[10px] font-black uppercase bg-pastel-yellow px-2 py-0.5 border border-black">SETUP</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => publish(true)} disabled={saving} className="neo-btn neo-btn-primary px-6 py-2 font-black inline-flex items-center gap-2 disabled:opacity-50">
                  Go Live
                </button>
                <button onClick={() => publish(false)} disabled={saving} className="neo-btn neo-btn-secondary px-6 py-2 font-black disabled:opacity-50">
                  Save as Draft
                </button>
                <button onClick={() => setField("step", 3)} className="neo-btn neo-btn-secondary px-4 py-2 text-sm font-bold">Back</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
