"use client";

import { useRef, useState } from "react";
import { Download, Edit3, Loader2 } from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TabStopPosition,
  TabStopType,
  HeadingLevel,
} from "docx";

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

// Helper: section heading with bottom border
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        font: "Arial",
        color: "222222",
      }),
    ],
  });
}

export default function ResumeEditor({ data }: ResumeEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadDocx = async () => {
    const json = data.resumeJson;
    if (!json) return;
    setIsDownloadingDocx(true);

    try {
      const children: Paragraph[] = [];

      // ===== HEADER =====
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: (json.name || "CANDIDATE NAME").toUpperCase(),
              bold: true,
              size: 36,
              font: "Arial",
              color: "111111",
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: json.title || data.detectedRole || "Professional",
              bold: true,
              size: 22,
              font: "Arial",
              color: "333333",
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: "1a1a1a" },
          },
          children: [
            new TextRun({
              text: json.contact || "",
              size: 20,
              font: "Arial",
              color: "555555",
            }),
          ],
        })
      );

      // ===== PROFESSIONAL SUMMARY =====
      if (json.summary) {
        children.push(sectionHeading("Professional Summary"));
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: json.summary,
                size: 20,
                font: "Arial",
                color: "333333",
              }),
            ],
          })
        );
      }

      // ===== TECHNICAL SKILLS =====
      const parsedSkills = (json.skills || []).map((s) => {
        const colonIdx = s.indexOf(":");
        if (colonIdx > -1) {
          return { category: s.substring(0, colonIdx).trim(), values: s.substring(colonIdx + 1).trim() };
        }
        return { category: "", values: s };
      });

      if (parsedSkills.length > 0) {
        children.push(sectionHeading("Technical Skills"));
        parsedSkills.forEach((skill) => {
          if (skill.category) {
            children.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: `${skill.category}: `,
                    bold: true,
                    size: 20,
                    font: "Arial",
                    color: "222222",
                  }),
                  new TextRun({
                    text: skill.values,
                    size: 20,
                    font: "Arial",
                    color: "444444",
                  }),
                ],
              })
            );
          } else {
            children.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: skill.values,
                    size: 20,
                    font: "Arial",
                    color: "444444",
                  }),
                ],
              })
            );
          }
        });
      }

      // ===== PROFESSIONAL EXPERIENCE =====
      if (json.experience && json.experience.length > 0) {
        children.push(sectionHeading("Professional Experience"));
        json.experience.forEach((exp) => {
          // Company + Dates on same line using tab stops
          children.push(
            new Paragraph({
              spacing: { before: 160, after: 20 },
              tabStops: [
                { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
              ],
              children: [
                new TextRun({
                  text: exp.company || "",
                  bold: true,
                  size: 20,
                  font: "Arial",
                  color: "111111",
                }),
                new TextRun({
                  text: "\t",
                }),
                new TextRun({
                  text: exp.dates || "",
                  bold: true,
                  size: 19,
                  font: "Arial",
                  color: "555555",
                }),
              ],
            })
          );
          // Title (italic)
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: exp.title || "",
                  italics: true,
                  size: 19,
                  font: "Arial",
                  color: "444444",
                }),
              ],
            })
          );
          // Bullets
          if (exp.bullets) {
            exp.bullets.forEach((bullet) => {
              children.push(
                new Paragraph({
                  spacing: { after: 40 },
                  bullet: { level: 0 },
                  children: [
                    new TextRun({
                      text: bullet,
                      size: 20,
                      font: "Arial",
                      color: "333333",
                    }),
                  ],
                })
              );
            });
          }
        });
      }

      // ===== PROJECTS =====
      if (json.projects && json.projects.length > 0) {
        children.push(sectionHeading("Projects"));
        json.projects.forEach((proj) => {
          const projRuns: TextRun[] = [
            new TextRun({
              text: proj.name || "",
              bold: true,
              size: 20,
              font: "Arial",
              color: "111111",
            }),
          ];
          if (proj.description) {
            projRuns.push(
              new TextRun({
                text: ` — ${proj.description}`,
                size: 19,
                font: "Arial",
                color: "555555",
              })
            );
          }
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: projRuns,
            })
          );
          if (proj.bullets) {
            proj.bullets.forEach((bullet) => {
              children.push(
                new Paragraph({
                  spacing: { after: 40 },
                  bullet: { level: 0 },
                  children: [
                    new TextRun({
                      text: bullet,
                      size: 20,
                      font: "Arial",
                      color: "333333",
                    }),
                  ],
                })
              );
            });
          }
        });
      }

      // ===== EDUCATION =====
      if (json.education && json.education.length > 0) {
        children.push(sectionHeading("Education"));
        json.education.forEach((edu) => {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              tabStops: [
                { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
              ],
              children: [
                new TextRun({
                  text: edu.degree || "",
                  bold: true,
                  size: 20,
                  font: "Arial",
                  color: "111111",
                }),
                new TextRun({
                  text: ` — ${edu.institution || ""}`,
                  size: 19,
                  font: "Arial",
                  color: "555555",
                }),
                new TextRun({ text: "\t" }),
                new TextRun({
                  text: edu.dates || "",
                  bold: true,
                  size: 19,
                  font: "Arial",
                  color: "555555",
                }),
              ],
            })
          );
        });
      }

      // ===== CERTIFICATIONS =====
      if (json.certifications && json.certifications.length > 0) {
        children.push(sectionHeading("Certifications"));
        json.certifications.forEach((cert) => {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: cert,
                  size: 20,
                  font: "Arial",
                  color: "333333",
                }),
              ],
            })
          );
        });
      }

      // Build document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720,
                  right: 900,
                  bottom: 720,
                  left: 900,
                },
              },
            },
            children,
          },
        ],
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume_${json.name?.replace(/\s+/g, "_") || "Tailored"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX generation failed:", err);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = contentRef.current;
      const opt: any = {
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
      setIsDownloadingPdf(false);
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
            <strong>Interactive Preview:</strong> Click anywhere on the resume below to edit text. Then download as Word or PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadDocx}
            disabled={isDownloadingDocx || isDownloadingPdf}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-md shadow-blue-500/20 disabled:opacity-70"
          >
            {isDownloadingDocx ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                DOCX...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                DOCX
              </>
            )}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloadingDocx || isDownloadingPdf}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-md shadow-red-500/20 disabled:opacity-70"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                PDF
              </>
            )}
          </button>
        </div>
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
