'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { cookies } from 'next/headers';

type MilestoneType = 'date' | 'countdown';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

function asNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function updateProfileImage(userId: string, imageUrl: string) {
  if (!imageUrl.trim()) {
    return { success: false, error: 'Image URL is required.' };
  }

  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

    await databases.updateDocument(DB_ID, PROFILES_ID, userId, {
      avatar_url: imageUrl.trim(),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function addMilestone(userId: string, title: string, date: string, type: MilestoneType) {
  if (!title.trim() || !date) {
    return { success: false, error: 'Title and date are required.' };
  }

  try {
    const MILESTONES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID!;
    if (!MILESTONES_ID) {
      return { success: false, error: 'Profile milestones collection is not configured.' };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    await databases.createDocument(DB_ID, MILESTONES_ID, ID.unique(), {
      user_id: userId,
      title: title.trim(),
      date,
      type,
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteMilestone(userId: string, milestoneId: string) {
  if (!milestoneId) {
    return { success: false, error: 'Milestone id is required.' };
  }

  try {
    const MILESTONES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID!;
    if (!MILESTONES_ID) {
      return { success: false, error: 'Profile milestones collection is not configured.' };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    const doc = await databases.getDocument(DB_ID, MILESTONES_ID, milestoneId);
    if (String(doc.user_id) !== userId) {
      return { success: false, error: 'Cannot delete another user milestone.' };
    }

    await databases.deleteDocument(DB_ID, MILESTONES_ID, milestoneId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getProfileDashboard(userId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;
    const JOURNAL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;
    const MILESTONES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID!;
    const STREAKS_ID = process.env.NEXT_PUBLIC_APPWRITE_STREAKS_COLLECTION_ID!;

    const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);

    const questions = await databases.listDocuments(DB_ID, JOURNAL_ID, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);

    let milestones: Array<{ id: string; title: string; date: string; type: MilestoneType }> = [];
    if (MILESTONES_ID) {
      const docs = await databases.listDocuments(DB_ID, MILESTONES_ID, [
        Query.equal('user_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);

      milestones = docs.documents.map((doc) => ({
        id: doc.$id,
        title: String(doc.title),
        date: String(doc.date),
        type: String(doc.type) as MilestoneType,
      }));
    }

    let currentStreak = 0;
    let bestStreak = 0;
    const partnerId = String(profile.partner_id || '');
    if (STREAKS_ID && partnerId) {
      const chatId = [userId, partnerId].sort().join('_');
      const streakDocs = await databases.listDocuments(DB_ID, STREAKS_ID, [
        Query.equal('chat_id', chatId),
        Query.limit(1),
      ]);

      if (streakDocs.total > 0) {
        const streak = streakDocs.documents[0];
        currentStreak = asNumber(streak.current_count);
        bestStreak = asNumber(streak.best_count, currentStreak);
      }
    }

    return {
      success: true,
      profile: {
        userId,
        partnerId,
        pairCode: String(profile.pair_code || ''),
        currentStreak,
        bestStreak,
        questionsAnswered: asNumber(questions.total),
        accountCreatedAt: String(profile.$createdAt),
        profileImageUrl: String(profile.avatar_url || ''),
        milestones,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function logoutCurrentUser() {
  try {
    const { account } = await createSessionClient();
    const cookieStore = await cookies();

    await account.deleteSession('current');
    cookieStore.delete('twinflames-session');

    return { success: true };
  } catch {
    const cookieStore = await cookies();
    cookieStore.delete('twinflames-session');
    return { success: true };
  }
}
