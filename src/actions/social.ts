'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'other';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected social error';
}

function getSocialCollectionId() {
  const id = process.env.NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID;
  if (!id) {
    throw new Error('NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID is not configured');
  }
  return id;
}

function getSocialConnectionsCollectionId() {
  const id = process.env.NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID;
  if (!id) {
    throw new Error('NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID is not configured');
  }
  return id;
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function normalizeIncomingUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function parseYouTubeChannelIdFromUrl(profileUrl: string) {
  const normalized = normalizeIncomingUrl(profileUrl);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'channel') {
      return parts[1];
    }
    return '';
  } catch {
    return '';
  }
}

function parseYouTubeHandleFromUrl(profileUrl: string) {
  const normalized = normalizeIncomingUrl(profileUrl);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 1 && parts[0].startsWith('@')) {
      return parts[0].slice(1);
    }
    return '';
  } catch {
    return '';
  }
}

function parseYouTubeUsernameFromUrl(profileUrl: string) {
  const normalized = normalizeIncomingUrl(profileUrl);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'user') {
      return parts[1];
    }
    return '';
  } catch {
    return '';
  }
}

async function fetchYouTubeJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`YouTube API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function resolveYouTubeChannelId(profileUrl: string, apiKey: string) {
  const direct = parseYouTubeChannelIdFromUrl(profileUrl);
  if (direct) return direct;

  const handle = parseYouTubeHandleFromUrl(profileUrl);
  if (handle) {
    type ChannelsResponse = { items?: Array<{ id?: string }> };
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(
      handle,
    )}&key=${encodeURIComponent(apiKey)}`;
    const data = await fetchYouTubeJson<ChannelsResponse>(url);
    const id = data.items?.[0]?.id || '';
    if (id) return id;
  }

  const username = parseYouTubeUsernameFromUrl(profileUrl);
  if (username) {
    type ChannelsResponse = { items?: Array<{ id?: string }> };
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(
      username,
    )}&key=${encodeURIComponent(apiKey)}`;
    const data = await fetchYouTubeJson<ChannelsResponse>(url);
    const id = data.items?.[0]?.id || '';
    if (id) return id;
  }

  return '';
}

async function fetchRecentYouTubeVideoUrls(profileUrl: string, apiKey: string) {
  type ChannelsContentResponse = {
    items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
  };
  type PlaylistItemsResponse = {
    items?: Array<{ snippet?: { resourceId?: { videoId?: string } } }>;
  };

  const channelId = await resolveYouTubeChannelId(profileUrl, apiKey);
  if (!channelId) return [];

  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(
    channelId,
  )}&key=${encodeURIComponent(apiKey)}`;
  const channelData = await fetchYouTubeJson<ChannelsContentResponse>(channelUrl);
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || '';
  if (!uploadsPlaylistId) return [];

  const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(
    uploadsPlaylistId,
  )}&maxResults=15&key=${encodeURIComponent(apiKey)}`;
  const videosData = await fetchYouTubeJson<PlaylistItemsResponse>(videosUrl);

  const videoUrls = (videosData.items || [])
    .map((item) => item.snippet?.resourceId?.videoId || '')
    .filter(Boolean)
    .map((videoId) => `https://www.youtube.com/watch?v=${videoId}`);

  return uniq(videoUrls);
}

async function fetchPublicProfileHtml(profileUrl: string) {
  const url = normalizeIncomingUrl(profileUrl);
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Could not read profile (${response.status})`);
  }

  return response.text();
}

type InstagramMediaResponse = {
  data?: Array<{ permalink?: string; caption?: string }>;
};

type InstagramProfileResponse = {
  id?: string;
  username?: string;
};

type InstagramRefreshResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

async function fetchInstagramJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Instagram API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function fetchInstagramProfile(accessToken: string) {
  const url = `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`;
  return fetchInstagramJson<InstagramProfileResponse>(url);
}

async function refreshInstagramAccessToken(accessToken: string) {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', accessToken);

  return fetchInstagramJson<InstagramRefreshResponse>(url.toString());
}

async function fetchRecentInstagramPosts(accessToken: string) {
  const url = `https://graph.instagram.com/me/media?fields=id,caption,permalink,timestamp&limit=20&access_token=${encodeURIComponent(accessToken)}`;
  const data = await fetchInstagramJson<InstagramMediaResponse>(url);

  return (data.data || [])
    .map((item) => ({
      postUrl: normalizeIncomingUrl(String(item.permalink || '')),
      caption: String(item.caption || '').trim(),
    }))
    .filter((item) => item.postUrl);
}

