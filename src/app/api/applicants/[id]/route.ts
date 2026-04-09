import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Applicant from '@/models/Applicant';
import mongoose from 'mongoose';
import Notification from '@/models/Notification';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid applicant ID' },
                { status: 400 }
            );
        }

        await dbConnect();
        const applicant = await Applicant.findById(id).populate('jobId').populate('userId');

        if (!applicant) {
            return NextResponse.json(
                { success: false, error: 'Applicant not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: applicant });
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
                { success: false, error: 'Invalid applicant ID' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Get the current applicant to check if status is changing
        const currentApplicant = await Applicant.findById(id);
        if (!currentApplicant) {
            return NextResponse.json(
                { success: false, error: 'Applicant not found' },
                { status: 404 }
            );
        }

        const isStatusChanging = body.status && body.status !== currentApplicant.status;

        // Update the applicant
        const updatedApplicant = await Applicant.findByIdAndUpdate(
            id,
            {
                name: body.name,
                role: body.role,
                status: body.status,
                score: body.score,
                skills: body.skills,
                experience: body.experience,
                resumeUrl: body.resumeUrl,
                source: body.source,
            },
            { new: true, runValidators: true }
        ).populate('jobId').populate('userId');

        if (!updatedApplicant) {
            return NextResponse.json(
                { success: false, error: 'Applicant not found' },
                { status: 404 }
            );
        }

        // Create notification for candidate if status updated
        if (isStatusChanging && updatedApplicant.userId) {
            const jobTitle = (updatedApplicant.jobId as any)?.title || 'your job application';
            let icon = 'Info';
            let type: 'info' | 'success' | 'warning' = 'info';
            
            if (body.status === 'Shortlisted') {
                icon = 'CheckCircle';
                type = 'success';
            } else if (body.status === 'Rejected') {
                icon = 'AlertCircle';
                type = 'warning';
            }

            await Notification.create({
                userId: updatedApplicant.userId,
                icon,
                title: 'Application Status Update',
                description: `Your application status for ${jobTitle} has been updated to: ${body.status}.`,
                type,
                read: false,
                link: '/candidate-dashboard/applications'
            });
        }

        return NextResponse.json({ success: true, data: updatedApplicant });
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
                { success: false, error: 'Invalid applicant ID' },
                { status: 400 }
            );
        }

        await dbConnect();

        const deletedApplicant = await Applicant.findByIdAndDelete(id);

        if (!deletedApplicant) {
            return NextResponse.json(
                { success: false, error: 'Applicant not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { message: 'Applicant deleted successfully', applicant: deletedApplicant },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
