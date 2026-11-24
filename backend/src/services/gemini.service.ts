import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

async function runWithKeyFallback<T>(
  fn: (genAI: GoogleGenerativeAI, modelName: string) => Promise<T>
): Promise<T> {
  if (env.geminiApiKeys.length === 0) {
    throw new Error('GEMINI_API_KEY is not configured on the backend server.');
  }

  let lastError: unknown = null;
  for (const apiKey of env.geminiApiKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      return await fn(genAI, env.geminiModel);
    } catch (err) {
      console.error(`[Gemini] Key ${apiKey.slice(0, 8)}... failed:`, (err as Error)?.message);
      lastError = err;
    }
  }

  throw new Error(
    (lastError as Error)?.message || 'AI service is temporarily unavailable. Please try again later.'
  );
}

function cleanJsonText(raw: string): string {
  return raw.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export interface ScreeningResult {
  score: number;
  strengths: string;
  gaps: string;
  recommendation: string;
  skills: string[];
}

export async function screenCandidate(
  jobDescription: string,
  candidateData: { name: string; role: string; skills: string[]; experience: string }
): Promise<ScreeningResult> {
  const prompt = `
You are an expert technical recruiter. Evaluate the candidate against the job description.

Evaluation Requirements:
1. Score: Provide a match score (0-100).
2. Strengths: Identify talent highlights. If resume is missing/empty, state "None - Resume Missing".
3. Gaps / Risks: List specific gaps or missing info.
4. Final Recommendation: Provide a clear hiring recommendation.
5. Skills: Extract a clean array of relevant skills from the candidate's background.

Return strict JSON only:
{
  "score": number,
  "strengths": "string",
  "gaps": "string",
  "recommendation": "string",
  "skills": ["string"]
}

CONTEXT:
Job Description: ${jobDescription}
Candidate: ${candidateData.name} - ${candidateData.role}
Known Skills: ${candidateData.skills.join(', ') || 'None listed'}
Resume / Details: ${candidateData.experience}
`;

  return runWithKeyFallback(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJsonText(result.response.text()));
    const rawScore = Number(data.score);
    const clampedScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;

    return {
      score: clampedScore,
      strengths: typeof data.strengths === 'string' ? data.strengths : '',
      gaps: typeof data.gaps === 'string' ? data.gaps : 'No specific gaps identified.',
      recommendation:
        typeof data.recommendation === 'string'
          ? data.recommendation
          : 'Detailed assessment recommended.',
      skills: Array.isArray(data.skills) ? data.skills.map(String) : candidateData.skills,
    };
  });
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString('base64');
  return runWithKeyFallback(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      'Extract all readable text from this PDF document, including work experience, education, skills, and summary. Return the raw text only.',
    ]);
    return result.response.text();
  });
}

export interface ResumeAnalysis {
  skills: string[];
  strengths: string[];
  weaknesses: string[];
}

export async function analyzeResumeText(resumeText: string): Promise<ResumeAnalysis> {
  const prompt = `
Analyze the following candidate resume text and extract:
1. skills: array of key technical & domain skills (max 15)
2. strengths: 3-5 concise bullet strings describing career strengths
3. weaknesses: 2-4 concise bullet strings describing potential growth areas or resume gaps

Return strict JSON only:
{
  "skills": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"]
}

RESUME:
${resumeText.slice(0, 8000)}
`;

  return runWithKeyFallback(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJsonText(result.response.text()));
    return {
      skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
      strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.map(String) : [],
    };
  });
}

export interface JobRecommendation {
  jobId: string;
  matchPercentage: number;
  reasoning: string;
  missingSkills: string[];
  alignedSkills: string[];
}

export async function generateJobRecommendations(
  candidate: { skills: string[]; strengths: string[]; resumeText: string },
  jobs: Array<{ id: string; title: string; department: string; location: string; skills: string[] }>
): Promise<JobRecommendation[]> {
  const prompt = `
You are an expert recruiter AI. Given a candidate's CV and available job postings, identify the best job matches and explain why each is a good fit.

Candidate Skills: ${candidate.skills.join(', ') || 'None listed'}
Candidate Strengths: ${candidate.strengths.join(', ') || 'None provided'}
Candidate Background: ${candidate.resumeText.slice(0, 1200) || 'Not provided'}

Available Jobs:
${jobs
  .map(
    (j) =>
      `- Job ID: ${j.id}, Title: ${j.title}, Department: ${j.department}, Location: ${j.location}, Skills Required: ${j.skills.join(', ')}`
  )
  .join('\n')}

Return a strict JSON array only:
[
  {
    "jobId": "the job id string",
    "matchPercentage": 85,
    "reasoning": "Why this is a good match",
    "missingSkills": ["skill1"],
    "alignedSkills": ["skill1", "skill2"]
  }
]

Sort by matchPercentage descending. If no good matches, return [].
`;

  return runWithKeyFallback(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(cleanJsonText(result.response.text()));
    return Array.isArray(parsed) ? parsed : [];
  });
}
