"use client";

import { useRef, useState } from "react";
import { Download, Edit3, Loader2 } from "lucide-react";

interface ResumeEditorProps {
  data: {
    detectedRole?: string;
    resumeJson?: {
      name?: string;
      title?: string;
      contact?: string;
      summary?: string;
      skills?: string[];
      experience?: Array<{
        title?: string;
        company?: string;
        location?: string;
        dates?: string;
        bullets?: string[];
      }>;
      projects?: Array<{
        name?: string;
        description?: string;
        bullets?: string[];
      }>;
      education?: Array<{
        degree?: string;
        institution?: string;
        dates?: string;
      }>;
      certifications?: string[];
    };
  };
}

export default function ResumeEditor({ data }: ResumeEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = contentRef.current;
      const opt = {
        margin: [10, 0, 10, 0],
        filename: `Resume_${data.resumeJson?.name?.replace(/\s+/g, "_") || "Tailored"}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          width: element.scrollWidth,
          windowWidth: element.scrollWidth,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css"], avoid: ".avoid-break" },
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const json = data.resumeJson;

  if (!json) {
    return (
      <div className="p-8 text-center text-slate-500 glass-card rounded-2xl">
        No structured resume data available. Please generate a new resume.
      </div>
    );
  }

  // Parse skills into category: values format
  const parsedSkills = (json.skills || []).map((s) => {
    const colonIdx = s.indexOf(":");
    if (colonIdx > -1) {
      return { category: s.substring(0, colonIdx).trim(), values: s.substring(colonIdx + 1).trim() };
    }
    return { category: "", values: s };
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm no-print">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-zinc-400">
          <Edit3 className="w-5 h-5 text-blue-500" />
          <p>
            <strong>Interactive Preview:</strong> Click anywhere on the resume below to edit text. Then download as PDF.
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md shadow-blue-500/20 disabled:opacity-70"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download as PDF
            </>
          )}
        </button>
      </div>

      {/* A4 Resume Container */}
      <div className="flex justify-center overflow-x-auto pb-8">
        <div
          ref={contentRef}
          className="bg-white text-black shadow-2xl print:shadow-none print-resume-container"
          style={{
            fontFamily: "'Arial', 'Helvetica', sans-serif",
            width: "794px",
            padding: "48px 56px",
            boxSizing: "border-box",
            lineHeight: "1.65",
            fontSize: "13px",
            backgroundColor: "white",
          }}
        >
          {/* ===== HEADER ===== */}
          <div style={{ textAlign: "center", borderBottom: "3px solid #1a1a1a", paddingBottom: "14px", marginBottom: "16px" }}>
            <h1
              style={{ fontSize: "28px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "3px", margin: 0, color: "#111" }}
              contentEditable
              suppressContentEditableWarning
            >
              {json.name || "CANDIDATE NAME"}
            </h1>
            <p
              style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginTop: "6px", letterSpacing: "1px" }}
              contentEditable
              suppressContentEditableWarning
            >
              {json.title || data.detectedRole || "Senior DevOps / SRE Engineer"}
            </p>
            <p
              style={{ fontSize: "13px", color: "#555", marginTop: "4px", letterSpacing: "0.5px" }}
              contentEditable
              suppressContentEditableWarning
            >
              {json.contact || "email@example.com | (555) 555-5555 | LinkedIn | GitHub"}
            </p>
          </div>

          {/* ===== PROFESSIONAL SUMMARY ===== */}
          {json.summary && (
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #999", paddingBottom: "3px", marginBottom: "6px", color: "#222", letterSpacing: "1px", pageBreakAfter: "avoid" }}>
                Professional Summary
              </h2>
              <p
                style={{ fontSize: "13px", color: "#333", lineHeight: "1.65" }}
                contentEditable
                suppressContentEditableWarning
              >
                {json.summary}
              </p>
            </div>
          )}

          {/* ===== TECHNICAL SKILLS (Table) ===== */}
          {parsedSkills.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #999", paddingBottom: "3px", marginBottom: "6px", color: "#222", letterSpacing: "1px", pageBreakAfter: "avoid" }}>
                Technical Skills
              </h2>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  {parsedSkills.map((skill, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      {skill.category ? (
                        <>
                          <td style={{ fontWeight: 700, padding: "6px 8px 6px 0", width: "30%", verticalAlign: "top", color: "#222" }}>
                            {skill.category}
                          </td>
                          <td
                            style={{ padding: "6px 0", color: "#444" }}
                            contentEditable
                            suppressContentEditableWarning
                          >
                            {skill.values}
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={2}
                          style={{ padding: "6px 0", color: "#444" }}
                          contentEditable
                          suppressContentEditableWarning
                        >
                          {skill.values}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== PROFESSIONAL EXPERIENCE ===== */}
          {json.experience && json.experience.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #999", paddingBottom: "3px", marginBottom: "8px", color: "#222", letterSpacing: "1px", pageBreakAfter: "avoid" }}>
                Professional Experience
              </h2>
              <div>
                {json.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span
                        style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {exp.company}
                      </span>
                      <span
                        style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {exp.dates}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: "12px", fontStyle: "italic", color: "#444", marginBottom: "4px" }}
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {exp.title}
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul style={{ margin: "4px 0 0 16px", padding: 0, listStyleType: "disc" }}>
                        {exp.bullets.map((bullet, j) => (
                          <li
                            key={j}
                            style={{ fontSize: "13px", color: "#333", marginBottom: "4px", lineHeight: "1.65" }}
                            contentEditable
                            suppressContentEditableWarning
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== PROJECTS ===== */}
          {json.projects && json.projects.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #999", paddingBottom: "3px", marginBottom: "8px", color: "#222", letterSpacing: "1px", pageBreakAfter: "avoid" }}>
                Projects
              </h2>
              <div>
                {json.projects.map((proj, i) => (
                  <div key={i} style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
                    <span
                      style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {proj.name}
                    </span>
                    {proj.description && (
                      <span
                        style={{ fontSize: "12px", color: "#555", marginLeft: "6px" }}
                        contentEditable
                        suppressContentEditableWarning
                      >
                        — {proj.description}
                      </span>
                    )}
                    {proj.bullets && proj.bullets.length > 0 && (
                      <ul style={{ margin: "4px 0 0 16px", padding: 0, listStyleType: "disc" }}>
                        {proj.bullets.map((bullet, j) => (
                          <li
                            key={j}
                            style={{ fontSize: "13px", color: "#333", marginBottom: "4px", lineHeight: "1.65" }}
                            contentEditable
                            suppressContentEditableWarning
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== EDUCATION ===== */}
          {json.education && json.education.length > 0 && (
            <div className="avoid-break" style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #999", paddingBottom: "3px", marginBottom: "8px", color: "#222", letterSpacing: "1px", pageBreakAfter: "avoid" }}>
                Education
              </h2>
              <div>
                {json.education.map((edu, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <div>
                      <span
                        style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {edu.degree}
                      </span>
                      <span style={{ fontSize: "12px", color: "#555", marginLeft: "6px" }}>
                        —{" "}
                        <span contentEditable suppressContentEditableWarning>
                          {edu.institution}
                        </span>
                      </span>
                    </div>
                    <span
                      style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {edu.dates}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== CERTIFICATIONS ===== */}
          {json.certifications && json.certifications.length > 0 && (
            <div className="avoid-break" style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #999", paddingBottom: "3px", marginBottom: "6px", color: "#222", letterSpacing: "1px", pageBreakAfter: "avoid" }}>
                Certifications
              </h2>
              <ul style={{ margin: "0 0 0 16px", padding: 0, listStyleType: "disc" }}>
                {json.certifications.map((cert, i) => (
                  <li
                    key={i}
                    style={{ fontSize: "13px", color: "#333", marginBottom: "4px", lineHeight: "1.65" }}
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
