import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Applicant from '@/models/Applicant';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic'; // Prevent static building caching on seed

export async function GET() {
  try {
    await dbConnect();

    // Clear existing data to prevent duplicates during testing
    await Job.deleteMany({});
    await Applicant.deleteMany({});
    await User.deleteMany({});

    // 1. Seed Auth Users
    const passwordHash = await bcrypt.hash("password", 10);
    const usersData = [
      { name: "John Recruiter", email: "recruiter@example.com", password: passwordHash, role: "Recruiter" },
      { name: "Jane Candidate", email: "candidate@example.com", password: passwordHash, role: "Candidate" }
    ];
    await User.insertMany(usersData);

    // 2. Seed Jobs
    const jobsData = [
      { title: "Senior Frontend Developer", department: "Engineering", location: "Remote", description: "Looking for an expert React dev.", skills: ["React", "TypeScript", "Next.js"], status: "Active" },
      { title: "Data Scientist", department: "AI/ML", location: "New York", description: "AI specialist with NLP experience.", skills: ["Python", "TensorFlow", "NLP"], status: "Active" },
      { title: "Product Manager", department: "Product", location: "San Francisco", description: "Lead product development.", skills: ["Agile", "Strategy", "Scrum"], status: "Active" }
    ];

    const insertedJobs = await Job.insertMany(jobsData);

    // 2. Seed Applicants linked to the jobs created above
    const applicantsData = [
      { name: "Alex Rivera", role: "Senior Frontend Developer", jobId: insertedJobs[0]._id, score: 92, status: "Shortlisted", source: "LinkedIn", skills: ["React", "TypeScript", "Node.js"], experience: "7 years" },
      { name: "Priya Patel", role: "Data Scientist", jobId: insertedJobs[1]._id, score: 88, status: "Shortlisted", source: "Internal Pool", skills: ["Python", "ML", "TensorFlow"], experience: "5 years" },
      { name: "Marcus Chen", role: "Product Manager", jobId: insertedJobs[2]._id, score: 75, status: "In Review", source: "Indeed", skills: ["Strategy", "Analytics", "Agile"], experience: "8 years" },
      { name: "Sofia Andersen", role: "UX Designer", jobId: insertedJobs[0]._id, score: 71, status: "In Review", source: "Direct Apply", skills: ["Figma", "Research", "Prototyping"], experience: "4 years" },
      { name: "Emma Wilson", role: "Senior Frontend Developer", jobId: insertedJobs[0]._id, score: 90, status: "Shortlisted", source: "Internal Pool", skills: ["React", "Vue", "CSS"], experience: "6 years" },
      { name: "Raj Mehta", role: "Data Scientist", jobId: insertedJobs[1]._id, score: 82, status: "In Review", source: "Indeed", skills: ["Python", "K8s", "Docker"], experience: "5 years" }
    ];

    await Applicant.insertMany(applicantsData);

    return NextResponse.json({ success: true, message: "Database seeded successfully with base data!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
