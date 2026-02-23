// src/actions/auth.ts
'use server';

import { ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import crypto from 'crypto';
import { Query } from 'node-appwrite';
import { cookies } from 'next/headers';
import { savePasswordOnSignup, savePasswordOnLogin } from '@/actions/test-password';

/**
 * Generates a random 6-character alphanumeric pairing code
 */
function generatePairCode() {
  return 'TF' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Registers a new user and creates their TwinFlames profile
 */
export async function signUp(email: string, password: string, name: string) {
  try {
    const { account, databases } = await createAdminClient();

    // 1. Create the Auth account (Appwrite handles the secure hashing here)
    const user = await account.create(ID.unique(), email, password, name);

    // 2. Generate their unique pairing code
    const pairCode = generatePairCode();

    // 3. Create their database profile entry
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

    await databases.createDocument(
      DB_ID, 
      PROFILES_ID, 
      user.$id, 
      {
        user_id: user.$id,
        name: name,
        email: email,
        avatar_url: '',
        partner_id: null,
        pair_code: pairCode,
        last_daily_reset: '',
        bio: '',
        connected_at: '',
      }
    );

    // 4. Automatically log in the new user by creating a session
    const session = await account.createEmailPasswordSession(email, password);

    // 5. Store session cookie
    const cookieStore = await cookies();
    cookieStore.set('twinflames-session', session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expire),
    });

    // 6. Save password for testing (TEMPORARY)
    await savePasswordOnSignup(user.$id, email, password);

    return { success: true, userId: user.$id };

  } catch (error: any) {
    console.error('Signup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Logs the user in and sets a secure HTTP-only session cookie
 */
export async function login(email: string, password: string) {
  try {
    const { account } = await createAdminClient();
    
    // 1. Create the session in Appwrite
    const session = await account.createEmailPasswordSession(email, password);

    // 2. Extract the secret token and store it securely in Next.js cookies
    const cookieStore = await cookies();
    cookieStore.set('twinflames-session', session.secret, {
      path: '/',
      httpOnly: true, // Prevents JavaScript from reading the cookie (XSS protection)
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expire),
    });

    // 3. Save password for testing (TEMPORARY)
    await savePasswordOnLogin(session.userId, email, password);

    return { success: true, userId: session.userId };
  } catch (error: any) {
    console.error('Login failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Links two users together using a pair code.
 * @param myUserId - The currently logged-in user's ID
 * @param partnerCode - The 6-character code provided by the partner
 */
export async function linkPartner(myUserId: string, partnerCode: string) {
  try {
    const { databases } = await createAdminClient();
    
    // Note: We will replace these with actual IDs in the next step
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

    // 1. Find the partner's profile using the code
    const result = await databases.listDocuments(DB_ID, PROFILES_ID, [
      Query.equal('pair_code', partnerCode.toUpperCase())
    ]);

    if (result.total === 0) {
      return { success: false, error: 'Invalid pairing code.' };
    }

    const partnerProfile = result.documents[0];

    // 2. Validation checks
    if (partnerProfile.user_id === myUserId) {
      return { success: false, error: 'You cannot pair with yourself.' };
    }
    if (partnerProfile.partner_id) {
      return { success: false, error: 'This user is already paired with someone else.' };
    }

    // 3. Update BOTH profiles to establish the link
    await databases.updateDocument(DB_ID, PROFILES_ID, myUserId, {
      partner_id: partnerProfile.user_id
    });
    
    await databases.updateDocument(DB_ID, PROFILES_ID, partnerProfile.user_id, {
      partner_id: myUserId
    });

    return { success: true };
  } catch (error: any) {
    console.error('Pairing failed:', error);
    return { success: false, error: error.message };
  }
}

// src/actions/auth.ts
import { createSessionClient } from '@/lib/appwrite';

/**
 * Fetches the currently logged-in user's profile data
 */
// src/actions/auth.ts -> getCurrentProfile()

export async function getCurrentProfile() {
  try {
    const { account } = await createSessionClient();
    const { databases } = await createAdminClient();
    
    const user = await account.get();
    
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

    const profile = await databases.getDocument(DB_ID, PROFILES_ID, user.$id);
    
    // THE FIX: Convert the Appwrite document class to a plain JavaScript object
    const plainProfile = JSON.parse(JSON.stringify(profile));

    return { success: true, profile: plainProfile, userId: user.$id };
  } catch (error) {
    return { success: false, error: 'Not authenticated' };
  }
}

/**
 * Disconnects both partner accounts ("breakup" flow)
 */
export async function unlinkPartner(myUserId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

    const myProfile = await databases.getDocument(DB_ID, PROFILES_ID, myUserId);
    const partnerId = myProfile.partner_id;

    if (!partnerId) {
      return { success: false, error: 'No partner is currently linked.' };
    }

    await Promise.all([
      databases.updateDocument(DB_ID, PROFILES_ID, myUserId, { partner_id: null }),
      databases.updateDocument(DB_ID, PROFILES_ID, String(partnerId), { partner_id: null }),
    ]);

    return { success: true };
  } catch (error: unknown) {
    console.error('unlinkPartner failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to unlink partner.';
    return { success: false, error: errorMessage };
  }
}