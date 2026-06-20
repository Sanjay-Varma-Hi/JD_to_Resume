import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BaseResume from "@/models/BaseResume";
import GeneratedResume from "@/models/GeneratedResume";
import { generateTailoredResume } from "@/lib/deepseek";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

export const maxDuration = 60; // Allow longer execution time on Vercel for AI requests

export async function POST(request: Request) {
  try {
    const { jobDescription, specialInstructions, emailDraft } = await request.json();

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    await dbConnect();
    
    const baseResumeDoc = await BaseResume.findOne().sort({ updatedAt: -1 });
    if (!baseResumeDoc) {
      return NextResponse.json({ error: "Base resume not found. Please create one first." }, { status: 400 });
    }

    // Extract email subject from draft
    let emailSubject = "";
    if (emailDraft) {
      const firstLine = emailDraft.split("\n")[0].trim();
      if (firstLine.toLowerCase().startsWith("subject:")) {
        emailSubject = firstLine.substring(8).trim();
      } else {
        emailSubject = firstLine;
      }
    }

    const userPrompt = buildUserPrompt(baseResumeDoc.content, jobDescription, specialInstructions, emailSubject);
    
    // Call DeepSeek AI
    const aiResponse = await generateTailoredResume(SYSTEM_PROMPT, userPrompt);
    
    // Save generated resume to history
    const generatedResume = await GeneratedResume.create({
      jobDescription,
      specialInstructions,
      detectedCompany: aiResponse.detectedCompany,
      detectedRole: aiResponse.detectedRole,
      atsSummary: aiResponse.atsMatchSummary,
      atsScoreBefore: aiResponse.atsScoreBefore,
      atsScoreAfter: aiResponse.atsScoreAfter,
      missingKeywords: aiResponse.missingKeywords,
      resumeMarkdown: aiResponse.resumeMarkdown,
      resumeJson: aiResponse.resumeJson,
      emailDraft: aiResponse.emailDraft || aiResponse.email_draft,
    });

    return NextResponse.json({ success: true, result: generatedResume }, { status: 200 });
  } catch (error: any) {
    console.error("Error generating resume:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate resume" 
    }, { status: 500 });
  }
}
