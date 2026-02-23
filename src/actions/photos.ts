'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { getUploadUrl } from '@/lib/minio';
import { getDailyTrinityStatus } from '@/actions/daily-progress';
import { updateStreakIfCompletedToday } from '@/actions/streak';

function getToday() {
	return new Date().toISOString().split('T')[0];
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	return 'Unexpected error';
}

function sanitizeMime(mime: string | undefined) {
	if (!mime || !mime.includes('/')) return 'image/jpeg';
	return mime;
}

function extensionFromMime(mime: string) {
	const [, ext] = mime.split('/');
	return (ext || 'jpg').replace('jpeg', 'jpg');
}

export async function createDailyPhotoUploadUrls(
	userId: string,
	frontMimeType?: string,
	backMimeType?: string,
) {
	if (!userId) {
		return { success: false, error: 'User is required.' };
	}

	try {
		const today = getToday();
		const frontMime = sanitizeMime(frontMimeType);
		const backMime = sanitizeMime(backMimeType);
		const frontKey = `daily/${today}/${userId}/front-${Date.now()}.${extensionFromMime(frontMime)}`;
		const backKey = `daily/${today}/${userId}/back-${Date.now()}.${extensionFromMime(backMime)}`;

		const [front, back] = await Promise.all([
			getUploadUrl(frontKey, frontMime),
			getUploadUrl(backKey, backMime),
		]);

		if (!front.success || !back.success) {
			return { success: false, error: 'Could not prepare upload URLs.' };
		}

		return {
			success: true,
			front: { uploadUrl: front.url!, objectKey: front.objectKey!, mimeType: frontMime },
			back: { uploadUrl: back.url!, objectKey: back.objectKey!, mimeType: backMime },
		};
	} catch (error: unknown) {
		console.error('createDailyPhotoUploadUrls failed:', error);
		return { success: false, error: getErrorMessage(error) || 'Failed to create upload URLs.' };
	}
}

export async function submitDailyPhotos(userId: string, frontObjectKey: string, backObjectKey: string) {
	if (!userId || !frontObjectKey || !backObjectKey) {
		return { success: false, error: 'Both photo object keys are required.' };
	}

	try {
		const before = await getDailyTrinityStatus(userId);
		const { databases } = await createAdminClient();
		const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
		const PHOTO_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID!;
		const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

		if (!PHOTO_COL_ID) {
			return { success: false, error: 'Photos collection is not configured.' };
		}

		const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
		if (!profile.partner_id) {
			return { success: false, error: 'You need a partner to submit daily photos.' };
		}

		const today = getToday();
		const chatId = [userId, String(profile.partner_id)].sort().join('_');

		const existing = await databases.listDocuments(DB_ID, PHOTO_COL_ID, [
			Query.equal('chat_id', chatId),
			Query.equal('user_id', userId),
			Query.equal('created_at', today),
			Query.limit(1),
		]);

		if (existing.total > 0) {
			await databases.updateDocument(DB_ID, PHOTO_COL_ID, existing.documents[0].$id, {
				front_camera_url: frontObjectKey,
				back_camera_url: backObjectKey,
			});
		} else {
			await databases.createDocument(DB_ID, PHOTO_COL_ID, ID.unique(), {
				chat_id: chatId,
				user_id: userId,
				front_camera_url: frontObjectKey,
				back_camera_url: backObjectKey,
				created_at: today,
			});
		}

		const after = await getDailyTrinityStatus(userId);
		if (before.success && after.success && !before.bothComplete && after.bothComplete) {
			await updateStreakIfCompletedToday(userId);
		}

		return { success: true };
	} catch (error: unknown) {
		console.error('submitDailyPhotos failed:', error);
		return { success: false, error: getErrorMessage(error) || 'Failed to submit photos.' };
	}
}
