'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need to pair with a partner first.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, partnerId, chatId };
}

export async function createCoupon(userId: string, title: string, description = '') {
  if (!title.trim()) {
    return { success: false, error: 'Coupon title is required.' };
  }

  try {
    const COUPONS_ID = process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID!;
    if (!COUPONS_ID) {
      return { success: false, error: 'Coupons collection is not configured.' };
    }

    const { databases, DB_ID, partnerId, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, COUPONS_ID, ID.unique(), {
      chat_id: chatId,
      created_by: userId,
      title: encryptData(title.trim()),
      description: description.trim() ? encryptData(description.trim()) : '',
      redeemed: false,
      redeemed_at: '',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getCoupons(userId: string) {
  try {
    const COUPONS_ID = process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID!;
    if (!COUPONS_ID) {
      return { success: false, error: 'Coupons collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const result = await databases.listDocuments(DB_ID, COUPONS_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(300),
    ]);

    const all = result.documents.map((doc) => ({
      id: doc.$id,
      createdBy: String(doc.created_by),
      title: decryptData(String(doc.title)),
      description: doc.description ? decryptData(String(doc.description)) : '',
      redeemed: Boolean(doc.redeemed),
      redeemedAt: String(doc.redeemed_at || ''),
      createdAt: String(doc.$createdAt),
    }));

    // Coupons created by user are "given"
    // All coupons in this chat are both given and received (can be redeemed by partner)
    const given = all.filter((coupon) => coupon.createdBy === userId);
    const received = all.filter((coupon) => coupon.createdBy !== userId);

    return {
      success: true,
      given,
      received: {
        redeemed: received.filter((coupon) => coupon.redeemed),
        unredeemed: received.filter((coupon) => !coupon.redeemed),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function redeemCoupon(userId: string, couponId: string) {
  if (!couponId) {
    return { success: false, error: 'Coupon id is required.' };
  }

  try {
    const COUPONS_ID = process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID!;
    if (!COUPONS_ID) {
      return { success: false, error: 'Coupons collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const coupon = await databases.getDocument(DB_ID, COUPONS_ID, couponId);

    if (String(coupon.chat_id) !== chatId) {
      return { success: false, error: 'Coupon does not belong to this relationship.' };
    }

    // Only partner (who didn't create it) can redeem it
    if (String(coupon.created_by) === userId) {
      return { success: false, error: 'Only the receiver can redeem this coupon.' };
    }

    if (coupon.redeemed) {
      return { success: true, alreadyRedeemed: true };
    }

    await databases.updateDocument(DB_ID, COUPONS_ID, couponId, {
      redeemed: true,
      redeemed_at: todayString(),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
