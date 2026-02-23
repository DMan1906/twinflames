import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveInstagramConnection } from '@/actions/social';

type InstagramTokenResponse = {
  access_token?: string;
  user_id?: number;
  error_message?: string;
};

type InstagramLongLivedResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') || '';
  const state = request.nextUrl.searchParams.get('state') || '';
  const errorReason = request.nextUrl.searchParams.get('error_reason') || '';

  if (errorReason) {
    return NextResponse.redirect(new URL(`/dashboard/social?ig=denied`, request.url));
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get('ig-oauth-state')?.value || '';
  cookieStore.delete('ig-oauth-state');

  if (!stateCookie || !state || stateCookie !== state) {
    return NextResponse.redirect(new URL('/dashboard/social?ig=state-mismatch', request.url));
  }

  const [userId] = state.split(':');
  if (!userId || !code) {
    return NextResponse.redirect(new URL('/dashboard/social?ig=invalid-callback', request.url));
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID || '';
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || '';
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || '';

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/dashboard/social?ig=missing-config', request.url));
  }

  try {
    const form = new URLSearchParams();
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', redirectUri);
    form.set('code', code);

    const shortResp = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
    });

    if (!shortResp.ok) {
      return NextResponse.redirect(new URL('/dashboard/social?ig=token-exchange-failed', request.url));
    }

    const shortData = (await shortResp.json()) as InstagramTokenResponse;
    const shortAccessToken = String(shortData.access_token || '');
    if (!shortAccessToken) {
      return NextResponse.redirect(new URL('/dashboard/social?ig=token-missing', request.url));
    }

    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', clientSecret);
    longUrl.searchParams.set('access_token', shortAccessToken);

    const longResp = await fetch(longUrl.toString(), { cache: 'no-store' });
    if (!longResp.ok) {
      return NextResponse.redirect(new URL('/dashboard/social?ig=long-token-failed', request.url));
    }

    const longData = (await longResp.json()) as InstagramLongLivedResponse;
    const longToken = String(longData.access_token || '');
    const expiresIn = Number(longData.expires_in || 0);

    if (!longToken || !expiresIn) {
      return NextResponse.redirect(new URL('/dashboard/social?ig=invalid-token', request.url));
    }

    const save = await saveInstagramConnection(userId, longToken, expiresIn);
    if (!save.success) {
      return NextResponse.redirect(new URL('/dashboard/social?ig=save-failed', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard/social?ig=connected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/dashboard/social?ig=oauth-error', request.url));
  }
}
