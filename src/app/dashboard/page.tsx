"use client";

import { useState } from "react";
import { Sparkles, FileText, Settings2, AlertCircle } from "lucide-react";
import ResumePreview from "@/components/ResumePreview";

import ResumeEditor from "@/components/ResumeEditor";

export default function GeneratorPage() {
  const [jd, setJd] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!jd.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, specialInstructions: instructions }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data.result);
      } else {
        setError(data.error || "Failed to generate resume");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Sparkles className="text-blue-600 dark:text-blue-400 w-8 h-8" />
          Generate Tailored Resume
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-2">
          Paste the job description below to generate an ATS-optimized version of your base resume.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Job Description
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y text-sm dark:text-zinc-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                Special Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Keep under 1 page, emphasize React and Python, don't change my summary..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y text-sm dark:text-zinc-200"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-3 animate-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !jd.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group shadow-lg shadow-blue-500/20"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  AI is crafting your resume...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Generate Tailored Resume
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results / Preview */}
        <div className="lg:h-full">
          {result ? (
            <ResumePreview data={result} />
          ) : (
            <div className="h-full min-h-[400px] glass-card rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-zinc-900/30">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-zinc-200 mb-2">
                Waiting for Input
              </h3>
              <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-xs mx-auto">
                Paste a job description and click generate to see your tailored resume preview here.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Resume Editor Full Width Section */}
      {result && (
        <div className="pt-8 border-t border-slate-200 dark:border-zinc-800">
          <ResumeEditor data={result} />
        </div>
      )}
    </div>
  );
}
