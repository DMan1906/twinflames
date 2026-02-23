import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionClient } from '@/lib/appwrite';

export async function GET(request: NextRequest) {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    const clientId = process.env.INSTAGRAM_CLIENT_ID || '';
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || '';

    if (!clientId || !redirectUri) {
      return NextResponse.redirect(new URL('/dashboard/social?ig=missing-config', request.url));
    }

    const state = `${user.$id}:${crypto.randomUUID()}`;
    const cookieStore = await cookies();
    cookieStore.set('ig-oauth-state', state, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10,
    });

    const authorizeUrl = new URL('https://api.instagram.com/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'user_profile,user_media');
    authorizeUrl.searchParams.set('state', state);

    return NextResponse.redirect(authorizeUrl);
  } catch {
    return NextResponse.redirect(new URL('/dashboard/social?ig=auth-required', request.url));
  }
}
