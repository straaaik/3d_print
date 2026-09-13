'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, type ComponentProps } from 'react';
import { usePageTransition } from './PageTransitionProvider';
import type { NavigationOptions } from './model';

type Props = ComponentProps<typeof Link> & { beforeNavigate?: NavigationOptions['beforeNavigate'] };
function hrefString(href: Props['href']): string {
  if (typeof href === 'string') return href;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(href.query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) if (item != null) params.append(key, String(item));
  }
  return `${href.pathname ?? ''}${href.search ?? (params.size ? `?${params}` : '')}${href.hash ?? ''}`;
}
export function PageTransitionLink({ href, onNavigate, beforeNavigate, replace, scroll, ...props }: Props) {
  const { available, navigate } = usePageTransition();
  return <Link {...props} href={href} replace={replace} scroll={scroll} onNavigate={event => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented || !available) return;
    event.preventDefault();
    void navigate(hrefString(href), { beforeNavigate, replace, scroll });
  }} />;
}

/** Explicit adapter, preserving refresh/prefetch and the router's public API. */
export function usePageRouter() {
  const router = useRouter();
  const { available, navigate } = usePageTransition();
  const push = useCallback((href: string, options?: { scroll?: boolean }) => {
    if (available) void navigate(href, options);
    else router.push(href, options);
  }, [available, navigate, router]);
  const replace = useCallback((href: string, options?: { scroll?: boolean }) => {
    if (available) void navigate(href, { ...options, replace: true });
    else router.replace(href, options);
  }, [available, navigate, router]);
  return useMemo(() => ({ ...router, push, replace }), [router, push, replace]);
}
