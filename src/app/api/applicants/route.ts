import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Applicant from '@/models/Applicant';
import Job from '@/models/Job';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');
    const session = await getServerSession(authOptions);
    const filter: any = {};

    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      
      if (user && user.role === 'Recruiter') {
        const recruiterJobs = await Job.find({ createdBy: user._id }).select('_id');
        const jobIds = recruiterJobs.map((job: any) => job._id);
        
        if (jobId) {
          // Verify that the requested jobId belongs to this recruiter
          if (!jobIds.some(id => id.toString() === jobId)) {
             return NextResponse.json({ success: true, data: [] });
          }
          filter.jobId = jobId;
        } else {
          // If no specific job requested, show all their applicants
          filter.jobId = { $in: jobIds };
        }
      } else {
        // Candidates or other roles
        if (jobId) filter.jobId = jobId;
        if (userId) filter.userId = userId;
      }
    } else {
      // Unauthenticated - usually shouldn't happen for applicants list, but handle gracefully
      if (jobId) filter.jobId = jobId;
      if (userId) filter.userId = userId;
    }

    const applicants = await Applicant.find(filter)
      .populate('jobId')
      .populate('userId')
      .sort({ score: -1, createdAt: -1 });

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

    // Create notification for the job creator (recruiter)
    const job = await Job.findById(body.jobId);
    if (job && job.createdBy) {
      await Notification.create({
        userId: job.createdBy,
        icon: 'UserPlus',
        title: 'New Application',
        description: `${body.name} has applied for ${job.title}.`,
        type: 'info',
        read: false,
        link: `/applicants/${applicant._id}`
      });
    }

    return NextResponse.json({ success: true, data: applicant }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
