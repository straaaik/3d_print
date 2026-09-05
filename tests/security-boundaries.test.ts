import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import { createContentSecurityPolicy } from '../src/shared/lib/contentSecurityPolicy';
import { persistProfileUpdate } from '../src/shared/lib/profileUpdate';
import { createSecuredRedirect, createSecuredResponse } from '../src/shared/lib/proxyResponse';
import { isPublicAuthPath, resolveSafeRedirectPath } from '../src/shared/lib/safeRedirect';

test('safe redirects accept only unambiguous same-origin absolute paths', () => {
  const fallback = '/orders';
  const cases: ReadonlyArray<{ candidate: string | null; expected: string }> = [
    { candidate: '/orders', expected: '/orders' },
    { candidate: '/orders?tab=active#recent', expected: '/orders?tab=active#recent' },
    { candidate: '/orders/%D1%82%D0%B5%D1%81%D1%82?file=a%2Fb#key=%5C', expected: '/orders/%D1%82%D0%B5%D1%81%D1%82?file=a%2Fb#key=%5C' },
    { candidate: '//attacker.example', expected: fallback },
    { candidate: 'https://attacker.example/orders', expected: fallback },
    { candidate: '/\\attacker.example', expected: fallback },
    { candidate: '/%5Cattacker.example', expected: fallback },
    { candidate: '/%2F%2Fattacker.example', expected: fallback },
    { candidate: '/%252F%252Fattacker.example', expected: fallback },
    { candidate: '/%252525252F%252525252Fattacker.example', expected: fallback },
    { candidate: '/%25E0%25A4%25A', expected: fallback },
    { candidate: '/orders%2Fadmin', expected: fallback },
    { candidate: '/orders\u0000evil', expected: fallback },
    { candidate: 'https://trusted.example@attacker.example/orders', expected: fallback },
    { candidate: null, expected: fallback },
  ];

  for (const { candidate, expected } of cases) {
    assert.equal(resolveSafeRedirectPath(candidate, fallback), expected, String(candidate));
  }
});

test('profile update reports partial state after Auth accepts the email change', async () => {
  const calls: string[] = [];
  const result = await persistProfileUpdate(
    {
      currentEmail: 'old@example.com',
      name: 'Studio',
      email: 'new@example.com',
      avatarColor: '#123456',
    },
    {
      updateEmail: async () => {
        calls.push('auth');
        return undefined;
      },
      updateProfile: async () => {
        calls.push('profile');
        return 'profile write failed';
      },
    }
  );

  assert.deepEqual(calls, ['auth', 'profile']);
  assert.deepEqual(result, {
    success: false,
    partial: true,
    error: 'Запрос на изменение email принят, но профиль не сохранён: profile write failed',
  });
});

test('profile update keeps partial state when persistence throws after Auth accepts email', async () => {
  const result = await persistProfileUpdate(
    {
      currentEmail: 'old@example.com',
      name: 'Studio',
      email: 'new@example.com',
    },
    {
      updateEmail: async () => undefined,
      updateProfile: async () => {
        throw new Error('network lost');
      },
    }
  );

  assert.deepEqual(result, {
    success: false,
    partial: true,
    error: 'Запрос на изменение email принят, но профиль не сохранён: network lost',
  });
});

test('public auth paths are limited to the login, about, and callback boundary', () => {
  const cases: ReadonlyArray<{ pathname: string; expected: boolean }> = [
    { pathname: '/login', expected: true },
    { pathname: '/about', expected: true },
    { pathname: '/auth/callback', expected: true },
    { pathname: '/auth/callback/provider', expected: true },
    { pathname: '/about/team', expected: false },
    { pathname: '/orders', expected: false },
  ];

  for (const { pathname, expected } of cases) {
    assert.equal(isPublicAuthPath(pathname), expected, pathname);
  }
});

test('content security policy uses nonce-backed scripts with environment-specific directives', () => {
  const cases = [
    { isDevelopment: true, expectedUpgrade: false, expectedEval: true },
    { isDevelopment: false, expectedUpgrade: true, expectedEval: false },
  ];

  for (const { isDevelopment, expectedUpgrade, expectedEval } of cases) {
    const policy = createContentSecurityPolicy({
      nonce: 'request-nonce',
      isDevelopment,
      supabaseOrigin: 'https://project.supabase.co',
    });

    assert.match(policy, /script-src 'self' 'nonce-request-nonce' 'strict-dynamic'/);
    assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
    assert.match(policy, /style-src 'self' 'unsafe-inline'/);
    assert.ok(policy.includes('https://project.supabase.co'));
    assert.ok(policy.includes('wss://project.supabase.co'));
    assert.equal(policy.includes("'unsafe-eval'"), expectedEval);
    assert.equal(policy.includes('upgrade-insecure-requests'), expectedUpgrade);
  }
});

test('actual proxy response factories retain security context on normal and redirect responses', () => {
  const request = new NextRequest('https://3dlabs.example/orders');
  const security = {
    nonce: 'request-nonce',
    contentSecurityPolicy: "script-src 'nonce-request-nonce' 'strict-dynamic'",
  };
  const normalResponse = createSecuredResponse(request, security);

  assert.equal(normalResponse.headers.get('x-nonce'), security.nonce);
  assert.equal(normalResponse.headers.get('content-security-policy'), security.contentSecurityPolicy);
  assert.equal(normalResponse.headers.get('x-middleware-request-x-nonce'), security.nonce);
  assert.equal(normalResponse.headers.get('x-middleware-request-content-security-policy'), security.contentSecurityPolicy);

  const refreshedResponse = NextResponse.next();
  refreshedResponse.cookies.set('sb-auth-token', 'refreshed', { httpOnly: true, path: '/' });
  const redirectResponse = createSecuredRedirect(
    new URL('https://3dlabs.example/login'),
    refreshedResponse,
    security
  );

  assert.equal(redirectResponse.status, 307);
  assert.equal(redirectResponse.headers.get('x-nonce'), security.nonce);
  assert.equal(redirectResponse.headers.get('content-security-policy'), security.contentSecurityPolicy);
  assert.equal(redirectResponse.cookies.get('sb-auth-token')?.value, 'refreshed');
});
