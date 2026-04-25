import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const myJobsOnly = searchParams.get('myJobs') === 'true';

    await dbConnect();

    let query: any = {};

    const session = await getServerSession(authOptions);

    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      // Recruiters are isolated to their own postings only
      if (user && user.role === 'Recruiter') {
        query.createdBy = user._id;
      }
    } else if (myJobsOnly) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await Job.find(query).populate('createdBy', 'name email').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('Job creation - Session:', session?.user?.email);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in to create jobs' },
        { status: 401 }
      );
    }

    // Get user
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    console.log('Job creation - User found:', user?.email, 'Role:', user?.role);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only recruiters can create jobs
    if (user.role !== 'Recruiter') {
      console.log('Job creation - User role is not Recruiter:', user.role);
      return NextResponse.json(
        { success: false, error: `Only recruiters can create jobs. Your role is: ${user.role}` },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('Job creation - Request body:', body);

    // Validate required fields
    if (!body.title || !body.department || !body.location) {
      console.log('Job creation - Missing fields:', { title: body.title, department: body.department, location: body.location });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, department, location' },
        { status: 400 }
      );
    }

    // Create job with createdBy
    const job = await Job.create({
      title: body.title,
      department: body.department,
      location: body.location,
      description: body.description || '',
      skills: body.skills || [],
      status: body.status || 'Active',
      createdBy: user._id,
    });

    // Add to user's createdJobs
    user.createdJobs.push(job._id);
    await user.save();

    // Create notification
    await Notification.create({
      userId: user._id,
      icon: 'Briefcase',
      title: 'Job Successfully Posted',
      description: `Your job posting for "${job.title}" is now active.`,
      type: 'success',
      read: false,
      link: `/jobs`
    });

    // Populate and return
    await job.populate('createdBy', 'name email');

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error: any) {
    console.error('Job creation error:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create job', details: error.toString() },
      { status: 500 }
    );
  }
}
