import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Applicant from '@/models/Applicant';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        // Test 1: Create a job
        const jobTest = await Job.create({
            title: 'Test Job - CRUD Validation',
            department: 'Testing',
            location: 'Test City',
            description: 'Temporary job for testing CRUD operations',
            skills: ['Testing', 'MongoDB'],
            status: 'Active',
        });

        // Test 2: Read the job by ID
        const fetchedJob = await Job.findById(jobTest._id);
        if (!fetchedJob) {
            return NextResponse.json({
                success: false,
                error: 'Failed to read job - Job not found after creation',
            });
        }

        // Test 3: Create an applicant for this job
        const applicantTest = await Applicant.create({
            name: 'Test Applicant',
            jobId: jobTest._id,
            role: 'Test Role',
            score: 85,
            status: 'In Review',
            source: 'Test Source',
            skills: ['Testing'],
            experience: '3 years',
        });

        // Test 4: Read the applicant by ID
        const fetchedApplicant = await Applicant.findById(applicantTest._id).populate('jobId');
        if (!fetchedApplicant) {
            return NextResponse.json({
                success: false,
                error: 'Failed to read applicant - Applicant not found after creation',
            });
        }

        // Test 5: Update the job
        const updatedJob = await Job.findByIdAndUpdate(
            jobTest._id,
            {
                title: 'Test Job - UPDATED',
                status: 'Closed',
            },
            { new: true }
        );
        if (!updatedJob || updatedJob.title !== 'Test Job - UPDATED') {
            return NextResponse.json({
                success: false,
                error: 'Failed to update job - Values not updated correctly',
            });
        }

        // Test 6: Update the applicant
        const updatedApplicant = await Applicant.findByIdAndUpdate(
            applicantTest._id,
            {
                status: 'Shortlisted',
                score: 95,
            },
            { new: true }
        );
        if (!updatedApplicant || updatedApplicant.status !== 'Shortlisted') {
            return NextResponse.json({
                success: false,
                error: 'Failed to update applicant - Values not updated correctly',
            });
        }

        // Test 7: Query applicants by job ID
        const applicantsByJobId = await Applicant.find({ jobId: jobTest._id });
        if (applicantsByJobId.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Failed to query applicants by jobId',
            });
        }

        // Test 8: Delete the applicant
        const deletedApplicant = await Applicant.findByIdAndDelete(applicantTest._id);
        if (!deletedApplicant) {
            return NextResponse.json({
                success: false,
                error: 'Failed to delete applicant',
            });
        }

        // Test 9: Verify deletion
        const shouldBeNull = await Applicant.findById(applicantTest._id);
        if (shouldBeNull) {
            return NextResponse.json({
                success: false,
                error: 'Failed to verify applicant deletion - Applicant still exists',
            });
        }

        // Test 10: Delete the job
        const deletedJob = await Job.findByIdAndDelete(jobTest._id);
        if (!deletedJob) {
            return NextResponse.json({
                success: false,
                error: 'Failed to delete job',
            });
        }

        // Test 11: Verify job deletion
        const jobShouldBeNull = await Job.findById(jobTest._id);
        if (jobShouldBeNull) {
            return NextResponse.json({
                success: false,
                error: 'Failed to verify job deletion - Job still exists',
            });
        }

        // Count total data to show DB is working
        const totalJobs = await Job.countDocuments({});
        const totalApplicants = await Applicant.countDocuments({});

        return NextResponse.json({
            success: true,
            message: 'All CRUD operations passed successfully!',
            testSummary: {
                jobCreated: jobTest.title,
                jobUpdated: updatedJob.title,
                jobDeleted: true,
                applicantCreated: applicantTest.name,
                applicantUpdated: true,
                applicantDeleted: true,
                queriesByJobId: applicantsByJobId.length,
            },
            databaseStatus: {
                totalJobsInDB: totalJobs,
                totalApplicantsInDB: totalApplicants,
                mongoDBConnected: true,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                mongoDBConnected: false,
            },
            { status: 500 }
        );
    }
}
