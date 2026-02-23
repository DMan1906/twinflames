'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import {
  addSocialFollow,
  addSocialPost,
  disconnectSocialConnection,
  getSocialConnections,
  getSocialFeed,
  refreshInstagramConnections,
  removeSocialItem,
  syncSocialFeed,
} from '@/actions/social';

type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'other';

type FollowItem = {
  id: string;
  platform: SocialPlatform;
  handle: string;
  profileUrl: string;
  createdBy: string;
  createdAt: string;
};

type PostItem = {
  id: string;
  platform: SocialPlatform;
  postUrl: string;
  caption: string;
  createdBy: string;
  createdAt: string;
};

type ConnectionItem = {
  id: string;
  platform: SocialPlatform;
  username: string;
  expiresAt: string;
  refreshNeeded?: boolean;
  isActive?: boolean;
  failureCount?: number;
  lastFailureReason?: string;
  ownerUserId: string;
};

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

function extractHandleFromUrl(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    const pathname = urlObj.pathname.replace(/\/$/, '');
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  } catch {
    return url.split('/').pop() || '';
  }
}

function getEmbedUrl(platform: string, postUrl: string): string | null {
  if (platform === 'youtube') {
    const videoId = postUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (platform === 'tiktok') {
    const videoId = postUrl.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)?.[1];
    return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
  }
  return null;
}

