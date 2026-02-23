import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { syncSocialFeed } from '@/actions/social';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

    const profiles = await databases.listDocuments(DB_ID, PROFILES_ID, [Query.limit(500)]);

    const processedChats = new Set<string>();
    let syncedCouples = 0;
    let importedPosts = 0;
    const failures: string[] = [];

    for (const profile of profiles.documents) {
      const userId = String(profile.user_id || profile.$id || '');
      const partnerId = String(profile.partner_id || '');
      if (!userId || !partnerId) continue;

      const chatId = [userId, partnerId].sort().join('_');
      if (processedChats.has(chatId)) continue;
      processedChats.add(chatId);

      const result = await syncSocialFeed(userId);
      if (!result.success) {
        failures.push(`${chatId}: ${result.error || 'sync failed'}`);
        continue;
      }

      syncedCouples += 1;
      if ('imported' in result) {
        importedPosts += Number(result.imported || 0);
      }
    }

    return NextResponse.json({
      success: true,
      scannedProfiles: profiles.documents.length,
      syncedCouples,
      importedPosts,
      failureCount: failures.length,
      failures: failures.slice(0, 20),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Social sync cron failed';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
