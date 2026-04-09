import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKeys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let lastError: any = null;
  const base64 = buffer.toString('base64');

  for (const apiKey of apiKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview";
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64,
          },
        },
        'Extract all readable text from this PDF document, including work experience, skills, and summary. Return the raw text only.',
      ]);

      return result.response.text();
    } catch (error: any) {
      console.error(`OCR Key Failed (${apiKey.substring(0, 8)}...):`, error.message);
      lastError = error;
      continue;
    }
  }

  throw new Error(lastError?.message || "PDF Extraction service is temporarily down.");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Please upload a PDF file.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const parsedText = await extractTextFromPdf(buffer);

    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        parsedText,
      },
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
