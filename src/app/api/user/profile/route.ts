import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Candidate') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    // Support multiple file types
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload a PDF, DOC, DOCX, or CSV file.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Just store the file name without any AI analysis
    user.resumeText = file.name; // Store filename as text
    user.skills = [];
    user.aiAnalysis = {
      strengths: [],
      weaknesses: [],
    };
    await user.save();

    return NextResponse.json({
      success: true,
      message: `${file.name} uploaded successfully!`,
      profile: {
        fileName: file.name,
      },
    });

  } catch (error: any) {
    console.error('Profile Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
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
