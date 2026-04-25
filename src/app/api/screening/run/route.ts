import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Applicant from '@/models/Applicant';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';
import { screenCandidate } from '@/lib/gemini';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    const job = await Job.findById(jobId);

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Only the creator can run screening (or any recruiter if legacy job)
    if (job.createdBy && job.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Access denied - You did not create this job' }, { status: 403 });
    }

    const applicants = await Applicant.find({ jobId: job._id });

    if (applicants.length === 0) {
      return NextResponse.json({ success: false, error: 'No applicants to screen' }, { status: 400 });
    }

    // Perform screening for all applicants
    const screeningResults = [];
    
    for (const applicant of applicants) {
      try {
        const { score, strengths, gaps, recommendation, skills } = await screenCandidate(job.description, {
          name: applicant.name,
          role: applicant.role,
          skills: applicant.skills,
          experience: applicant.experience
        });

        applicant.score = score;
        applicant.aiStrengths = strengths;
        applicant.aiGaps = gaps;
        applicant.aiRecommendation = recommendation;
        applicant.skills = skills;
        
        console.log(`Saving screening for ${applicant.name}: Score=${score}, Recommendation=${recommendation}`);
        await applicant.save();
        
        screeningResults.push({ id: applicant._id, score, strengths, gaps, recommendation });
      } catch (err) {
        console.error(`Failed to screen applicant ${applicant._id}:`, err);
      }
    }

    // Get updated applicants list to return to UI
    const updatedApplicants = await Applicant.find({ jobId: job._id }).sort({ score: -1 });

    // Create notification
    await Notification.create({
      userId: user._id,
      icon: 'Brain',
      title: 'AI Screening Complete',
      description: `Successfully screened ${applicants.length} candidates for "${job.title}". Check the results now.`,
      type: 'success',
      read: false,
      link: `/applicants`
    });

    return NextResponse.json({
      success: true,
      data: screeningResults,
      applicants: updatedApplicants
    });
  } catch (error: any) {
    console.error('Screening API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
