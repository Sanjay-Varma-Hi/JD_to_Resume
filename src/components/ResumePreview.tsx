"use client";

import { CheckCircle, XCircle, Copy, Download, Building, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

interface ResumePreviewProps {
  data: {
    detectedCompany?: string;
    detectedRole?: string;
    atsSummary?: string;
    atsScoreBefore?: number;
    atsScoreAfter?: number;
    missingKeywords?: string[];
    resumeMarkdown?: string;
  };
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[72px] h-[72px]">
        <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" className="text-slate-200 dark:text-zinc-700" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={radius} fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-slate-800 dark:text-zinc-100">{score}%</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}

export default function ResumePreview({ data }: ResumePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (data.resumeMarkdown) {
      navigator.clipboard.writeText(data.resumeMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (data.resumeMarkdown) {
      const element = document.createElement("a");
      const file = new Blob([data.resumeMarkdown], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = `Resume_${data.detectedCompany || "Tailored"}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const scoreBefore = data.atsScoreBefore ?? 0;
  const scoreAfter = data.atsScoreAfter ?? 0;
  const improvement = scoreAfter - scoreBefore;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ATS Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            ATS Match Summary
          </h3>
          <p className="text-sm text-slate-700 dark:text-zinc-300">
            {data.atsSummary || "Analysis complete."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="flex items-center gap-1 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-md text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              <Building className="w-3.5 h-3.5" />
              {data.detectedCompany || "Unknown Company"}
            </span>
            <span className="flex items-center gap-1 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-md text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              <Briefcase className="w-3.5 h-3.5" />
              {data.detectedRole || "Unknown Role"}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
          <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Missing Keywords
          </h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mb-3">
            Consider learning these or adding them if you have the experience:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.missingKeywords && data.missingKeywords.length > 0 ? (
              data.missingKeywords.map((kw, i) => (
                <span key={i} className="bg-white dark:bg-zinc-800 px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  {kw}
                </span>
              ))
            ) : (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">None detected!</span>
            )}
          </div>
        </div>
      </div>

      {/* Markdown Preview with ATS scores on LEFT */}
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          {/* ATS Scores on LEFT */}
          <div className="flex items-center gap-5 flex-wrap">
            <ScoreRing score={scoreBefore} label="Before" color="#f97316" />
            <ScoreRing score={scoreAfter} label="After" color={scoreAfter >= 90 ? "#22c55e" : "#3b82f6"} />
            <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${improvement > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"}`}>
              {improvement > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {improvement > 0 ? "+" : ""}{improvement}%
            </div>
          </div>

          {/* Buttons on RIGHT */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>

        {/* Markdown Content - full width now */}
        <div className="p-4 bg-white dark:bg-zinc-950 max-h-[600px] overflow-y-auto">
          <pre className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap font-mono">
            {data.resumeMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
}
