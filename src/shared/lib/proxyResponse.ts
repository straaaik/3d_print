import { NextResponse, type NextRequest } from 'next/server';

export interface SessionSecurityContext {
  nonce: string;
  contentSecurityPolicy: string;
}

export function createSecuredResponse(request: NextRequest, security: SessionSecurityContext): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', security.nonce);
  requestHeaders.set('content-security-policy', security.contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-nonce', security.nonce);
  response.headers.set('content-security-policy', security.contentSecurityPolicy);
  return response;
}

export function createSecuredRedirect(
  destination: URL,
  source: NextResponse,
  security: SessionSecurityContext
): NextResponse {
  const response = NextResponse.redirect(destination);
  response.headers.set('x-nonce', security.nonce);
  response.headers.set('content-security-policy', security.contentSecurityPolicy);
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
