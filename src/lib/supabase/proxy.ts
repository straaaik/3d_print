import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() triggers token refresh if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';
  const isAuthCallback = pathname.startsWith('/auth/callback');

  // Skip redirect for auth callback
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // Not logged in -> redirect to /login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Logged in -> redirect away from /login
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/orders';
    return NextResponse.redirect(url);
  }

  // Admin route protection & Active check
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (!profile.is_active && !isLoginPage) {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          return NextResponse.redirect(url);
        }

        if (pathname.startsWith('/admin') && profile.role !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/orders';
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // If profiles query fails, let AuthGuard handle UX
    }
  }

  return supabaseResponse;
}
