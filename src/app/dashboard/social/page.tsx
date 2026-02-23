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
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function getEmbedUrl(platform: SocialPlatform, postUrl: string) {
  const url = normalizeUrl(postUrl);

  if (platform === 'youtube') {
    try {
      const parsed = new URL(url);
      const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    } catch {
      return null;
    }
  }

  if (platform === 'tiktok') {
    return null;
  }

  if (platform === 'instagram') {
    return null;
  }

  return null;
}

export default function SocialPage() {
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

  const handleAddFollow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    const result = await addSocialFollow(userId, followPlatform, followHandle, normalizeUrl(followUrl));
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not add follow account.');
      return;
    }

    setFollowHandle('');
    setFollowUrl('');
    await loadFeed(userId);
    await loadConnections(userId);
  };

  const handleAddPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    const result = await addSocialPost(userId, postPlatform, normalizeUrl(postUrl), caption);
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not add post.');
      return;
    }

    setPostUrl('');
    setCaption('');
    await loadFeed(userId);
  };

  const handleRemove = async (id: string) => {
    if (!userId) return;
    const result = await removeSocialItem(userId, id);
    if (!result.success) {
      setError(result.error || 'Could not remove item.');
      return;
    }

    await loadFeed(userId);
  };

  const handleSync = async () => {
    if (!userId) return;

    setSyncing(true);
    setSyncMessage('');
    const result = await syncSocialFeed(userId);
    setSyncing(false);

    if (!result.success) {
      setError(result.error || 'Could not sync social feed.');
      return;
    }

    const imported = 'imported' in result ? Number(result.imported || 0) : 0;
    const errors = 'errors' in result && Array.isArray(result.errors) ? result.errors : [];

    if (errors.length > 0) {
      setSyncMessage(`Imported ${imported} posts. Some sources failed: ${errors.slice(0, 2).join(' | ')}`);
    } else {
      setSyncMessage(`Imported ${imported} new posts.`);
    }

    await loadFeed(userId);
    await loadConnections(userId);
  };

  const handleRefreshInstagramTokens = async () => {
    if (!userId) return;
    setManagingConnection(true);
    const result = await refreshInstagramConnections(userId);
    setManagingConnection(false);

    if (!result.success) {
      setError(result.error || 'Could not refresh Instagram tokens.');
      return;
    }

    const refreshed = 'refreshed' in result ? Number(result.refreshed || 0) : 0;
    setSyncMessage(`Refreshed ${refreshed} Instagram connection token(s).`);
    await loadConnections(userId);
  };

  const handleDisconnectConnection = async (connectionId: string) => {
    if (!userId) return;
    setManagingConnection(true);
    const result = await disconnectSocialConnection(userId, connectionId);
    setManagingConnection(false);

    if (!result.success) {
      setError(result.error || 'Could not disconnect account.');
      return;
    }

    setSyncMessage('Disconnected social account.');
    await loadConnections(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading social feed...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Social Feed</h1>
        <p className="text-sm text-purple-300/60">Track profiles and curate post links across platforms together.</p>
        <p className="text-xs text-purple-300/50">Use Sync to import recent public posts from connected accounts. This can also run via cron.</p>
        <p className="text-xs text-purple-300/50">For official YouTube ingestion, set <span className="font-mono">YOUTUBE_DATA_API_KEY</span> and connect channel URLs.</p>
        <p className="text-xs text-purple-300/50">For official Instagram ingestion, set <span className="font-mono">INSTAGRAM_CLIENT_ID</span>, <span className="font-mono">INSTAGRAM_CLIENT_SECRET</span>, and <span className="font-mono">INSTAGRAM_REDIRECT_URI</span>.</p>
      </header>

      {igStatus ? <p className="text-sm text-purple-200/80">Instagram status: {igStatus.replaceAll('-', ' ')}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {syncMessage ? <p className="text-sm text-emerald-300">{syncMessage}</p> : null}

      <a
        href="/api/social/instagram/connect"
        className="block w-full rounded-xl border border-purple-700/50 bg-[#1a1525] px-4 py-3 text-center text-sm font-semibold text-purple-100 hover:bg-[#241a36]"
      >
        Connect Instagram (Official OAuth)
      </a>

      {connections.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-widest text-purple-300/70">Connected Accounts</h2>
            <button
              type="button"
              onClick={handleRefreshInstagramTokens}
              disabled={managingConnection}
              className="rounded bg-purple-700 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Refresh Tokens
            </button>
          </div>
          {connections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0d0a14] px-3 py-2 text-sm text-purple-100">
              <div>
                <div>{connection.platform} {connection.username ? `@${connection.username}` : ''}</div>
                <div className="text-xs text-purple-300/70">
                  Status: {connection.isActive ? 'active' : 'disabled'}
                </div>
                {connection.expiresAt ? (
                  <div className="text-xs text-purple-300/70">
                    Expires: {new Date(connection.expiresAt).toLocaleDateString()}
                    {connection.refreshNeeded ? ' • refresh soon' : ''}
                  </div>
                ) : null}
                {(connection.failureCount || 0) > 0 ? (
                  <div className="text-xs text-amber-300/80">
                    Failures: {connection.failureCount}
                    {connection.lastFailureReason ? ` • ${connection.lastFailureReason}` : ''}
                  </div>
                ) : null}
              </div>
              {connection.isActive ? (
                <button
                  type="button"
                  onClick={() => handleDisconnectConnection(connection.id)}
                  disabled={managingConnection}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href="/api/social/instagram/connect"
                  className="rounded bg-purple-600 px-2 py-1 text-xs text-white"
                >
                  Reconnect
                </a>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <button
        type="button"
        onClick={handleSync}
        disabled={syncing || saving || follows.length === 0}
        className="w-full rounded-xl border border-purple-700/50 bg-[#1a1525] px-4 py-3 text-sm font-semibold text-purple-100 hover:bg-[#241a36] disabled:opacity-50"
      >
        {syncing ? 'Syncing feed...' : 'Sync Feed from Connected Accounts'}
      </button>

      <form onSubmit={handleAddFollow} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <p className="text-sm font-semibold text-white">Follow account</p>
        <select
          value={followPlatform}
          onChange={(event) => setFollowPlatform(event.target.value as SocialPlatform)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        >
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="x">X</option>
          <option value="other">Other</option>
        </select>
        <input
          value={followHandle}
          onChange={(event) => setFollowHandle(event.target.value)}
          placeholder="Handle / account name"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <input
          value={followUrl}
          onChange={(event) => setFollowUrl(event.target.value)}
          placeholder="Profile URL"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <button
          type="submit"
          disabled={saving || !followHandle.trim() || !followUrl.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          Add Follow
        </button>
      </form>

      <form onSubmit={handleAddPost} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <p className="text-sm font-semibold text-white">Add post link</p>
        <select
          value={postPlatform}
          onChange={(event) => setPostPlatform(event.target.value as SocialPlatform)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        >
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="x">X</option>
          <option value="other">Other</option>
        </select>
        <input
          value={postUrl}
          onChange={(event) => setPostUrl(event.target.value)}
          placeholder="Post URL"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        />
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
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
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">No followed accounts yet.</div>
        ) : (
          Object.entries(groupedFollows).map(([platform, items]) => (
            <div key={platform} className="space-y-2 rounded-xl border border-purple-900/40 bg-[#1a1525] p-4">
              <p className="text-xs uppercase tracking-widest text-purple-300/60">{platform}</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0d0a14] px-3 py-2">
                  <a href={item.profileUrl} target="_blank" rel="noreferrer" className="text-sm text-purple-200 underline">
                    {item.handle}
                  </a>
                  <button type="button" onClick={() => handleRemove(item.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">
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
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">No posts added yet.</div>
        ) : (
          posts.map((post) => {
            const embedUrl = getEmbedUrl(post.platform, post.postUrl);
            return (
              <article key={post.id} className="space-y-3 rounded-2xl border border-purple-900/40 bg-[#1a1525] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-widest text-purple-300/60">{post.platform}</p>
                  <button type="button" onClick={() => handleRemove(post.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">
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
