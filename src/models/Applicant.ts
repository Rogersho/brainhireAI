import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApplicant extends Document {
  name: string;
  jobId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  role: string; 
  score: number;
  aiStrengths?: string;
  aiGaps?: string;
  aiRecommendation?: string;
  status: 'Shortlisted' | 'In Review' | 'Pending' | 'Rejected' | 'Hired';
  source: string;
  skills: string[];
  experience: string;
  resumeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, required: true },
    score: { type: Number, default: 0 },
    aiStrengths: { type: String, default: '' },
    aiGaps: { type: String, default: '' },
    aiRecommendation: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Shortlisted', 'In Review', 'Pending', 'Rejected', 'Hired'],
      default: 'Pending',
    },
    source: { type: String, required: true },
    skills: { type: [String], default: [] },
    experience: { type: String, required: true },
    resumeUrl: { type: String },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times in Next.js
const Applicant: Model<IApplicant> = mongoose.models.Applicant || mongoose.model<IApplicant>('Applicant', ApplicantSchema);

export default Applicant;
