import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKeys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview";

export async function screenCandidate(jobDescription: string, candidateData: any) {
  const prompt = `
    Evaluation Requirements:
    1. Score: Provide a match score (0-100).
    2. Strengths: Identify talent highlights. If resume is missing/empty, state "None - Resume Missing".
    3. Gaps / Risks: If info is missing, list exactly what's missing (e.g., "Full career history required").
    4. Final Recommendation: Always provide a specific action (e.g., "Request missing details").
    
    Return the response in strict JSON format:
    {
      "score": number,
      "strengths": "string",
      "gaps": "string",
      "recommendation": "string",
      "skills": ["string"]
    }

    CONTEXT:
    Job: ${jobDescription}
    Candidate: ${candidateData.name} - ${candidateData.role}
    Details: ${candidateData.experience}
  `;

  let lastError: any = null;

  // Attempt to use each API key sequentially on failure
  for (const apiKey of apiKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonString = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(jsonString);
      
      return {
        score: data.score ?? 0,
        strengths: data.strengths ?? "",
        gaps: data.gaps ?? "No specific gaps identified.",
        recommendation: data.recommendation ?? "Detailed assessment recommended.",
        skills: data.skills ?? []
      };
    } catch (error: any) {
      console.error(`Gemini Key Failed (${apiKey.substring(0, 8)}...):`, error.message);
      lastError = error;
      // If it's a rate limit or service error, continue to next key
      continue;
    }
  }

  // If we reach here, all keys failed
  console.error("All Gemini API keys exhausted or failed.");
  throw new Error(lastError?.message || "AI Service is temporarily unavailable. Please try again later.");
}
