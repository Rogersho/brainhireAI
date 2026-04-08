import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function analyzeResumeWithGemini(buffer: Buffer) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const base64 = buffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64,
      },
    },
    `You are an expert technical recruiter AI analyzing a candidate resume.
Extract all information and return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "extractedText": "the full resume text",
  "skills": ["skill1", "skill2", "skill3"],
  "strengths": ["A specific observable strength from the CV"],
  "weaknesses": ["A specific gap or improvement area based on the CV"]
}

Be specific and insightful. Skills should be technical and soft skills. Strengths 2-4 items, weaknesses 2-3 items.`,
  ]);

  const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Candidate') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a PDF.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const aiData = await analyzeResumeWithGemini(buffer);

    await dbConnect();
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.resumeText = aiData.extractedText || '';
    user.skills = aiData.skills || [];
    user.aiAnalysis = {
      strengths: aiData.strengths || [],
      weaknesses: aiData.weaknesses || [],
    };
    await user.save();

    return NextResponse.json({
      success: true,
      profile: {
        skills: user.skills,
        aiAnalysis: user.aiAnalysis,
      },
    });

  } catch (error: any) {
    console.error('Profile Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById((session.user as any).id).select('-password');
    return NextResponse.json({ success: true, data: user });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
