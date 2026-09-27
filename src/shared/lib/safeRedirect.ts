const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const ENCODED_SEPARATOR_PATTERN = /%(?:2f|5c)/i;
const MAX_PATH_NORMALIZATION_STEPS = 16;

function isSafeFallback(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') && !CONTROL_CHARACTER_PATTERN.test(path);
}

function normalizePathname(pathname: string): string | null {
  let value = pathname;

  for (let attempt = 0; attempt < MAX_PATH_NORMALIZATION_STEPS; attempt += 1) {
    if (ENCODED_SEPARATOR_PATTERN.test(value) || value.includes('\\') || CONTROL_CHARACTER_PATTERN.test(value)) {
      return null;
    }
    if (!value.includes('%')) return value;

    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

function isSafeRedirectCandidate(candidate: string): boolean {
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return false;
  if (candidate.includes('\\') || CONTROL_CHARACTER_PATTERN.test(candidate)) return false;

  const pathEnd = candidate.search(/[?#]/);
  const pathname = pathEnd === -1 ? candidate : candidate.slice(0, pathEnd);

  try {
    decodeURIComponent(candidate);
    const normalizedPathname = normalizePathname(pathname);
    return (
      normalizedPathname !== null &&
      normalizedPathname.startsWith('/') &&
      !normalizedPathname.startsWith('//')
    );
  } catch {
    return false;
  }
}

/**
 * Limits post-auth navigation to an unambiguous local absolute path.
 */
export function resolveSafeRedirectPath(candidate: string | null | undefined, fallback: string): string {
  const safeFallback = isSafeFallback(fallback) ? fallback : '/';
  return candidate && isSafeRedirectCandidate(candidate) ? candidate : safeFallback;
}

export function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/about' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/auth/callback/') ||
    (process.env.NODE_ENV === 'development' &&
      (pathname.startsWith('/design-sandbox') || pathname.startsWith('/modals-test')))
  );
}
