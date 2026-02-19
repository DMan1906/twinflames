// src/lib/appwrite/client.ts

import { Client, Account, Databases, Messaging } from 'appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const messaging = new Messaging(client);
export { client };

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;

// Initialize the standard web client for real-time subscriptions
export const appwriteClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT);

export const databases = new Databases(appwriteClient);