export default function SocialPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [managingConnection, setManagingConnection] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  const [followPlatform, setFollowPlatform] = useState<SocialPlatform>('instagram');
  const [followHandle, setFollowHandle] = useState('');
  const [followUrl, setFollowUrl] = useState('');

  const [postPlatform, setPostPlatform] = useState<SocialPlatform>('youtube');
  const [postUrl, setPostUrl] = useState('');
  const [caption, setCaption] = useState('');

  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const igStatus = searchParams.get('ig') || '';

  const groupedFollows = useMemo(() => {
    return follows.reduce<Record<string, FollowItem[]>>((acc, item) => {
      acc[item.platform] = acc[item.platform] || [];
      acc[item.platform].push(item);
      return acc;
    }, {});
  }, [follows]);

  const loadFeed = async (uid: string) => {
    const result = await getSocialFeed(uid);
    if (!result.success || !('follows' in result) || !('posts' in result)) {
      setError('Could not load social feed.');
      return;
    }

    setFollows((result.follows || []) as FollowItem[]);
    setPosts((result.posts || []) as PostItem[]);
    setError('');
  };

  const loadConnections = async (uid: string) => {
    const result = await getSocialConnections(uid);
    if (!result.success || !('connections' in result)) {
      return;
    }

    setConnections((result.connections || []) as ConnectionItem[]);
  };

  useEffect(() => {
    async function init() {
      const auth = await getCurrentProfile();
      if (!auth.success || !auth.userId || !auth.profile) {
        router.push('/');
        return;
      }

      if (!auth.profile.partner_id) {
        router.push('/pair');
        return;
      }

      setUserId(auth.userId);
      await loadFeed(auth.userId);
      await loadConnections(auth.userId);
      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (igStatus === 'connected') {
      setSyncMessage('Instagram connected! 🎉');
      setTimeout(() => setSyncMessage(''), 5000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [igStatus]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncSocialFeed(userId);
      if (result.success) {
        setSyncMessage('Feed synced successfully!');
        await loadFeed(userId);
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (err) {
      setSyncMessage('Failed to sync feed');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddFollow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followHandle.trim() || !userId) return;

    setSaving(true);
    const result = await addSocialFollow(userId, followPlatform, followHandle, normalizeUrl(followUrl || followHandle));
    if (result.success) {
      setFollowHandle('');
      setFollowUrl('');
      await loadFeed(userId);
    }
    setSaving(false);
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.trim() || !userId) return;

    setSaving(true);
    const result = await addSocialPost(userId, postPlatform, normalizeUrl(postUrl), caption);
    if (result.success) {
      setPostUrl('');
      setCaption('');
      await loadFeed(userId);
    }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    setSaving(true);
    await removeSocialItem(id);
    await loadFeed(userId);
    setSaving(false);
  };

  const handleRefreshConnection = async (connId: string) => {
    setManagingConnection(true);
    const result = await refreshInstagramConnections(userId);
    if (!result.success) {
      setSyncMessage('Failed to refresh connection');
      setTimeout(() => setSyncMessage(''), 3000);
    } else {
      await loadConnections(userId);
    }
    setManagingConnection(false);
  };

  const handleDisconnectConnection = async (connId: string) => {
    setManagingConnection(true);
    const result = await disconnectSocialConnection(connId);
    if (result.success) {
      await loadConnections(userId);
      setSyncMessage('Connection removed');
      setTimeout(() => setSyncMessage(''), 3000);
    }
    setManagingConnection(false);
  };

  const handleInitiateInstagramConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      setError('Instagram connection not configured');
      return;
    }

    const scope = 'user_profile,instagram_business_account';
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    window.location.href = authUrl;
  };

  if (loading) {
    return <main className="min-h-screen bg-[#0d0a14] p-6">Loading...</main>;
  }

  return (
    <main className="space-y-8 bg-[#0d0a14] p-6 pb-24">
      <header className="pt-4">
        <h1 className="text-3xl font-serif text-white">Social Feed</h1>
        <p className="mt-2 text-sm text-purple-300/60">Aggregate content from your favorite social platforms.</p>
      </header>

      {error && <div className="rounded-xl bg-red-600/20 p-4 text-sm text-red-300">{error}</div>}
      {syncMessage && <div className="rounded-xl bg-purple-600/20 p-4 text-sm text-purple-300">{syncMessage}</div>}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Feed'}
          </button>
          {!connections.find((c) => c.platform === 'instagram' && c.isActive) && (
            <button
              onClick={handleInitiateInstagramConnect}
              className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500"
            >
              Connect Instagram
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Connections</h2>
        {connections.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">
            No active connections yet.
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-lg border border-purple-900/40 bg-[#1a1525] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{conn.platform}</p>
                  <p className="text-xs text-purple-300/60">{conn.username}</p>
                  {conn.refreshNeeded && <p className="text-xs text-yellow-500">Refresh needed</p>}
                  {!conn.isActive && <p className="text-xs text-red-500">Connection disabled (too many failures)</p>}
                </div>
                <div className="flex gap-1">
                  {conn.platform === 'instagram' && conn.isActive && (
                    <button
                      onClick={() => handleRefreshConnection(conn.id)}
                      disabled={managingConnection}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  )}
                  {!conn.isActive && (
                    <button
                      onClick={handleInitiateInstagramConnect}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
                    >
                      Reconnect
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnectConnection(conn.id)}
                    disabled={managingConnection}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={handleAddFollow} className="space-y-4 rounded-2xl border border-purple-900/40 bg-[#1a1525] p-6">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Add Following</h2>
        <select
          value={followPlatform}
          onChange={(e) => setFollowPlatform(e.target.value as SocialPlatform)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        >
          <option>instagram</option>
          <option>tiktok</option>
          <option>youtube</option>
          <option>x</option>
          <option>other</option>
        </select>
        <input
          value={followHandle}
          onChange={(e) => setFollowHandle(e.target.value)}
          placeholder="Handle (e.g., @handle)"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <input
          value={followUrl}
          onChange={(e) => setFollowUrl(e.target.value)}
          placeholder="Profile URL (auto-detect if blank)"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <button
          type="submit"
          disabled={saving || !followHandle.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          Add Follow
        </button>
      </form>

      <form onSubmit={handleAddPost} className="space-y-4 rounded-2xl border border-purple-900/40 bg-[#1a1525] p-6">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Add Post</h2>
        <select
          value={postPlatform}
          onChange={(e) => setPostPlatform(e.target.value as SocialPlatform)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        >
          <option>youtube</option>
          <option>tiktok</option>
          <option>instagram</option>
          <option>x</option>
          <option>other</option>
        </select>
        <input
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="Post URL"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Optional caption"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <button
          type="submit"
          disabled={saving || !postUrl.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          Add Post
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Following</h2>
        {Object.keys(groupedFollows).length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">
            No followed accounts yet.
          </div>
        ) : (
          Object.entries(groupedFollows).map(([platform, items]) => (
            <div key={platform} className="space-y-2 rounded-xl border border-purple-900/40 bg-[#1a1525] p-4">
              <p className="text-xs uppercase tracking-widest text-purple-300/60">{platform}</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0d0a14] px-3 py-2">
                  <a
                    href={item.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-purple-200 underline"
                  >
                    {item.handle}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Posts</h2>
        {posts.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">
            No posts added yet.
          </div>
        ) : (
          posts.map((post) => {
            const embedUrl = getEmbedUrl(post.platform, post.postUrl);
            return (
              <article key={post.id} className="space-y-3 rounded-2xl border border-purple-900/40 bg-[#1a1525] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-widest text-purple-300/60">{post.platform}</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(post.id)}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>

                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="aspect-video w-full rounded-xl border border-purple-900/40"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : null}

                <a href={post.postUrl} target="_blank" rel="noreferrer" className="block text-sm text-purple-200 underline">
                  Open post
                </a>

                {post.caption ? <p className="text-sm text-purple-100">{post.caption}</p> : null}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
