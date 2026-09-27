import { createServerClient } from '@supabase/ssr';
import { type NextRequest } from 'next/server';
import { isPublicAuthPath } from '@/shared/lib/safeRedirect';
import { createSecuredRedirect, createSecuredResponse, type SessionSecurityContext } from '@/shared/lib/proxyResponse';

export async function updateSession(request: NextRequest, security: SessionSecurityContext) {
  let supabaseResponse = createSecuredResponse(request, security);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = createSecuredResponse(request, security);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null;

  const isDevSession = process.env.NODE_ENV === 'development' && request.cookies.get('3d_dev_session')?.value === 'true';
  const isAuthenticated = Boolean(userId) || isDevSession;

  const pathname = request.nextUrl.pathname;
  if (isPublicAuthPath(pathname)) {
    return supabaseResponse;
  }

  // Not logged in -> redirect to /login
  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return createSecuredRedirect(url, supabaseResponse, security);
  }

  // Admin route protection & Active check
  if (userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      if (profile) {
        if (!profile.is_active) {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          return createSecuredRedirect(url, supabaseResponse, security);
        }

        if (pathname.startsWith('/admin') && profile.role !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/orders';
          return createSecuredRedirect(url, supabaseResponse, security);
        }
      }
    } catch {
      // If profiles query fails, let AuthGuard handle UX
    }
  }

  return supabaseResponse;
}
