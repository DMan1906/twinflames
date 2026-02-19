// src/actions/ai.ts
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { encryptData } from '@/lib/crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generic text generation helper used by all AI features (Dates, Trivia, etc.)
 */
export async function generateText(prompt: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return { 
      success: true, 
      plaintext: text 
    };
  } catch (error: any) {
    console.error('AI Text Generation failed:', error);
    return { success: false, error: 'AI is currently unavailable.' };
  }
}

/**
 * Specifically generates a daily relationship question.
 */
export async function generateDailyQuestion() {
  const prompt = `
    You are an expert relationship counselor. 
    Generate a single, thoughtful, and engaging question for a couple to answer about each other or their relationship.
    It should be deep but not overly heavy. 
    Do not include quotes, intro text, or extra formatting. Just return the question.
  `;

  const result = await generateText(prompt);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Encrypt the result for database safety
  const encryptedQuestion = encryptData(result.plaintext!);

  return { 
    success: true, 
    plaintext: result.plaintext, 
    encrypted: encryptedQuestion 
  };
}