import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import Applicant from '@/models/Applicant';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid job ID' },
                { status: 400 }
            );
        }

        await dbConnect();
        const job = await Job.findById(id);

        if (!job) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        // Get applicant count for this job
        const applicantCount = await Applicant.countDocuments({ jobId: id });

        return NextResponse.json({
            success: true,
            data: {
                ...job.toObject(),
                applicantCount,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid job ID' },
                { status: 400 }
            );
        }

        // Authentication & Ownership Check
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const job = await Job.findById(id);
        if (!job) {
            return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
        }

        // Only the creator can update the job
        if (job.createdBy.toString() !== user._id.toString()) {
            return NextResponse.json({ success: false, error: 'You do not have permission to edit this job' }, { status: 403 });
        }

        // Update the job
        const updatedJob = await Job.findByIdAndUpdate(
            id,
            {
                title: body.title,
                department: body.department,
                location: body.location,
                description: body.description,
                skills: body.skills,
                status: body.status,
            },
            { new: true, runValidators: true }
        );

        return NextResponse.json({ success: true, data: updatedJob });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid job ID' },
                { status: 400 }
            );
        }

        // Authentication & Ownership Check
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const job = await Job.findById(id);
        if (!job) {
            return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
        }

        // Only the creator can delete the job
        if (job.createdBy.toString() !== user._id.toString()) {
            return NextResponse.json({ success: false, error: 'You do not have permission to delete this job' }, { status: 403 });
        }

        // Delete the job
        await Job.findByIdAndDelete(id);

        // Delete all applicants for this job
        await Applicant.deleteMany({ jobId: id });

        return NextResponse.json({
            success: true,
            data: { message: 'Job deleted successfully' },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
