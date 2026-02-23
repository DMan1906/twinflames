// src/lib/appwrite/client.ts

import { Client, Account, Databases, Messaging } from 'appwrite';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;

// Normalize endpoint for WebSocket compatibility
// Remove /v1 suffix if present, Appwrite SDK handles it automatically
const normalizedEndpoint = ENDPOINT.endsWith('/v1') ? ENDPOINT.slice(0, -3) : ENDPOINT;

// Main client for all operations
const client = new Client()
    .setEndpoint(normalizedEndpoint)
    .setProject(PROJECT);

export const account = new Account(client);
export const messaging = new Messaging(client);
export { client };

// Real-time subscriptions client - uses same endpoint and project
export const appwriteClient = new Client()
  .setEndpoint(normalizedEndpoint)
  .setProject(PROJECT);

export const databases = new Databases(appwriteClient);