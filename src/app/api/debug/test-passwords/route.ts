// src/app/api/debug/test-passwords/route.ts
// TEMPORARY: Debug endpoint for testing password logging
// DELETE THIS AFTER TESTING

import { getTestPassword, deleteAllTestPasswords } from '@/actions/test-password';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const PWD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID;

    if (!PWD_COL_ID) {
      return Response.json({
        error: 'Test passwords collection not configured',
      });
    }

    const { databases } = await createAdminClient();

    // Get specific password
    if (action === 'get' && userId) {
      const result = await getTestPassword(userId);
      if (result.success) {
        return Response.json({
          success: true,
          userId,
          email: result.email,
          password: result.password,
          message: '✓ Password found',
        });
      } else {
        return Response.json({
          success: false,
          error: 'Password not found for this user',
        });
      }
    }

    // Get all passwords
    if (action === 'list') {
      const docs = await databases.listDocuments(DB_ID, PWD_COL_ID);
      return Response.json({
        success: true,
        total: docs.total,
        passwords: docs.documents.map((doc) => ({
          user_id: doc.user_id,
          email: doc.email,
          password: doc.password,
          created_at: doc.created_at,
          last_login: doc.last_login,
        })),
      });
    }

    // Delete all
    if (action === 'delete-all') {
      const result = await deleteAllTestPasswords();
      if (result.success) {
        return Response.json({
          success: true,
          message: `✓ Deleted ${result.deleted} password records`,
          deleted: result.deleted,
        });
      } else {
        return Response.json({
          success: false,
          error: result.error,
        });
      }
    }

    // Default: show all passwords
    const docs = await databases.listDocuments(DB_ID, PWD_COL_ID);
    return Response.json({
      success: true,
      total: docs.total,
      instructions: {
        list: '/api/debug/test-passwords?action=list',
        get: '/api/debug/test-passwords?action=get&userId=USER_ID',
        deleteAll: '/api/debug/test-passwords?action=delete-all',
      },
      passwords: docs.documents.map((doc) => ({
        user_id: doc.user_id,
        email: doc.email,
        password: doc.password,
        created_at: doc.created_at,
        last_login: doc.last_login,
      })),
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
