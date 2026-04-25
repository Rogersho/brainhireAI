import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Read API Key manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.*)/)?.[1]?.trim();

const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

async function readBrainPdf() {
  const filePath = path.join(process.cwd(), 'brain.pdf');
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64,
      },
    },
    'Summarize what this document is about. What are the key requirements or features it defines?',
  ]);

  console.log(result.response.text());
}

readBrainPdf();