async function upsertInstagramConnection(
  userId: string,
  accessToken: string,
  expiresAtIso: string,
) {
  const CONNECTIONS_ID = getSocialConnectionsCollectionId();
  if (!CONNECTIONS_ID) {
    throw new Error('Social connections collection is not configured.');
  }

  const profile = await fetchInstagramProfile(accessToken);
  const externalAccountId = String(profile.id || '');
  const externalUsername = String(profile.username || '');

  const { databases, DB_ID, chatId } = await getPairContext(userId);

  const existing = await databases.listDocuments(DB_ID, CONNECTIONS_ID, [
    Query.equal('chat_id', chatId),
    Query.equal('platform', 'instagram'),
    Query.equal('external_account_id', externalAccountId),
    Query.limit(1),
  ]);

  const payload = {
    chat_id: chatId,
    platform: 'instagram',
    owner_user_id: userId,
    external_account_id: externalAccountId,
    external_username: externalUsername,
    access_token_enc: encryptData(accessToken),
    refresh_token_enc: '',
    expires_at: expiresAtIso,
    is_active: true,
    updated_at: todayString(),
  };

  if (existing.total > 0) {
    await databases.updateDocument(DB_ID, CONNECTIONS_ID, String(existing.documents[0].$id), payload);
  } else {
    await databases.createDocument(DB_ID, CONNECTIONS_ID, ID.unique(), {
      ...payload,
      created_at: todayString(),
    });
  }

  return {
    externalAccountId,
    externalUsername,
    chatId,
  };
}

function daysUntil(dateIso: string) {
  const ts = Date.parse(dateIso);
  if (Number.isNaN(ts)) return -1;
  return (ts - Date.now()) / (1000 * 60 * 60 * 24);
}

function parseFailureMeta(raw: string) {
  const input = String(raw || '');
  if (!input.startsWith('meta:fail:')) {
    return { count: 0, reason: '' };
  }

  const parts = input.split(':');
  const count = Number(parts[2] || 0);
  const reason = parts.slice(3).join(':');
  return {
    count: Number.isFinite(count) ? count : 0,
    reason,
  };
}

function formatFailureMeta(count: number, reason: string) {
  const safeReason = reason.replace(/\s+/g, ' ').slice(0, 180);
  return `meta:fail:${Math.max(0, count)}:${safeReason}`;
}

async function getInstagramConnectionDocs(userId: string) {
  const CONNECTIONS_ID = getSocialConnectionsCollectionId();
  if (!CONNECTIONS_ID) {
    throw new Error('Social connections collection is not configured.');
  }

  const { databases, DB_ID, chatId } = await getPairContext(userId);
  const docs = await databases.listDocuments(DB_ID, CONNECTIONS_ID, [
    Query.equal('chat_id', chatId),
    Query.equal('is_active', true),
    Query.equal('platform', 'instagram'),
    Query.limit(50),
  ]);

  return {
    databases,
    DB_ID,
    CONNECTIONS_ID,
    chatId,
    docs,
  };
}

function scrapeInstagramPosts(html: string) {
  const matches = html.match(/https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/?/g) || [];
  return uniq(matches).slice(0, 12);
}

