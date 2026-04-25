import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "Candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await req.json();
    await dbConnect();

    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const index = user.savedJobs.indexOf(jobId);
    let action = '';

    if (index === -1) {
      user.savedJobs.push(jobId);
      action = 'saved';
    } else {
      user.savedJobs.splice(index, 1);
      action = 'removed';
    }

    await user.save();
    return NextResponse.json({ success: true, action, savedJobs: user.savedJobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
