---
name: context7
description: Real-time, version-specific documentation retrieval using Upstash Context7. Use when looking up modern library APIs, SDK methods, framework updates (Next.js, React, Tailwind, Supabase, Motion), and code examples to prevent hallucinations and outdated syntax.
---

# Context7

Context7 provides AI models with up-to-date, version-accurate documentation and code examples directly from library sources, eliminating hallucinated APIs and outdated patterns.

## When to Apply

Use Context7 when:
- Working with modern libraries whose APIs have changed in recent major versions (e.g. Next.js 15 App Router, Tailwind CSS v4, Motion v12, Supabase v2, Lucide React).
- Implementing third-party SDK integrations (Stripe, OpenAI, Supabase, Cloudflare, Upstash).
- Verifying exact method signatures, options, type definitions, and breaking changes.

---

## MCP Server Integration

When the Context7 MCP server is registered in your `mcp_config.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Context7 Tools
- `context7_search_docs`: Search documentation across supported libraries for specific keywords or functions.
- `context7_get_library_docs`: Retrieve the complete reference or guide for a specific topic within a library.

---

## CLI Usage (`ctx7`)

Context7 can also be queried on-demand from the terminal:

```bash
# Setup and authenticate
npx ctx7 setup

# Search library docs
npx ctx7 docs search "framer-motion layoutId animate"
npx ctx7 docs search "nextjs parallel routes intercepting"
npx ctx7 docs search "supabase auth ssr nextjs cookies"
```

---

## Best Practices

1. **Be Specific**: Include library name and version when querying (e.g., `nextjs@15 server-actions`, `motion@12 springs`).
2. **Verify Before Coding**: If an API seems ambiguous or deprecated, fetch live context before generating code.
3. **No Assumptions**: Do not rely on training cutoff knowledge for fast-evolving frameworks.
