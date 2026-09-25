interface ContentSecurityPolicyOptions {
  nonce: string;
  isDevelopment: boolean;
  supabaseOrigin?: string;
}

export function createContentSecurityPolicy({
  nonce,
  isDevelopment,
  supabaseOrigin,
}: ContentSecurityPolicyOptions): string {
  let verifiedSupabaseOrigin: string | undefined;
  let websocketOrigin: string | undefined;
  if (supabaseOrigin) {
    try {
      const origin = new URL(supabaseOrigin);
      if (origin.protocol !== 'https:' && origin.protocol !== 'http:') throw new Error('Unsupported Supabase origin');
      verifiedSupabaseOrigin = origin.origin;
      websocketOrigin = `${origin.protocol === 'https:' ? 'wss' : 'ws'}://${origin.host}`;
    } catch {
      verifiedSupabaseOrigin = undefined;
      websocketOrigin = undefined;
    }
  }

  const connectSources = ["'self'", verifiedSupabaseOrigin, websocketOrigin].filter(Boolean).join(' ');
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ];

  return directives.join('; ');
}
