// src/actions/today.ts
'use server';

import { createAdminClient } from '@/lib/appwrite';
import { Messaging, Databases, Query, ID } from 'node-appwrite';
import { encryptData, decryptData } from '@/lib/crypto';
import { getDailyTrinityStatus } from '@/actions/daily-progress';
import { updateStreakIfCompletedToday } from '@/actions/streak';

export async function submitDailyAnswer(userId: string, question: string, answer: string) {
  const { databases, messaging } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const JOUR_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;
  const PROF_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  try {
    const before = await getDailyTrinityStatus(userId);
    const encryptedAnswer = encryptData(answer);
    const userProfile = await databases.getDocument(DB_ID, PROF_COL_ID, userId);
    const partnerId = userProfile.partner_id;
    const chatId = [userId, partnerId].sort().join('_');

    const newDoc = await databases.createDocument(DB_ID, JOUR_COL_ID, ID.unique(), {
      chat_id: chatId,
      user_id: userId,
      prompt: question,
      content: encryptedAnswer,
      is_revealed: false,
      partner_revealed: false,
    });

    if (partnerId) {
      await messaging.createPush(
        ID.unique(),
        'New Reflection! ❤️',
        'Your partner just locked their daily answer.',
        [], 
        [partnerId], 
        [], 
        [], 
        JSON.stringify({ url: '/dashboard/today' }) 
      );
    }

    const partnerAnswers = await databases.listDocuments(DB_ID, JOUR_COL_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('prompt', question),
      Query.notEqual('user_id', userId) 
    ]);

    let revealed = false;
    if (partnerAnswers.total > 0) {
      revealed = true;
      const myAnswerId = newDoc.$id; 
      const partnerAnswerId = partnerAnswers.documents[0].$id;

      await Promise.all([
        databases.updateDocument(DB_ID, JOUR_COL_ID, myAnswerId, { is_revealed: true }),
        databases.updateDocument(DB_ID, JOUR_COL_ID, partnerAnswerId, { is_revealed: true })
      ]);
    }

    const after = await getDailyTrinityStatus(userId);
    if (before.success && after.success && !before.bothComplete && after.bothComplete) {
      await updateStreakIfCompletedToday(userId);
    }

    // Return 'revealed' so the UI knows to show the results immediately
    return { success: true, revealed }; 
  } catch (error: any) {
    console.error('Submission failed:', error);
    return { success: false, error: error.message };
  }
}

export async function getRevealedAnswers(userId: string, question: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const JOUR_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;

  const docs = await databases.listDocuments(DB_ID, JOUR_COL_ID, [
    Query.equal('prompt', question),
    Query.equal('is_revealed', true)
  ]);

  if (docs.total < 2) return { success: false };

  const mine = docs.documents.find(d => d.user_id === userId);
  const theirs = docs.documents.find(d => d.user_id !== userId);

  return {
    success: true,
    mine: decryptData(mine!.content),
    theirs: decryptData(theirs!.content)
  };
}