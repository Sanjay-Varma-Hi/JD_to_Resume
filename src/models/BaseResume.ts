import mongoose, { Schema, Document } from "mongoose";

export interface IBaseResume extends Document {
  content: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
  updatedAt: Date;
}

const BaseResumeSchema: Schema = new Schema({
  content: { type: String, required: true },
  fileData: { type: String },
  fileName: { type: String },
  fileType: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.BaseResume || mongoose.model<IBaseResume>("BaseResume", BaseResumeSchema);
