import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      // CSP is set dynamically per-request by the middleware (src/proxy.ts)
      // with a fresh nonce — do NOT duplicate it here as a static header.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
        : []),
    ];

    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
