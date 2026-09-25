import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { createContentSecurityPolicy } from '@/shared/lib/contentSecurityPolicy';

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseOrigin: string | undefined;

  try {
    supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : undefined;
  } catch {
    supabaseOrigin = undefined;
  }

  return await updateSession(request, {
    nonce,
    contentSecurityPolicy: createContentSecurityPolicy({
      nonce,
      isDevelopment: process.env.NODE_ENV === 'development',
      supabaseOrigin,
    }),
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files with extensions: svg, png, jpg, jpeg, gif, webp, stl, glb, gltf
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|stl|glb|gltf)$).*)',
  ],
};
