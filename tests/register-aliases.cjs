const Module = module.require('node:module');
const { resolve } = module.require('node:path');

require.extensions['.css'] = () => undefined;

const load = Module._load;
Module._load = function loadTestFontModule(request, parent, isMain) {
  if (request === 'next/server') {
    // Structural unit tests have no Next request context. The production
    // browser suite verifies the real connection() / CSP integration.
    return { ...load.call(this, request, parent, isMain), connection: async () => {} };
  }
  if (request === 'next/font/google') {
    return {
      Inter: () => ({ variable: '--test-inter' }),
      JetBrains_Mono: () => ({ variable: '--test-mono' }),
    };
  }
  if (request === 'next/font/local') {
    return ({ variable }) => ({ variable });
  }
  if (request === '@/app/auth/actions') {
    return {};
  }
  if (request === '@/lib/supabase/client') {
    return { createClient: () => ({}) };
  }
  return load.call(this, request, parent, isMain);
};

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  const resolvedRequest = request.startsWith('@/')
    ? resolve(process.cwd(), '.test-dist', 'src', request.slice(2))
    : request;
  return resolveFilename.call(this, resolvedRequest, parent, isMain, options);
};
