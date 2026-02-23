// src/actions/test-password.ts
// TEMPORARY: Password storage for testing purposes only
// DELETE THIS FILE AFTER TESTING

'use server';

import { ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';

/**
 * Saves password on account creation (testing only)
 * ⚠️ This is UNSAFE and only for testing
 */
export async function savePasswordOnSignup(userId: string, email: string, password: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PWD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID;

    if (!PWD_COL_ID) {
      console.warn('Test password collection not configured, skipping');
      return { success: true }; // Don't fail if not configured
    }

    // Format timestamp as YYYY-MM-DD HH:MM:SS (19 chars, fits in 20)
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

    // Save password with creation timestamp
    await databases.createDocument(DB_ID, PWD_COL_ID, userId, {
      user_id: userId,
      email,
      password, // Plain text - TESTING ONLY
      created_at: timestamp,
      last_login: '',
    });

    console.log(`✓ Password saved for ${email}`);
    return { success: true };
  } catch (error: any) {
    console.warn('Failed to save password for testing:', error.message);
    return { success: true }; // Don't fail the signup, just skip saving password
  }
}

/**
 * Saves password on login (testing only)
 * ⚠️ This is UNSAFE and only for testing
 */
export async function savePasswordOnLogin(userId: string, email: string, password: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PWD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID;

    if (!PWD_COL_ID) {
      console.warn('Test password collection not configured, skipping');
      return { success: true };
    }

    // Format timestamp as YYYY-MM-DD HH:MM:SS (19 chars, fits in 20)
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

    // Try to get existing document
    try {
      await databases.getDocument(DB_ID, PWD_COL_ID, userId);

      // Document exists, update with new login timestamp
      await databases.updateDocument(DB_ID, PWD_COL_ID, userId, {
        password, // Update password
        last_login: timestamp,
      });

      console.log(`✓ Password updated for ${email} at login`);
    } catch {
      // Document doesn't exist, create it (in case passwords not saved at signup)
      await databases.createDocument(DB_ID, PWD_COL_ID, userId, {
        user_id: userId,
        email,
        password,
        created_at: timestamp,
        last_login: timestamp,
      });

      console.log(`✓ Password saved for ${email} at login (created new record)`);
    }

    return { success: true };
  } catch (error: any) {
    console.warn('Failed to save password at login:', error.message);
    return { success: true }; // Don't fail the login
  }
}

/**
 * Retrieves saved password for a user (testing only)
 * ⚠️ This is UNSAFE and only for testing
 */
export async function getTestPassword(userId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PWD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID;

    if (!PWD_COL_ID) {
      return { success: false, error: 'Test password collection not configured' };
    }

    const doc = await databases.getDocument(DB_ID, PWD_COL_ID, userId);
    return { success: true, password: doc.password, email: doc.email };
  } catch (error: any) {
    return { success: false, error: 'Password not found' };
  }
}

/**
 * Deletes all test passwords (cleanup after testing)
 * ⚠️ Use this to clean up before going to production
 */
export async function deleteAllTestPasswords() {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PWD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID;

    if (!PWD_COL_ID) {
      return { success: false, error: 'Test password collection not configured' };
    }

    // Get all documents
    const docs = await databases.listDocuments(DB_ID, PWD_COL_ID);

    // Delete each one
    for (const doc of docs.documents) {
      await databases.deleteDocument(DB_ID, PWD_COL_ID, doc.$id);
      console.log(`✓ Deleted password record for ${doc.email}`);
    }

    return { success: true, deleted: docs.documents.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
