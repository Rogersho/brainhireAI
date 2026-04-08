import mongoose, { Schema } from "mongoose";

export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Recruiter", "Candidate"], default: "Candidate" },
    savedJobs: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
    resumeText: { type: String },
    skills: { type: [String], default: [] },
    aiAnalysis: {
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] }
    }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
