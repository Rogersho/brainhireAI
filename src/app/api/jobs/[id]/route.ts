import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Applicant from '@/models/Applicant';
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

        await dbConnect();

        // Update the job (exclude certain fields)
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

        if (!updatedJob) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

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

        await dbConnect();

        // Delete the job
        const deletedJob = await Job.findByIdAndDelete(id);

        if (!deletedJob) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        // Optional: Delete all applicants for this job
        await Applicant.deleteMany({ jobId: id });

        return NextResponse.json({
            success: true,
            data: { message: 'Job deleted successfully', job: deletedJob },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
