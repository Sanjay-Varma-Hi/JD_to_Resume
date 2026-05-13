import mongoose, { Schema, Document } from "mongoose";

export interface IGeneratedResume extends Document {
  jobDescription: string;
  specialInstructions?: string;
  detectedCompany?: string;
  detectedRole?: string;
  atsSummary?: string;
  atsScoreBefore?: number;
  atsScoreAfter?: number;
  missingKeywords?: string[];
  resumeMarkdown?: string;
  resumeJson?: any;
  createdAt: Date;
}

const GeneratedResumeSchema: Schema = new Schema({
  jobDescription: { type: String, required: true },
  specialInstructions: { type: String },
  detectedCompany: { type: String },
  detectedRole: { type: String },
  atsSummary: { type: String },
  atsScoreBefore: { type: Number },
  atsScoreAfter: { type: Number },
  missingKeywords: { type: [String], default: [] },
  resumeMarkdown: { type: String },
  resumeJson: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.GeneratedResume || mongoose.model<IGeneratedResume>("GeneratedResume", GeneratedResumeSchema);
