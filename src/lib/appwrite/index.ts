// src/lib/appwrite/index.ts
import 'server-only';
import { Client, Account, Databases, Users, Messaging } from 'node-appwrite'; // Added Messaging
import { cookies } from 'next/headers';

// Environment variables
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;
const API_KEY = process.env.NEXT_APPWRITE_KEY!;

/**
 * ADMIN CLIENT
 * Has full read/write access to everything. 
 * Use this for creating users, handling encryption, and updating pair codes.
 */
// Check that this is in your src/lib/appwrite/index.ts
export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);

  return {
    get account() { return new Account(client); },
    get databases() { return new Databases(client); },
    get users() { return new Users(client); },
    get messaging() { return new Messaging(client); }, // Ensure this exists
  };
}

/**
 * SESSION CLIENT
 * Tied to the specific user's login cookie. 
 */
export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT);

  const cookieStore = await cookies();
  const session = cookieStore.get('twinflames-session');

  if (!session || !session.value) {
    throw new Error('No active session');
  }

  client.setSession(session.value);

  return {
    get account() { return new Account(client); },
    get databases() { return new Databases(client); }, // Added for session-scoped DB calls
  };
}