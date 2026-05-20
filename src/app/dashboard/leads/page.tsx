"use client";

import { useState, useEffect } from "react";
import { Sparkles, ExternalLink, Mail, CheckCircle2, Clock, RefreshCw, FileText, Trash2 } from "lucide-react";
import ResumePreview from "@/components/ResumePreview";
import ResumeEditor from "@/components/ResumeEditor";
import { API_BASE_URL } from "@/lib/config";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState<string | null>(null);
  const [editedEmail, setEditedEmail] = useState<string>("");
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  
  // Filters
  const [filterDevops, setFilterDevops] = useState(false);
  const [filterC2C, setFilterC2C] = useState(false);
  const [filterUSA, setFilterUSA] = useState(false);
  const [filterNotContacted, setFilterNotContacted] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("");

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads`);
      const data = await res.json();
      if (data.status === "ok") {
        setLeads(data.leads);
        if (data.leads.length > 0 && !selectedLeadId) {
          setSelectedLeadId(data.leads[0]._id);
          setEditedEmail(data.leads[0].email_draft || "");
        }
      } else {
        setError("Failed to fetch leads");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to FastAPI backend. Is it running on port 8000?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    const checkCooldown = () => {
      const lastScraped = localStorage.getItem("leads_last_scraped");
      if (lastScraped) {
        const timePassed = Date.now() - parseInt(lastScraped, 10);
        const timeLeft = Math.max(0, 3600 - Math.floor(timePassed / 1000));
        setCooldownLeft(timeLeft);
      }
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const triggerScrape = async () => {
    setIsScraping(true);
    try {
      await fetch(`${API_BASE_URL}/api/scrape`, { method: "POST" });
      localStorage.setItem("leads_last_scraped", Date.now().toString());
      setCooldownLeft(3600);
      setTimeout(() => {
        setIsScraping(false);
        fetchLeads();
      }, 5000);
    } catch (err) {
      console.error(err);
      setIsScraping(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/leads/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setLeads(leads.map(lead => lead._id === id ? { ...lead, status } : lead));
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  const sendEmail = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${id}/send-email`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_draft: editedEmail })
      });
      const data = await res.json();
      alert(data.message);
      if (data.status === "ok") {
        updateStatus(id, "contacted");
      }
    } catch (err) {
      console.error("Failed to send email");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  };

  const handleGenerateResume = async (lead: any) => {
    if (!lead.full_description) return;
    setIsGeneratingResume(lead._id);
    
    try {
      // 1. Generate the resume using the existing JD_to_Resume API
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobDescription: lead.full_description,
          specialInstructions: "Tailor the resume for this specific role." 
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 2. Save the generated resume to the database for this specific lead
        await fetch(`${API_BASE_URL}/api/leads/${lead._id}/resume`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: data.result })
        });
        
        // 3. Update local state to show it immediately
        setLeads(leads.map(l => l._id === lead._id ? { ...l, generated_resume: data.result } : l));
      } else {
        alert(data.error || "Failed to generate resume");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred while generating the resume");
    } finally {
      setIsGeneratingResume(null);
    }
  };

  const getLocalYYYYMMDD = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const displayedLeads = leads.filter(lead => {
    if (filterDevops && !lead.is_devops) return false;
    if (filterC2C && !lead.is_c2c) return false;
    if (filterUSA && !lead.is_remote) return false;
    if (filterNotContacted && lead.status === "contacted") return false;
    if (filterDate && getLocalYYYYMMDD(lead.scraped_at) !== filterDate) return false;
    return true;
  });

  const selectedLead = leads.find(l => l._id === selectedLeadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-8 h-8" />
            AI Lead Dashboard
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2">
            Review all scraped leads and send automated outreach emails.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={fetchLeads}
            className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl transition-colors flex items-center gap-2 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={triggerScrape}
            disabled={isScraping || cooldownLeft > 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {isScraping ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isScraping 
              ? "Starting Scraper..." 
              : cooldownLeft > 0 
                ? `Cooldown (${formatCooldown(cooldownLeft)})` 
                : "Find New Leads"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 shrink-0">
          {error}
        </div>
      )}

      {/* Main Split Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        
        {/* Left Pane: Lead List */}
        <div className="w-1/3 flex flex-col glass-card rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 space-y-3">
            <h2 className="font-semibold text-slate-700 dark:text-zinc-200">All Leads ({displayedLeads.length})</h2>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFilterDevops(!filterDevops)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${filterDevops ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
              >
                DevOps Only
              </button>
              <button 
                onClick={() => setFilterC2C(!filterC2C)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${filterC2C ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
              >
                C2C Only
              </button>
              <button 
                onClick={() => setFilterUSA(!filterUSA)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${filterUSA ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
              >
                USA Only
              </button>
              <button 
                onClick={() => setFilterNotContacted(!filterNotContacted)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${filterNotContacted ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
              >
                Not Contacted
              </button>
            </div>
            
            {/* Date Filter */}
            <div className="flex gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 outline-none hover:border-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {displayedLeads.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No leads match your filters.</div>
            ) : (
              displayedLeads.map((lead) => (
                <button
                  key={lead._id}
                  onClick={() => {
                    setSelectedLeadId(lead._id);
                    setEditedEmail(lead.email_draft || "");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedLeadId === lead._id
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm"
                      : "bg-white border-transparent hover:border-slate-200 dark:bg-zinc-900/30 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                      {lead.author_name}
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(lead.ai_score)}`}>
                      {lead.ai_score}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(lead.scraped_at).toLocaleDateString()}
                      </div>
                      {lead.status === "contacted" && (
                        <span className="text-emerald-500 font-medium">Contacted</span>
                      )}
                    </div>
                    {lead.search_role && (
                      <div className="text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2 py-1 rounded w-fit">
                        {lead.search_role}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Lead Details */}
        <div className="w-2/3 glass-card rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          {selectedLead ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {selectedLead.author_name}
                  </h2>
                  <div className="flex gap-3 items-center mb-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-700 font-medium">
                      <Mail className="w-3.5 h-3.5" />
                      {selectedLead.recruiter_email ? (
                        <a href={`mailto:${selectedLead.recruiter_email}`} className="hover:text-blue-600 dark:hover:text-blue-400">{selectedLead.recruiter_email}</a>
                      ) : "No email mentioned"}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(selectedLead.ai_score)}`}>
                      {selectedLead.ai_score}/100 Match Score
                    </span>
                    <a 
                      href={selectedLead.post_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/50"
                    >
                      View Original Post <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if(confirm("Are you sure you want to delete this lead? It will be hidden permanently, but the URL will be remembered so it isn't scraped again.")) {
                        updateStatus(selectedLead._id, "deleted");
                        setSelectedLeadId(null);
                      }
                    }}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl transition-colors flex items-center gap-2 font-medium border border-slate-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={() => sendEmail(selectedLead._id)}
                    disabled={selectedLead.status === "contacted"}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2 font-medium shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {selectedLead.status === "contacted" ? <CheckCircle2 className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                    {selectedLead.status === "contacted" ? "Already Emailed" : "Approve & Email"}
                  </button>
                </div>
              </div>

              {/* Detail Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Extracted Data Tags */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Extracted Requirements</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-sm border font-medium ${selectedLead.is_devops ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
                      {selectedLead.is_devops ? 'DevOps/SRE Role' : 'Not DevOps'}
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg text-sm border font-medium ${selectedLead.is_c2c ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
                      {selectedLead.is_c2c ? 'C2C/Contract' : 'W2/Full-time'}
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg text-sm border font-medium ${selectedLead.is_remote ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
                      {selectedLead.is_remote ? 'USA Allowed' : 'Outside USA'}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg text-sm border font-medium bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                      Experience: {selectedLead.experience_range || 'Not specified'}
                    </span>
                  </div>
                </div>

                {/* Skills */}
                {selectedLead.required_skills && selectedLead.required_skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.required_skills.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm rounded-lg border border-slate-200 dark:border-zinc-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">AI Analysis Summary</h3>
                  <div className="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 leading-relaxed">
                    {selectedLead.ai_summary || "No summary available."}
                  </div>
                </div>

                {/* Outreach Draft (Editable) */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Generated Outreach Email</h3>
                  <textarea
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full h-48 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30 whitespace-pre-wrap font-serif text-slate-800 dark:text-zinc-200 leading-relaxed shadow-inner outline-none focus:border-blue-400 resize-y"
                    placeholder="No draft available..."
                  />
                </div>
                
                {/* Raw Description (Collapsible/Scrollable) */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Original Raw Post</h3>
                  <div className="bg-slate-50 dark:bg-zinc-900/30 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-sm whitespace-pre-wrap h-48 overflow-y-auto mb-4">
                    {selectedLead.full_description}
                  </div>
                  
                  {/* Generate Resume Action */}
                  {!selectedLead.generated_resume ? (
                    <button
                      onClick={() => handleGenerateResume(selectedLead)}
                      disabled={isGeneratingResume === selectedLead._id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group shadow-lg shadow-blue-500/20"
                    >
                      {isGeneratingResume === selectedLead._id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          AI is analyzing JD & crafting your tailored resume...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Generate Tailored Resume for this Role
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      Resume successfully tailored and saved for this job post!
                    </div>
                  )}
                </div>

                {/* Resume Preview Box */}
                {selectedLead.generated_resume && (
                  <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Tailored Resume Preview</h3>
                      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                        <ResumePreview data={selectedLead.generated_resume} />
                      </div>
                    </div>
                    
                    {/* Resume Editor (PDF / DOCX Download) */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Export & Download</h3>
                      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                        <ResumeEditor data={selectedLead.generated_resume} />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-zinc-500 p-8 text-center">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a lead to view details</p>
              <p className="text-sm mt-2 max-w-sm">Click on any lead from the list on the left to see its AI analysis, required skills, and outreach email.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
