"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, FileText, Settings2, AlertCircle, Mail, Send, Paperclip, Loader2 } from "lucide-react";
import ResumePreview from "@/components/ResumePreview";
import ResumeEditor from "@/components/ResumeEditor";
import { API_BASE_URL } from "@/lib/config";

export default function GeneratorPage() {
  const [jd, setJd] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Resume Editor Ref
  const resumeEditorRef = useRef<HTMLDivElement>(null);

  // Email Outreach States
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailErrorMessage, setEmailErrorMessage] = useState("");

  // Attachment states for the edited resume
  const [attachedBase64, setAttachedBase64] = useState<string | null>(null);
  const [attachedFilename, setAttachedFilename] = useState<string>("");
  const [isAttaching, setIsAttaching] = useState(false);

  // Populate email states and reset attachment when result changes
  useEffect(() => {
    setAttachedBase64(null);
    setAttachedFilename("");
    if (result && result.emailDraft) {
      const draft = result.emailDraft.trim();
      const lines = draft.split("\n");
      if (lines.length > 0 && lines[0].toLowerCase().startsWith("subject:")) {
        setEmailSubject(lines[0].substring(8).trim());
        setEmailBody(lines.slice(1).join("\n").trim());
      } else {
        setEmailSubject("Interested in the open role");
        setEmailBody(draft);
      }
    } else {
      setEmailSubject("");
      setEmailBody("");
    }
  }, [result]);

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

  const handleAttachNow = async () => {
    if (!resumeEditorRef.current) {
      alert("Resume preview element not found. Please ensure the resume is generated and visible.");
      return;
    }

    setIsAttaching(true);
    try {
      const { getResumeJsonFromDOM, generateDocxBlob } = await import("@/lib/docxHelper");
      const editedJson = getResumeJsonFromDOM(resumeEditorRef.current);
      const docxBlob = await generateDocxBlob({ ...result, resumeJson: editedJson });

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(docxBlob);
      const base64Docx = await base64Promise;

      setAttachedBase64(base64Docx);
      setAttachedFilename(`Resume_${editedJson.name?.replace(/\s+/g, "_") || "Tailored"}.docx`);
      alert("Latest edited resume attached successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to attach resume: " + (err.message || "Unknown error"));
    } finally {
      setIsAttaching(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      alert("Please enter a recipient email address.");
      return;
    }

    if (!attachedBase64) {
      alert("Please attach the resume first by clicking 'Attach Now'.");
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus("idle");
    setEmailErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/send-custom-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: recipientEmail,
          subject: emailSubject,
          body: emailBody,
          attachment_base64: attachedBase64,
          attachment_name: attachedFilename
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.status === "ok") {
        setEmailStatus("success");
        alert(responseData.message || "Email sent successfully!");
      } else {
        setEmailStatus("error");
        setEmailErrorMessage(responseData.detail || "Failed to send email");
        alert("Error: " + (responseData.detail || "Failed to send email"));
      }
    } catch (err: any) {
      console.error(err);
      setEmailStatus("error");
      setEmailErrorMessage(err.message || "An error occurred while sending the email.");
      alert("Error: " + (err.message || "An error occurred while sending the email."));
    } finally {
      setIsSendingEmail(false);
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
      
      {/* Email Outreach Block */}
      {result && (
        <div className="pt-8 border-t border-slate-200 dark:border-zinc-800 animate-fade-in-up">
          <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Email Outreach Draft
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Customize the AI-drafted outreach email and send it with the tailored resume (Word version) attached instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject Line"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-zinc-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Outreach Message
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y text-sm dark:text-zinc-200 leading-relaxed font-serif"
                placeholder="Write your email body here..."
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                {attachedBase64 ? (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/30">
                    <FileText className="w-4 h-4 text-green-500" />
                    Attached: <strong>{attachedFilename}</strong>
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    No resume attached yet.
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={handleAttachNow}
                  disabled={isAttaching || isSendingEmail}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg font-medium transition-colors border border-slate-200 dark:border-zinc-700 disabled:opacity-50 text-xs"
                >
                  {isAttaching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      Attaching...
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      {attachedBase64 ? "Attach Edited Resume Again" : "Attach Now"}
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail || isAttaching || !recipientEmail.trim() || !emailBody.trim() || !attachedBase64}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 w-full sm:w-auto justify-center"
              >
                {isSendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending Outreach...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Tailored Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Resume Editor Full Width Section */}
      {result && (
        <div className="pt-8 border-t border-slate-200 dark:border-zinc-800">
          <ResumeEditor data={result} editorRef={resumeEditorRef} />
        </div>
      )}
    </div>
  );
}
