"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Save, CheckCircle2, AlertCircle, UploadCloud, Trash2, FileBadge, Download } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

export default function BaseResumePage() {
  const [content, setContent] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Email Attachment State
  const [attachedResume, setAttachedResume] = useState<{
    exists: boolean;
    filename: string | null;
    ext: string | null;
    uploaded_at: string | null;
    attach_to_emails?: boolean;
  } | null>(null);

  useEffect(() => {
    fetchBaseResume();
    fetchAttachedResume();
  }, []);

  const fetchAttachedResume = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/current-resume`);
      if (res.ok) {
        const data = await res.json();
        setAttachedResume(data);
      }
    } catch (err) {
      console.error("Error fetching attached resume:", err);
    }
  };

  const fetchBaseResume = async () => {
    try {
      const res = await fetch("/api/base-resume");
      if (res.ok) {
        const data = await res.json();
        if (data.baseResume) {
          setContent(data.baseResume.content);
          setFileData(data.baseResume.fileData || null);
          setFileName(data.baseResume.fileName || null);
          setFileType(data.baseResume.fileType || null);
        }
      }
    } catch (error) {
      console.error("Error fetching base resume:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const res = await fetch("/api/base-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, fileData, fileName, fileType }),
      });

      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving base resume:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setContent(data.text);
        setFileData(data.fileData);
        setFileName(data.fileName);
        setFileType(data.fileType);
      } else {
        alert(data.error || "Failed to extract text from file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An error occurred while parsing the file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!content && !fileData) return;
    if (!confirm("Are you sure you want to clear your base resume? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/base-resume", { method: "DELETE" });
      if (res.ok) {
        setContent("");
        setFileData(null);
        setFileName(null);
        setFileType(null);
      } else {
        alert("Failed to delete base resume");
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
      alert("An error occurred while deleting the resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="text-blue-600 dark:text-blue-400" />
            Base Resume
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2">
            Store your master resume here. Edit manually or upload a PDF/DOCX to extract text and save the file.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            {isUploading ? "Processing..." : "Upload PDF/DOCX"}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting || (!content && !fileData)}
            className="bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-slate-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Universal Secondary Resume Upload */}
      <div className="mb-8 glass-card rounded-2xl p-6 border border-slate-200 dark:border-zinc-800">
        <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Global Email Attachment (PDF or DOCX)
        </label>
        <p className="text-sm text-slate-500 mb-4">
          Upload a static PDF or DOCX resume here. Every email you send via the Leads Dashboard will instantly attach this exact file.
        </p>

        {/* Attachment Toggle Switch */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
              Attach Resume to Outgoing Emails
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              When enabled, emails sent from the Leads Dashboard will include this file as an attachment.
            </span>
          </div>
          <button
            onClick={async () => {
              if (!attachedResume?.exists) {
                alert("Please upload a resume first before enabling attachment.");
                return;
              }
              const nextVal = !attachedResume.attach_to_emails;
              try {
                const res = await fetch(`${API_BASE_URL}/api/current-resume/toggle-attach`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ attach: nextVal })
                });
                if (res.ok) {
                  fetchAttachedResume();
                }
              } catch (err) {
                console.error("Failed to toggle attachment settings:", err);
              }
            }}
            disabled={!attachedResume?.exists}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              attachedResume?.attach_to_emails && attachedResume?.exists
                ? "bg-blue-600"
                : "bg-slate-200 dark:bg-zinc-700"
            } ${!attachedResume?.exists ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                attachedResume?.attach_to_emails && attachedResume?.exists ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {attachedResume?.exists ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20 mb-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <FileBadge className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-zinc-200 text-sm break-all">
                  {attachedResume.filename}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Type: {attachedResume.ext?.toUpperCase()} • Uploaded: {new Date(attachedResume.uploaded_at || "").toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to remove the global email attachment?")) return;
                try {
                  const res = await fetch(`${API_BASE_URL}/api/delete-resume`, { method: "DELETE" });
                  if (res.ok) {
                    fetchAttachedResume();
                  }
                } catch (err) {
                  console.error("Failed to delete attached resume:", err);
                }
              }}
              className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:text-red-400 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove File
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-sm text-slate-400 mb-4">
            No file attached yet.
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf,.docx"
            id="global-resume-upload"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append("file", file);
              
              try {
                const res = await fetch(`${API_BASE_URL}/api/upload-resume`, {
                  method: "POST",
                  body: formData
                });
                const data = await res.json();
                if (res.ok) {
                  alert("Success: " + data.message);
                  fetchAttachedResume();
                } else {
                  alert("Error: " + (data.detail || "Upload failed"));
                }
              } catch (err) {
                alert("Error connecting to backend to upload resume.");
              }
            }}
          />
          <label 
            htmlFor="global-resume-upload"
            className="px-5 py-2.5 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-medium rounded-xl cursor-pointer transition-colors border border-slate-200 dark:border-zinc-700 shadow-sm flex items-center gap-2 w-fit text-sm"
          >
            <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {attachedResume?.exists ? "Replace Attachment" : "Upload Static Resume (PDF/DOCX)"}
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-2xl h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className={`grid gap-6 ${fileData ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-4xl"}`}>
          
          {/* Editor Column */}
          <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 flex flex-col h-full">
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Extracted Text (AI Input)
            </h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your comprehensive base resume here or upload a file..."
              className="w-full flex-1 min-h-[500px] p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y font-mono text-sm dark:text-zinc-200"
            />
            
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === "success" && (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1 animate-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved successfully
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1 animate-in">
                    <AlertCircle className="w-4 h-4" />
                    Failed to save
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Base Resume
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Original Preview Column */}
          {fileData && (
            <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 flex flex-col h-full min-h-[500px]">
              <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-4 flex items-center gap-2 truncate">
                <FileBadge className="w-4 h-4 text-slate-400 shrink-0" />
                Original File: {fileName || "Resume"}
              </h3>
              
              <div className="flex-1 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center">
                {fileType === "application/pdf" || fileName?.endsWith(".pdf") ? (
                  <object
                    data={`data:application/pdf;base64,${fileData}`}
                    type="application/pdf"
                    className="w-full h-full min-h-[600px]"
                  >
                    <p className="text-center p-4 text-slate-500">Your browser does not support inline PDFs. Please download it to view.</p>
                  </object>
                ) : (
                  <div className="text-center p-8">
                    <FileBadge className="w-16 h-16 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-zinc-400 mb-6">
                      File <strong>{fileName}</strong> stored successfully.
                    </p>
                    <a
                      href={`data:${fileType || "application/octet-stream"};base64,${fileData}`}
                      download={fileName || "resume_document"}
                      className="inline-flex items-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-medium py-2 px-4 rounded-xl transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download to Preview
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
