'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';
import { getDailyTrinityStatus } from '@/actions/daily-progress';
import { updateStreakIfCompletedToday } from '@/actions/streak';

function getToday() {
	return new Date().toISOString().split('T')[0];
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	return 'Unexpected error';
}

export async function submitMoodCheckin(userId: string, moodLevel: number, moodNote = '') {
	if (!userId || moodLevel < 1 || moodLevel > 5) {
		return { success: false, error: 'Mood level must be between 1 and 5.' };
	}

	try {
		const before = await getDailyTrinityStatus(userId);
		const { databases } = await createAdminClient();
		const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
		const MOOD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID!;
		const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

		if (!MOOD_COL_ID) {
			return { success: false, error: 'Mood collection is not configured.' };
		}

		const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
		if (!profile.partner_id) {
			return { success: false, error: 'You need a partner to submit mood check-ins.' };
		}

		const today = getToday();
		const chatId = [userId, String(profile.partner_id)].sort().join('_');
		const encryptedNote = moodNote.trim() ? encryptData(moodNote.trim()) : '';

		const existing = await databases.listDocuments(DB_ID, MOOD_COL_ID, [
			Query.equal('chat_id', chatId),
			Query.equal('user_id', userId),
			Query.equal('created_at', today),
			Query.limit(1),
		]);

		if (existing.total > 0) {
			await databases.updateDocument(DB_ID, MOOD_COL_ID, existing.documents[0].$id, {
				mood_level: moodLevel,
				mood_note: encryptedNote,
			});
		} else {
			await databases.createDocument(DB_ID, MOOD_COL_ID, ID.unique(), {
				chat_id: chatId,
				user_id: userId,
				mood_level: moodLevel,
				mood_note: encryptedNote,
				created_at: today,
			});
		}

		const after = await getDailyTrinityStatus(userId);
		if (before.success && after.success && !before.bothComplete && after.bothComplete) {
			await updateStreakIfCompletedToday(userId);
		}

		return { success: true };
	} catch (error: unknown) {
		console.error('submitMoodCheckin failed:', error);
		return { success: false, error: getErrorMessage(error) || 'Failed to submit mood check-in.' };
	}
}

export async function getTodayMood(userId: string) {
	try {
		const { databases } = await createAdminClient();
		const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
		const MOOD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID!;
		const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

		if (!MOOD_COL_ID) {
			return { success: true, mood: null };
		}

		const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
		if (!profile.partner_id) {
			return { success: true, mood: null };
		}

		const today = getToday();
		const chatId = [userId, String(profile.partner_id)].sort().join('_');

		const docs = await databases.listDocuments(DB_ID, MOOD_COL_ID, [
			Query.equal('chat_id', chatId),
			Query.equal('user_id', userId),
			Query.equal('created_at', today),
			Query.limit(1),
		]);

		if (docs.total === 0) {
			return { success: true, mood: null };
		}

		const doc = docs.documents[0];
		return {
			success: true,
			mood: {
				level: doc.mood_level,
				note: doc.mood_note ? decryptData(doc.mood_note) : '',
			},
		};
	} catch (error: unknown) {
		console.error('getTodayMood failed:', error);
		return { success: false, error: getErrorMessage(error) || 'Failed to get mood.' };
	}
}
