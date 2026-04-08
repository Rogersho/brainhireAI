import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Applicant from '@/models/Applicant';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    const filter: any = {};
    if (jobId) filter.jobId = jobId;
    if (userId) filter.userId = userId;

    const applicants = await Applicant.find(filter).populate('jobId').sort({ score: -1, createdAt: -1 });
    
    return NextResponse.json({ success: true, data: applicants });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await dbConnect();
    const applicant = await Applicant.create(body);
    return NextResponse.json({ success: true, data: applicant }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
