import { extractText } from 'unpdf';
import { env } from '../config/env.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NvidiaChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

async function callNvidiaChat(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (env.nvidiaApiKeys.length === 0) {
    throw new Error('NVIDIA_API_KEYS is not configured on the backend server.');
  }

  let lastError: unknown = null;

  for (const apiKey of env.nvidiaApiKeys) {
    try {
      const response = await fetch(`${env.nvidiaApiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.nvidiaModel,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2048,
          chat_template_kwargs: { enable_thinking: false },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`NVIDIA API error (${response.status}): ${errText.slice(0, 300)}`);
      }

      const payload = (await response.json()) as NvidiaChatCompletionResponse;
      const msg = payload.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content;
      if (!content || typeof content !== 'string') {
        throw new Error('Empty response returned from NVIDIA AI model.');
      }
      return content;
    } catch (err) {
      console.error(`[NVIDIA AI] Key ${apiKey.slice(0, 10)}... failed:`, (err as Error)?.message);
      lastError = err;
    }
  }

  throw new Error(
    (lastError as Error)?.message || 'AI service is temporarily unavailable. Please try again later.'
  );
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    let start = -1;
    let end = -1;

    if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
      start = firstArr;
      end = cleaned.lastIndexOf(']');
    } else if (firstObj !== -1) {
      start = firstObj;
      end = cleaned.lastIndexOf('}');
    }

    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error('AI response did not contain valid JSON.');
  }
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
  const prompt = `Evaluate the candidate against the job description.

Evaluation Requirements:
1. Score: Provide a match score (0-100).
2. Strengths: Identify talent highlights. If resume is missing/empty, state "None - Resume Missing".
3. Gaps / Risks: List specific gaps or missing info.
4. Final Recommendation: Provide a clear hiring recommendation.
5. Skills: Extract a clean array of relevant skills from the candidate's background.

Return STRICT JSON ONLY matching this exact schema (no markdown, no extra commentary):
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
Resume / Details: ${candidateData.experience}`;

  const raw = await callNvidiaChat([
    {
      role: 'system',
      content: 'You are an expert technical recruiter AI. Always respond with strict valid JSON only.',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJsonResponse<Partial<ScreeningResult>>(raw);
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
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  const normalized = (typeof text === 'string' ? text : '').replace(/\s+\n/g, '\n').trim();
  if (!normalized) {
    throw new Error('No extractable text found in PDF document.');
  }
  return normalized;
}

export interface ResumeAnalysis {
  skills: string[];
  strengths: string[];
  weaknesses: string[];
}

export async function analyzeResumeText(resumeText: string): Promise<ResumeAnalysis> {
  const prompt = `Analyze the following candidate resume text and extract:
1. skills: array of key technical & domain skills (max 15)
2. strengths: 3-5 concise bullet strings describing career strengths
3. weaknesses: 2-4 concise bullet strings describing potential growth areas or resume gaps

Return STRICT JSON ONLY (no markdown, no extra text):
{
  "skills": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"]
}

RESUME:
${resumeText.slice(0, 8000)}`;

  const raw = await callNvidiaChat([
    {
      role: 'system',
      content: 'You are a career analysis AI. Always respond with strict valid JSON only.',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJsonResponse<Partial<ResumeAnalysis>>(raw);
  return {
    skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
    strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.map(String) : [],
  };
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
  const prompt = `Given a candidate's CV and available job postings, identify the best job matches and explain why each is a good fit.

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

Return a STRICT JSON ARRAY ONLY (no markdown, no extra text):
[
  {
    "jobId": "the job id string",
    "matchPercentage": 85,
    "reasoning": "Why this is a good match",
    "missingSkills": ["skill1"],
    "alignedSkills": ["skill1", "skill2"]
  }
]

Sort by matchPercentage descending. If no good matches, return [].`;

  const raw = await callNvidiaChat([
    {
      role: 'system',
      content: 'You are an expert recruiter AI. Always respond with a strict valid JSON array only.',
    },
    { role: 'user', content: prompt },
  ]);

  const parsed = parseJsonResponse<JobRecommendation[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function generateJobDescription(input: {
  title: string;
  department: string;
  location?: string;
  employmentType?: string;
  skills?: string[];
}): Promise<{ description: string; skills: string[] }> {
  const prompt = `Draft a crisp, modern, inclusive job description for:
Title: ${input.title}
Department: ${input.department}
Location: ${input.location || 'Flexible'}
Employment Type: ${input.employmentType || 'Full-Time'}
Hinted Skills: ${(input.skills || []).join(', ') || 'Determine best fit'}

Return STRICT JSON ONLY:
{
  "description": "Clean formatted plain text with Overview, Key Responsibilities (bulleted with -), and Qualifications (bulleted with -).",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"]
}`;

  const raw = await callNvidiaChat([
    {
      role: 'system',
      content: 'You are an expert HR copywriter. Always respond with strict valid JSON only.',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJsonResponse<{ description?: string; skills?: string[] }>(raw);
  return {
    description: typeof data.description === 'string' ? data.description : '',
    skills: Array.isArray(data.skills) ? data.skills.map(String) : input.skills || [],
  };
}

export async function generateInterviewQuestions(input: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
  roundType: string;
}): Promise<Array<{ question: string; focusArea: string; whatToLookFor: string }>> {
  const prompt = `Generate 6 tailored, high-signal interview questions for a "${input.roundType}" interview.
Role: ${input.jobTitle}
Job Description: ${input.jobDescription.slice(0, 1500)}
Candidate Background: ${input.resumeText.slice(0, 2000)}

Return STRICT JSON ARRAY ONLY:
[
  {
    "question": "The exact interview question",
    "focusArea": "Technical | Behavioral | System Design | Leadership | Role Fit",
    "whatToLookFor": "Brief rubric of a strong answer"
  }
]`;

  const raw = await callNvidiaChat([
    {
      role: 'system',
      content: 'You are a structured interviewing expert. Always respond with a strict valid JSON array only.',
    },
    { role: 'user', content: prompt },
  ]);

  const parsed = parseJsonResponse<Array<{ question: string; focusArea: string; whatToLookFor: string }>>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function draftOfferLetter(input: {
  companyName: string;
  candidateName: string;
  jobTitle: string;
  salary: number;
  currency: string;
  startDate: string;
  employmentType: string;
  benefits?: string;
}): Promise<string> {
  const prompt = `Write a clean, warm, legally clear job offer letter (plain text, no markdown fences).
Company: ${input.companyName}
Candidate: ${input.candidateName}
Role: ${input.jobTitle}
Employment Type: ${input.employmentType}
Compensation: ${input.currency} ${input.salary.toLocaleString()} per year
Start Date: ${input.startDate}
Benefits Summary: ${input.benefits || 'Standard company benefits package including paid leave and health coverage.'}

Keep it concise, professional, and ready to send.`;

  return callNvidiaChat([
    {
      role: 'system',
      content: 'You are an experienced HR director drafting clear, warm, concise employment offer letters.',
    },
    { role: 'user', content: prompt },
  ]);
}