function scrapeTikTokPosts(html: string) {
  const matches = html.match(/https:\/\/www\.tiktok\.com\/@[^"\s/]+\/video\/\d+/g) || [];
  return uniq(matches).slice(0, 12);
}

function scrapeXPosts(html: string) {
  const xMatches = html.match(/https:\/\/x\.com\/[^"\s/]+\/status\/\d+/g) || [];
  const twitterMatches = html.match(/https:\/\/twitter\.com\/[^"\s/]+\/status\/\d+/g) || [];
  const normalized = [...xMatches, ...twitterMatches].map((url) =>
    url.replace('https://twitter.com/', 'https://x.com/'),
  );
  return uniq(normalized).slice(0, 12);
}

function scrapeYouTubePosts(html: string) {
  const directUrls = html.match(/https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,}/g) || [];
  const videoIdMatches = [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{6,})"/g)].map((m) => m[1]);
  const fromIds = videoIdMatches.map((id) => `https://www.youtube.com/watch?v=${id}`);
  return uniq([...directUrls, ...fromIds]).slice(0, 12);
}

function scrapePublicPostsForPlatform(platform: SocialPlatform, html: string) {
  if (platform === 'instagram') return scrapeInstagramPosts(html);
  if (platform === 'tiktok') return scrapeTikTokPosts(html);
  if (platform === 'youtube') return scrapeYouTubePosts(html);
  if (platform === 'x') return scrapeXPosts(html);
  return [];
}

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need a partner to use social feed.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, chatId };
}

export async function addSocialFollow(
  userId: string,
  platform: SocialPlatform,
  handle: string,
  profileUrl: string,
) {
  if (!handle.trim() || !profileUrl.trim()) {
    return { success: false, error: 'Handle and profile URL are required.' };
  }

  try {
    const SOCIAL_ID = getSocialCollectionId();
    if (!SOCIAL_ID) {
      return { success: false, error: 'Social collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, SOCIAL_ID, ID.unique(), {
      chat_id: chatId,
      item_type: 'follow',
      platform,
      handle: encryptData(handle.trim()),
      profile_url: normalizeIncomingUrl(profileUrl),
      post_url: '',
      caption: '',
      created_by: userId,
      is_active: true,
      created_at: todayString(),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function addSocialPost(
  userId: string,
  platform: SocialPlatform,
  postUrl: string,
  caption = '',
) {
  if (!postUrl.trim()) {
    return { success: false, error: 'Post URL is required.' };
  }

  try {
    const SOCIAL_ID = getSocialCollectionId();
    if (!SOCIAL_ID) {
      return { success: false, error: 'Social collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, SOCIAL_ID, ID.unique(), {
      chat_id: chatId,
      item_type: 'post',
      platform,
      handle: '',
      profile_url: '',
      post_url: normalizeIncomingUrl(postUrl),
      caption: caption.trim() ? encryptData(caption.trim()) : '',
      created_by: userId,
      is_active: true,
      created_at: todayString(),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getSocialFeed(userId: string) {
  try {
    const SOCIAL_ID = getSocialCollectionId();
    if (!SOCIAL_ID) {
      return { success: false, error: 'Social collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const docs = await databases.listDocuments(DB_ID, SOCIAL_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('is_active', true),
      Query.orderDesc('$createdAt'),
      Query.limit(300),
    ]);

    const follows = docs.documents
      .filter((doc) => String(doc.item_type) === 'follow')
      .map((doc) => ({
        id: String(doc.$id),
        platform: String(doc.platform) as SocialPlatform,
        handle: doc.handle ? decryptData(String(doc.handle)) : '',
        profileUrl: String(doc.profile_url || ''),
        createdBy: String(doc.created_by),
        createdAt: String(doc.$createdAt),
      }));

    const posts = docs.documents
      .filter((doc) => String(doc.item_type) === 'post')
      .map((doc) => ({
        id: String(doc.$id),
        platform: String(doc.platform) as SocialPlatform,
        postUrl: String(doc.post_url || ''),
        caption: doc.caption ? decryptData(String(doc.caption)) : '',
        createdBy: String(doc.created_by),
        createdAt: String(doc.$createdAt),
      }));

    return { success: true, follows, posts };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function removeSocialItem(userId: string, itemId: string) {
  if (!itemId) {
    return { success: false, error: 'Item id is required.' };
  }

  try {
    const SOCIAL_ID = getSocialCollectionId();
    if (!SOCIAL_ID) {
      return { success: false, error: 'Social collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const doc = await databases.getDocument(DB_ID, SOCIAL_ID, itemId);

    if (String(doc.chat_id) !== chatId) {
      return { success: false, error: 'Item does not belong to this relationship.' };
    }

    await databases.updateDocument(DB_ID, SOCIAL_ID, itemId, {
      is_active: false,
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function saveInstagramConnection(
  userId: string,
  accessToken: string,
  expiresInSeconds: number,
) {
  if (!userId || !accessToken) {
    return { success: false, error: 'Missing Instagram connection parameters.' };
  }

  try {
    const expiresAtIso = new Date(Date.now() + Math.max(0, expiresInSeconds) * 1000).toISOString();
    const saved = await upsertInstagramConnection(userId, accessToken, expiresAtIso);

    return {
      success: true,
      username: saved.externalUsername,
      accountId: saved.externalAccountId,
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getSocialConnections(userId: string) {
  try {
    const CONNECTIONS_ID = getSocialConnectionsCollectionId();
    if (!CONNECTIONS_ID) {
      return { success: false, error: 'Social connections collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const docs = await databases.listDocuments(DB_ID, CONNECTIONS_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$updatedAt'),
      Query.limit(100),
    ]);

    const connections = docs.documents.map((doc) => {
      const expiresAt = String(doc.expires_at || '');
      const remainingDays = daysUntil(expiresAt);
      const failureMeta = parseFailureMeta(String(doc.refresh_token_enc || ''));

      return {
        id: String(doc.$id),
        platform: String(doc.platform || 'other') as SocialPlatform,
        username: String(doc.external_username || ''),
        expiresAt,
        refreshNeeded: remainingDays <= 7,
        isActive: Boolean(doc.is_active),
        failureCount: failureMeta.count,
        lastFailureReason: failureMeta.reason,
        ownerUserId: String(doc.owner_user_id || ''),
      };
    });

    return { success: true, connections };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function disconnectSocialConnection(userId: string, connectionId: string) {
  if (!connectionId) {
    return { success: false, error: 'Connection id is required.' };
  }

  try {
    const CONNECTIONS_ID = getSocialConnectionsCollectionId();
    if (!CONNECTIONS_ID) {
      return { success: false, error: 'Social connections collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const doc = await databases.getDocument(DB_ID, CONNECTIONS_ID, connectionId);

    if (String(doc.chat_id) !== chatId) {
      return { success: false, error: 'Connection does not belong to this relationship.' };
    }

    await databases.updateDocument(DB_ID, CONNECTIONS_ID, connectionId, {
      is_active: false,
      access_token_enc: '',
      refresh_token_enc: '',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function refreshInstagramConnections(userId: string) {
  try {
    const { databases, DB_ID, CONNECTIONS_ID, docs } = await getInstagramConnectionDocs(userId);

    let refreshed = 0;
    const errors: string[] = [];

    for (const connection of docs.documents) {
      const encryptedToken = String(connection.access_token_enc || '');
      if (!encryptedToken) continue;

      const expiresAt = String(connection.expires_at || '');
      const remainingDays = daysUntil(expiresAt);
      if (remainingDays > 7) continue;

      try {
        const currentToken = decryptData(encryptedToken);
        const refreshedToken = await refreshInstagramAccessToken(currentToken);
        const newToken = String(refreshedToken.access_token || '');
        const expiresIn = Number(refreshedToken.expires_in || 0);
        if (!newToken || !expiresIn) {
          throw new Error('Instagram refresh returned invalid token');
        }

        const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        await databases.updateDocument(DB_ID, CONNECTIONS_ID, String(connection.$id), {
          access_token_enc: encryptData(newToken),
          refresh_token_enc: '',
          expires_at: newExpiresAt,
          updated_at: todayString(),
        });
        refreshed += 1;
      } catch (error: unknown) {
        const reason = getErrorMessage(error);
        const previousMeta = parseFailureMeta(String(connection.refresh_token_enc || ''));
        const nextCount = previousMeta.count + 1;
        const shouldDisable = nextCount >= 3;

        await databases.updateDocument(DB_ID, CONNECTIONS_ID, String(connection.$id), {
          refresh_token_enc: formatFailureMeta(nextCount, reason),
          is_active: !shouldDisable,
          updated_at: todayString(),
        });

        const prefix = shouldDisable ? 'disabled-after-retries' : 'refresh-failed';
        errors.push(String(connection.$id) + `: ${prefix} (${nextCount}) ${reason}`);
      }
    }

    return { success: true, refreshed, errors };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function syncSocialFeed(userId: string) {
  try {
    const SOCIAL_ID = getSocialCollectionId();
    if (!SOCIAL_ID) {
      return { success: false, error: 'Social collection is not configured.' };
    }

    const CONNECTIONS_ID = getSocialConnectionsCollectionId();

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const docs = await databases.listDocuments(DB_ID, SOCIAL_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('is_active', true),
      Query.limit(500),
    ]);

    const followDocs = docs.documents.filter((doc) => String(doc.item_type) === 'follow');
    const existingPostUrls = new Set(
      docs.documents
        .filter((doc) => String(doc.item_type) === 'post')
        .map((doc) => String(doc.post_url || '')),
    );

    let imported = 0;
    const syncErrors: string[] = [];
    const youtubeApiKey = process.env.YOUTUBE_DATA_API_KEY || '';

    if (CONNECTIONS_ID) {
      const refreshResult = await refreshInstagramConnections(userId);
      if (!refreshResult.success) {
        syncErrors.push(`instagram-refresh: ${refreshResult.error || 'refresh failed'}`);
      } else if ('errors' in refreshResult && Array.isArray(refreshResult.errors) && refreshResult.errors.length > 0) {
        syncErrors.push(...refreshResult.errors.map((item) => `instagram-refresh: ${item}`));
      }

      const connectionDocs = await databases.listDocuments(DB_ID, CONNECTIONS_ID, [
        Query.equal('chat_id', chatId),
        Query.equal('is_active', true),
        Query.equal('platform', 'instagram'),
        Query.limit(50),
      ]);

      for (const connection of connectionDocs.documents) {
        try {
          const encryptedToken = String(connection.access_token_enc || '');
          if (!encryptedToken) continue;
          const accessToken = decryptData(encryptedToken);
          const posts = await fetchRecentInstagramPosts(accessToken);

          for (const post of posts) {
            const normalized = normalizeIncomingUrl(post.postUrl);
            if (!normalized || existingPostUrls.has(normalized)) continue;

            await databases.createDocument(DB_ID, SOCIAL_ID, ID.unique(), {
              chat_id: chatId,
              item_type: 'post',
              platform: 'instagram',
              handle: '',
              profile_url: '',
              post_url: normalized,
              caption: post.caption ? encryptData(post.caption) : '',
              created_by: String(connection.owner_user_id || userId),
              is_active: true,
              created_at: todayString(),
            });

            existingPostUrls.add(normalized);
            imported += 1;
          }
        } catch (error: unknown) {
          syncErrors.push(`instagram-api: ${getErrorMessage(error)}`);
        }
      }
    }

    for (const followDoc of followDocs) {
      const platform = String(followDoc.platform) as SocialPlatform;
      const profileUrl = normalizeIncomingUrl(String(followDoc.profile_url || ''));
      if (!profileUrl) continue;

      try {
        let scrapedUrls: string[] = [];

        if (platform === 'youtube' && youtubeApiKey) {
          scrapedUrls = await fetchRecentYouTubeVideoUrls(profileUrl, youtubeApiKey);
        }

        if (scrapedUrls.length === 0) {
          const html = await fetchPublicProfileHtml(profileUrl);
          scrapedUrls = scrapePublicPostsForPlatform(platform, html);
        }

        for (const scrapedUrl of scrapedUrls) {
          const normalized = normalizeIncomingUrl(scrapedUrl);
          if (!normalized || existingPostUrls.has(normalized)) continue;

          await databases.createDocument(DB_ID, SOCIAL_ID, ID.unique(), {
            chat_id: chatId,
            item_type: 'post',
            platform,
            handle: '',
            profile_url: '',
            post_url: normalized,
            caption: '',
            created_by: userId,
            is_active: true,
            created_at: todayString(),
          });

          existingPostUrls.add(normalized);
          imported += 1;
        }
      } catch (error: unknown) {
        syncErrors.push(`${platform}: ${getErrorMessage(error)}`);
      }
    }

    return {
      success: true,
      imported,
      errors: syncErrors,
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
