import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveSafeRedirectPath } from '@/shared/lib/safeRedirect';

function redirectWithProxySecurity(request: NextRequest, destination: URL) {
  const response = NextResponse.redirect(destination);
  const contentSecurityPolicy = request.headers.get('content-security-policy');
  const nonce = request.headers.get('x-nonce');
  if (contentSecurityPolicy) response.headers.set('content-security-policy', contentSecurityPolicy);
  if (nonce) response.headers.set('x-nonce', nonce);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = resolveSafeRedirectPath(searchParams.get('next'), '/orders');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectWithProxySecurity(request, new URL(next, origin));
    }
  }

  return redirectWithProxySecurity(request, new URL('/login?error=auth-code-error', origin));
}
