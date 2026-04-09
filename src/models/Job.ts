import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJob extends Document {
  title: string;
  department: string;
  location: string;
  description: string;
  skills: string[];
  status: 'Active' | 'Paused' | 'Closed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, default: '' },
    skills: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Closed'],
      default: 'Active',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times in Next.js
const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
