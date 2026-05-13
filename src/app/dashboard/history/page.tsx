"use client";

import { useState, useEffect } from "react";
import { History, Trash2, ChevronDown, ChevronUp, Clock, Building, Briefcase } from "lucide-react";
import ResumePreview from "@/components/ResumePreview";

interface HistoryItem {
  _id: string;
  jobDescription: string;
  specialInstructions: string;
  detectedCompany: string;
  detectedRole: string;
  atsSummary: string;
  missingKeywords: string[];
  resumeMarkdown: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this generated resume?")) return;

    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item._id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <History className="text-blue-600 dark:text-blue-400 w-8 h-8" />
          Generation History
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-2">
          View, copy, or download your previously generated tailored resumes.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-zinc-900/30">
          <History className="w-12 h-12 text-slate-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-zinc-200 mb-2">
            No History Yet
          </h3>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Resumes you generate will appear here for easy access.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div 
              key={item._id}
              className="glass-card rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden transition-all duration-200"
            >
              <div 
                className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex items-center justify-between"
                onClick={() => toggleExpand(item._id)}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      {item.detectedRole || "Unknown Role"}
                    </span>
                    <span className="text-slate-300 dark:text-zinc-600">•</span>
                    <span className="text-slate-600 dark:text-zinc-300 truncate flex items-center gap-1.5 text-sm">
                      <Building className="w-4 h-4 text-slate-400" />
                      {item.detectedCompany || "Unknown Company"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                    {item.specialInstructions && (
                      <span className="truncate max-w-[200px] md:max-w-md hidden sm:inline-block">
                        <strong>Instructions:</strong> {item.specialInstructions}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={(e) => handleDelete(item._id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400">
                    {expandedId === item._id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>
              
              {expandedId === item._id && (
                <div className="p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30">
                  <ResumePreview data={item} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
