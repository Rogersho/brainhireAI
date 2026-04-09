import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function getJobRecommendations(userSkills: string[], userAnalysis: any, userText: string) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an expert recruiter AI. Given a candidate's CV information and available job postings, 
identify the best job matches and explain why each is a good fit.

Candidate Skills: ${userSkills.join(', ')}
Candidate Strengths: ${userAnalysis.strengths?.join(', ') || 'None provided'}
Candidate Background: ${userText.substring(0, 500) || 'Not provided'}

Return a JSON array with this structure (ONLY JSON, no markdown):
[
  {
    "jobId": "the job id",
    "matchPercentage": 85,
    "reasoning": "Why this is a good match",
    "missingSkills": ["skill1"],
    "alignedSkills": ["skill1", "skill2"]
  }
]

Be realistic with match percentages (0-100). Consider skills, experience level, and career progression.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error: any) {
        console.error('Recommendation error:', error);
        // Better error messages
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            throw new Error('API quota exceeded. Please try again in a few moments.');
        }
        throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Candidate') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Get user's CV data
        const user = await User.findById((session.user as any).id);
        if (!user || !user.resumeText) {
            return NextResponse.json({ error: 'No CV found. Please upload your resume first.' }, { status: 400 });
        }

        // Get all active jobs
        const jobs = await Job.find({ status: 'Active' });
        if (jobs.length === 0) {
            return NextResponse.json({
                success: true,
                recommendations: [],
                message: 'No active jobs available at this time.',
            });
        }

        // Create a jobId to job mapping for context
        const jobContext = jobs.map((j: any) => ({
            jobId: j._id.toString(),
            title: j.title,
            department: j.department,
            location: j.location,
            skills: j.skills,
        }));

        const recommendation_prompt = `You are an expert recruiter AI. Given a candidate's CV and available job postings, 
identify the best job matches and explain why each is a good fit.

Candidate Skills: ${user.skills.join(', ')}
Candidate Strengths: ${user.aiAnalysis?.strengths?.join(', ') || 'None provided'}
Candidate Background: ${user.resumeText.substring(0, 500) || 'Not provided'}

Available Jobs:
${jobContext.map((j: any) => `- Job ID: ${j.jobId}, Title: ${j.title}, Department: ${j.department}, Location: ${j.location}, Skills Required: ${j.skills.join(', ')}`).join('\n')}

Return a JSON array with this structure (ONLY JSON, no markdown, no array wrapper if empty):
[
  {
    "jobId": "the job id string",
    "matchPercentage": 85,
    "reasoning": "Why this is a good match",
    "missingSkills": ["skill1"],
    "alignedSkills": ["skill1", "skill2"]
  }
]

Be realistic with match percentages (0-100). Consider skills, experience level, and career progression. 
Sort by match percentage descending. If no good matches, return empty array [].`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent(recommendation_prompt);
            const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
            const recommendations = JSON.parse(text);

            // Merge job details with recommendations
            const enrichedRecommendations = recommendations.map((rec: any) => {
                const job = jobs.find((j: any) => j._id.toString() === rec.jobId);
                return {
                    ...rec,
                    job: {
                        _id: job?._id,
                        title: job?.title,
                        department: job?.department,
                        location: job?.location,
                        description: job?.description,
                        skills: job?.skills,
                    },
                };
            });

            return NextResponse.json({
                success: true,
                recommendations: enrichedRecommendations,
            });
        } catch (aiError: any) {
            console.error('Gemini API error in POST:', aiError);
            if (aiError.message?.includes('429') || aiError.message?.includes('quota')) {
                return NextResponse.json({
                    error: 'API quota exceeded. Please try again in a few moments.'
                }, { status: 429 });
            }
            throw aiError;
        }

    } catch (error: any) {
        console.error('Recommendations API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate recommendations' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Candidate') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Get user's CV data
        const user = await User.findById((session.user as any).id);
        if (!user || !user.resumeText) {
            return NextResponse.json({ error: 'No CV found. Please upload your resume first.' }, { status: 400 });
        }

        // Get all active jobs
        const jobs = await Job.find({ status: 'Active' });
        if (jobs.length === 0) {
            return NextResponse.json({
                success: true,
                recommendations: [],
                message: 'No active jobs available at this time.',
            });
        }

        // Generate recommendations
        const jobContext = jobs.map((j: any) => ({
            jobId: j._id.toString(),
            title: j.title,
            department: j.department,
            location: j.location,
            skills: j.skills,
        }));

        const recommendation_prompt = `You are an expert recruiter AI. Given a candidate's CV and available job postings, 
identify the best job matches and explain why each is a good fit.

Candidate Skills: ${user.skills.join(', ')}
Candidate Strengths: ${user.aiAnalysis?.strengths?.join(', ') || 'None provided'}
Candidate Background: ${user.resumeText.substring(0, 500) || 'Not provided'}

Available Jobs:
${jobContext.map((j: any) => `- Job ID: ${j.jobId}, Title: ${j.title}, Department: ${j.department}, Location: ${j.location}, Skills Required: ${j.skills.join(', ')}`).join('\n')}

Return a JSON array with this structure (ONLY JSON, no markdown, no array wrapper if empty):
[
  {
    "jobId": "the job id string",
    "matchPercentage": 85,
    "reasoning": "Why this is a good match",
    "missingSkills": ["skill1"],
    "alignedSkills": ["skill1", "skill2"]
  }
]

Be realistic with match percentages (0-100). Consider skills, experience level, and career progression. 
Sort by match percentage descending. If no good matches, return empty array [].`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent(recommendation_prompt);
            const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
            const recommendations = JSON.parse(text);

            // Merge job details with recommendations
            const enrichedRecommendations = recommendations.map((rec: any) => {
                const job = jobs.find((j: any) => j._id.toString() === rec.jobId);
                return {
                    ...rec,
                    job: {
                        _id: job?._id,
                        title: job?.title,
                        department: job?.department,
                        location: job?.location,
                        description: job?.description,
                        skills: job?.skills,
                    },
                };
            });

            return NextResponse.json({
                success: true,
                recommendations: enrichedRecommendations,
            });
        } catch (aiError: any) {
            console.error('Gemini API error in GET:', aiError);
            if (aiError.message?.includes('429') || aiError.message?.includes('quota')) {
                return NextResponse.json({
                    error: 'API quota exceeded. Please try again in a few moments.'
                }, { status: 429 });
            }
            throw aiError;
        }

    } catch (error: any) {
        console.error('Recommendations GET error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch recommendations' }, { status: 500 });
    }
}
