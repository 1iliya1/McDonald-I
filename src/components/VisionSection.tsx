import React, { useState } from "react";
import { Camera, Image as ImageIcon, Sparkles, Plus, AlertCircle, RefreshCw } from "lucide-react";
import { MenuItem } from "../types";

// Base64 mock visual patterns that match what Gemini can identify as burgers/sides/dessert/breakfast
// These are short valid small pixel base64 codes to send to backend if user didn't upload theirs!
const MOCK_IMAGES = {
  burger: "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADElEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // simple yellow dot
  fries: "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADElEQVR42mN8+Z8hAwAGegGA6vBv2wAAAABJRU5ErkJggg==",  // red dot
  mcmuffin: "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADElEQVR42mNkYGD4DwAEbQDAn948XgAAAABJRU5ErkJggg==", // wheat dot
  pie: "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADElEQVR42mNk+I+QDgADgwGAbX298QAAAABJRU5ErkJggg=="   // brown dot
};

interface VisionSectionProps {
  onAddToCart: (item: MenuItem) => void;
}

export function VisionSection({ onAddToCart }: VisionSectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    matchedItem: MenuItem;
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateVisionMatch = async (type: "burger" | "fries" | "mcmuffin" | "pie") => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Set mockup display icons
    const simulatedPreviews = {
      burger: "🍔 Big Mac® Photo Snapshot",
      fries: "🍟 Medium Fries Photo Snapshot",
      mcmuffin: "🍳 Egg McMuffin® Photo Snapshot",
      pie: "🥧 Warm Apple Pie Photo Snapshot"
    };
    setUploadedPreview(simulatedPreviews[type]);

    try {
      const response = await fetch("/api/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: MOCK_IMAGES[type] })
      });

      if (!response.ok) {
        throw new Error("Vision server error");
      }

      const data = await response.json();
      setResult(data);

    } catch (e: any) {
      console.error(e);
      setError("Unable to process the image scan. Ensure your backend is reachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setUploadedPreview(base64String);

      try {
        const response = await fetch("/api/ai/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64String })
        });

        if (!response.ok) {
          throw new Error("Unable to identify uploaded food");
        }

        const data = await response.json();
        setResult(data);

      } catch (e: any) {
        console.error(e);
        setError("Error connecting to Gemini Vision module. Try selecting one of the simulated models!");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-[#27251F] text-white rounded-2xl p-6 lg:p-8 border border-gray-800 shadow-xl max-w-7xl mx-auto my-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side Info */}
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-red rounded-full text-xs font-semibold text-white border border-[#FFC72C]">
            <Camera className="w-3.5 h-3.5 text-[#FFC72C]" />
            VISION ENGINE ACTIVE
          </div>
          <h2 className="font-display font-bold text-2xl lg:text-3xl leading-tight">
            Snap to order: <br/>
            <span className="text-brand-yellow">Photo food recognition</span>
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Spot a burger, fries, or McMuffin on a billboard, TV, or packaging? Upload a photo or use our pre-loaded simulator snapshots below. Our AI identifies the item instantly and lets you add it to your order.
          </p>

          {/* Preset Buttons for easy simulator sandbox testing */}
          <div className="space-y-2 pt-3">
            <h4 className="text-xs text-brand-yellow uppercase tracking-widest font-bold">
              Simulate Snapshot Scans (Test Sandbox)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => simulateVisionMatch("burger")}
                className="flex items-center gap-2 bg-gray-800/80 hover:bg-brand-red p-2.5 rounded-xl border border-gray-700/60 hover:border-brand-yellow text-xs transition-all text-left truncate cursor-pointer"
              >
                <span>🍔</span> Double Beef Mac
              </button>
              <button
                onClick={() => simulateVisionMatch("fries")}
                className="flex items-center gap-2 bg-gray-800/80 hover:bg-brand-red p-2.5 rounded-xl border border-gray-700/60 hover:border-brand-yellow text-xs transition-all text-left truncate cursor-pointer"
              >
                <span>🍟</span> Crispy Gold Fries
              </button>
              <button
                onClick={() => simulateVisionMatch("mcmuffin")}
                className="flex items-center gap-2 bg-gray-800/80 hover:bg-brand-red p-2.5 rounded-xl border border-gray-700/60 hover:border-brand-yellow text-xs transition-all text-left truncate cursor-pointer"
              >
                <span>🍳</span> Sausage McMuffin
              </button>
              <button
                onClick={() => simulateVisionMatch("pie")}
                className="flex items-center gap-2 bg-gray-800/80 hover:bg-brand-red p-2.5 rounded-xl border border-gray-700/60 hover:border-brand-yellow text-xs transition-all text-left truncate cursor-pointer"
              >
                <span>🥧</span> Baked Apple Pie
              </button>
            </div>
          </div>

          {/* Real Photo Upload Block */}
          <div className="pt-2">
            <label className="inline-flex items-center justify-center gap-2 w-full bg-brand-yellow hover:bg-[#e5b320] text-brand-dark px-4 py-3 rounded-xl font-display font-bold text-sm cursor-pointer transition-all border-2 border-transparent hover:scale-[1.02]">
              <ImageIcon className="w-4 h-4" />
              Upload real photo of McDonald's food
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Side Results viewport */}
        <div className="lg:col-span-7 bg-black/40 rounded-xl p-5 border border-gray-800 flex flex-col justify-between min-h-[300px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-brand-yellow/20 border-t-brand-yellow animate-spin" />
                <Camera className="w-6 h-6 text-brand-yellow absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-display font-semibold text-brand-yellow flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 animate-spin text-brand-red" />
                  Gemini Computer Vision analyzing features...
                </p>
                <p className="text-xs text-gray-400 mt-1">Comparing shapes against Golden Arches Menu matrix...</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <span className="text-xs text-gray-400">Scan Match Verdict</span>
                <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/20 font-mono">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex gap-4 items-start bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <div className="text-3xl bg-neutral-800 p-3 rounded-xl border border-gray-700 leading-none">
                  {result.matchedItem.image}
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold text-brand-yellow tracking-widest leading-none">
                    {result.matchedItem.category}
                  </span>
                  <h4 className="font-display font-bold text-lg text-white">
                    {result.matchedItem.name}
                  </h4>
                  <p className="text-xs text-gray-300 line-clamp-2 mt-1">
                    {result.matchedItem.description}
                  </p>
                  <p className="text-sm font-mono font-bold text-brand-yellow mt-2">
                    ${result.matchedItem.price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-brand-yellow font-semibold uppercase tracking-widest">
                  AI Analytical Breakdown
                </span>
                <p className="text-xs text-gray-300 leading-relaxed italic bg-black/20 p-3 rounded-lg border border-gray-800/80">
                  "{result.reasoning}"
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => onAddToCart(result.matchedItem)}
                  className="flex-1 bg-brand-red hover:bg-[#b51c12] text-white py-3 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all outline-none"
                >
                  <Plus className="w-4 h-4 text-brand-yellow" /> Add Identified Meal
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setUploadedPreview(null);
                  }}
                  className="bg-transparent border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-xs px-4 py-3 rounded-xl font-medium transition-all"
                >
                  Clear Results
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <AlertCircle className="w-8 h-8 text-brand-red" />
              <p className="text-sm font-bold text-brand-yellow">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  simulateVisionMatch("burger");
                }}
                className="text-xs text-white underline hover:no-underline flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try burger simulation instead
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-full text-brand-yellow inline-flex animate-bounce-slow">
                <Camera className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <p className="font-display font-medium text-sm text-gray-100">
                  Ready for scanning
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Select one of our preset snapshot simulators on the left, or upload a real snapshot of raw ingredients to see Google Gemini analyze visual textures and shape geometry.
                </p>
              </div>
            </div>
          )}

          {uploadedPreview && (
            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>Previewing selection:</span>
              <span className="font-mono text-[10px] text-brand-yellow truncate max-w-[200px]">
                {uploadedPreview.startsWith("data:") ? "custom_upload.jpg" : uploadedPreview}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
