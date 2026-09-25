import type { TaskDefinition, TransitionTaskId } from './model';

const localOrigin = 'https://page-transition.invalid';
const protectedPaths = new Set(['/', '/calculator', '/orders', '/products', '/filaments', '/printers', '/workshop', '/stats', '/settings', '/admin']);
const publicAuthPaths = new Set(['/login', '/about']);

/** Accept local hrefs only; browser callers resolve same-origin absolute URLs first. */
export function normalizePageHref(href: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(href.trim()) || href.trim().startsWith('//')) {
    throw new Error('Expected a local page URL');
  }
  const url = new URL(href, localOrigin);
  if (url.origin !== localOrigin) throw new Error('Expected a local page URL');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  if (url.pathname === '/profile') {
    url.pathname = '/settings';
    url.searchParams.set('section', 'profile');
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Query-only and fragment-only changes do not replace the page view. */
export function isPageNavigation(from: string, to: string): boolean {
  try {
    const fromHref = normalizePageHref(from);
    const destination = to.startsWith('?') || to.startsWith('#')
      ? `${new URL(fromHref, localOrigin).pathname}${to}` : to;
    return new URL(fromHref, localOrigin).pathname !== new URL(normalizePageHref(destination), localOrigin).pathname;
  } catch {
    return false;
  }
}

export function createRouteTasks(pathname: string): TaskDefinition[] {
  const path = new URL(normalizePageHref(pathname), localOrigin).pathname;
  const tasks: TaskDefinition[] = [{ id: 'route', weight: 10 }];
  if (protectedPaths.has(path) || publicAuthPaths.has(path)) tasks.push({ id: 'auth', weight: 10 });
  if (protectedPaths.has(path)) {
    const dataIds: TransitionTaskId[] = [
      'data:connection', 'data:settings', 'data:filaments', 'data:printers',
      'data:savedCalculations', 'data:collections', 'data:orders', 'data:monthlyGoals',
    ];
    tasks.push(...dataIds.map(id => ({ id, weight: 5 })));
  }
  tasks.push({ id: 'module', weight: 15 }, { id: 'view', weight: 15 }, { id: 'assets', weight: 10 });
  return tasks;
}
