// src/actions/dates.ts
'use server';

import { generateText } from '@/actions/ai';

export async function generateDateIdea(vibe: string) {
  const prompt = `
    You are an expert romantic date planner. 
    Generate a creative, detailed date idea for a couple based on the vibe: "${vibe}".
    
    Structure the response as:
    1. Title: A catchy name for the date.
    2. The Vibe: A short description.
    3. The Plan: 3-4 clear, actionable steps.
    4. "TwinFlame" Moment: A conversation starter.
  `;

  const result = await generateText(prompt);
  
  if (result.success) {
    return { success: true, idea: result.plaintext };
  }
  return { success: false, error: "AI is resting. Try again soon!" };
}