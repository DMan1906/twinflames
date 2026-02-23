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
    // Most reliable models as of 2026
    const modelOptions = [
      'gemini-2.0-flash',      // Latest and fastest
      'gemini-1.5-flash',      // Reliable fallback
      'gemini-1.0-pro',        // Stable older model
    ];
    
    let model;
    for (const modelName of modelOptions) {
      try {
        console.log(`[AI] Trying model: ${modelName}`);
        model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        console.log(`[AI] ✓ Success with ${modelName}`);
        return { 
          success: true, 
          plaintext: text 
        };
      } catch (err: any) {
        console.log(`[AI] ✗ ${modelName} failed:`, err.message);
        // Continue to next model if this one fails
        if (modelName === modelOptions[modelOptions.length - 1]) {
          // Last model, rethrow error
          throw err;
        }
      }
    }
    
    return { success: false, error: 'AI is currently unavailable.' };
  } catch (error: any) {
    console.error('[AI] Text Generation failed:', error.message);
    return { success: false, error: `AI unavailable: ${error.message?.slice(0, 100) || 'Unknown error'}` };
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