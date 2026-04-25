import mongoose, { Schema } from "mongoose";

export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Recruiter", "Candidate"], default: "Candidate" },
    savedJobs: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
    createdJobs: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
    resumeText: { type: String },
    resumeHash: { type: String }, // Hash of resume for cache validation
    resumeCachedAt: { type: Date }, // When the CV was last analyzed
    skills: { type: [String], default: [] },
    aiAnalysis: {
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] }
    }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
