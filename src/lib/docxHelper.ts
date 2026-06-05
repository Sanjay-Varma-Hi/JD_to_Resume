import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopPosition,
  TabStopType,
} from "docx";

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "999999" },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 21,
        font: "Arial",
        color: "222222",
      }),
    ],
  });
}

export async function generateDocxBlob(data: any): Promise<Blob> {
  const json = data.resumeJson;
  if (!json) throw new Error("No resumeJson data");

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
          size: 42,
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
          size: 21,
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
        bottom: { style: BorderStyle.SINGLE, size: 18, color: "1a1a1a" },
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
        spacing: { after: 120, line: 396, lineRule: "auto" },
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
  const parsedSkills = (json.skills || []).map((s: string) => {
    const colonIdx = s.indexOf(":");
    if (colonIdx > -1) {
      return { category: s.substring(0, colonIdx).trim(), values: s.substring(colonIdx + 1).trim() };
    }
    return { category: "", values: s };
  });

  if (parsedSkills.length > 0) {
    children.push(sectionHeading("Technical Skills"));
    parsedSkills.forEach((skill: any) => {
      if (skill.category) {
        children.push(
          new Paragraph({
            spacing: { after: 40, line: 396, lineRule: "auto" },
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
            spacing: { after: 40, line: 396, lineRule: "auto" },
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
    json.experience.forEach((exp: any) => {
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
              size: 18,
              font: "Arial",
              color: "555555",
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: exp.title || "",
              italics: true,
              size: 18,
              font: "Arial",
              color: "444444",
            }),
          ],
        })
      );
      if (exp.bullets) {
        exp.bullets.forEach((bullet: string) => {
          children.push(
            new Paragraph({
              spacing: { after: 40, line: 396, lineRule: "auto" },
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
    json.projects.forEach((proj: any) => {
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
            size: 18,
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
        proj.bullets.forEach((bullet: string) => {
          children.push(
            new Paragraph({
              spacing: { after: 40, line: 396, lineRule: "auto" },
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
    json.education.forEach((edu: any) => {
      children.push(
        new Paragraph({
          spacing: { after: 40, line: 396, lineRule: "auto" },
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
              size: 18,
              font: "Arial",
              color: "555555",
            }),
            new TextRun({ text: "\t" }),
            new TextRun({
              text: edu.dates || "",
              bold: true,
              size: 18,
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
    json.certifications.forEach((cert: string) => {
      children.push(
        new Paragraph({
          spacing: { after: 40, line: 396, lineRule: "auto" },
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

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 840,
              bottom: 720,
              left: 840,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function getResumeJsonFromDOM(element: HTMLElement): any {
  // Grab name, title, contact
  const h1 = element.querySelector("h1");
  const name = h1?.textContent?.trim() || "";
  
  const headerDiv = h1?.parentElement;
  const pTags = headerDiv ? Array.from(headerDiv.querySelectorAll("p")) : [];
  const title = pTags[0]?.textContent?.trim() || "";
  const contact = pTags[1]?.textContent?.trim() || "";

  // Headings
  const headings = Array.from(element.querySelectorAll("h2"));
  
  // Summary
  const summaryHeading = headings.find(h => h.textContent?.toUpperCase().includes("SUMMARY"));
  const summary = summaryHeading?.nextElementSibling?.textContent?.trim() || "";

  // Skills
  const skillsHeading = headings.find(h => h.textContent?.toUpperCase().includes("SKILLS"));
  const skills: string[] = [];
  const table = skillsHeading?.nextElementSibling;
  if (table && table.tagName === "TABLE") {
    const rows = table.querySelectorAll("tr");
    rows.forEach(row => {
      const tds = row.querySelectorAll("td");
      if (tds.length === 2) {
        skills.push(`${tds[0].textContent?.trim()}: ${tds[1].textContent?.trim()}`);
      } else if (tds.length === 1) {
        skills.push(tds[0].textContent?.trim() || "");
      }
    });
  }

  // Experience
  const expHeading = headings.find(h => h.textContent?.toUpperCase().includes("EXPERIENCE"));
  const experience: any[] = [];
  const expDiv = expHeading?.nextElementSibling;
  if (expDiv && expDiv.tagName === "DIV") {
    const jobs = expDiv.querySelectorAll(":scope > div");
    jobs.forEach(job => {
      const topDiv = job.firstElementChild;
      const company = topDiv?.querySelector("span:first-child")?.textContent?.trim() || "";
      const dates = topDiv?.querySelector("span:last-child")?.textContent?.trim() || "";
      const titleDiv = topDiv?.nextElementSibling;
      const title = titleDiv?.textContent?.trim() || "";
      const ul = titleDiv?.nextElementSibling;
      const bullets: string[] = [];
      if (ul && ul.tagName === "UL") {
        ul.querySelectorAll("li").forEach(li => {
          bullets.push(li.textContent?.trim() || "");
        });
      }
      experience.push({ company, dates, title, bullets });
    });
  }

  // Projects
  const projHeading = headings.find(h => h.textContent?.toUpperCase().includes("PROJECTS"));
  const projects: any[] = [];
  const projDiv = projHeading?.nextElementSibling;
  if (projDiv && projDiv.tagName === "DIV") {
    const projs = projDiv.querySelectorAll(":scope > div");
    projs.forEach(p => {
      const topSpan = p.querySelector("span:first-of-type");
      const name = topSpan?.textContent?.trim() || "";
      const descSpan = topSpan?.nextElementSibling;
      const description = descSpan?.textContent ? descSpan.textContent.trim().replace(/^—\s*/, "") : "";
      const ul = p.querySelector("ul");
      const bullets: string[] = [];
      if (ul) {
        ul.querySelectorAll("li").forEach(li => {
          bullets.push(li.textContent?.trim() || "");
        });
      }
      projects.push({ name, description, bullets });
    });
  }

  // Education
  const eduHeading = headings.find(h => h.textContent?.toUpperCase().includes("EDUCATION"));
  const education: any[] = [];
  const eduDiv = eduHeading?.nextElementSibling;
  if (eduDiv && eduDiv.tagName === "DIV") {
    const edus = eduDiv.querySelectorAll(":scope > div");
    edus.forEach(e => {
      const leftDiv = e.firstElementChild;
      const degree = leftDiv?.querySelector("span:first-child")?.textContent?.trim() || "";
      const instSpan = leftDiv?.querySelector("span:last-child");
      const institution = instSpan?.textContent ? instSpan.textContent.trim().replace(/^—\s*/, "") : "";
      const dates = e.querySelector(":scope > span:last-child")?.textContent?.trim() || "";
      education.push({ degree, institution, dates });
    });
  }

  // Certifications
  const certHeading = headings.find(h => h.textContent?.toUpperCase().includes("CERTIFICATIONS"));
  const certifications: string[] = [];
  const certUl = certHeading?.nextElementSibling;
  if (certUl && certUl.tagName === "UL") {
    certUl.querySelectorAll("li").forEach(li => {
      certifications.push(li.textContent?.trim() || "");
    });
  }

  return {
    name,
    title,
    contact,
    summary,
    skills,
    experience,
    projects,
    education,
    certifications
  };
}
