---
name: playwright-mcp
description: Browser automation, E2E UI testing, accessibility snapshot verification, and live browser control using Playwright MCP. Use when testing web applications, verifying UI rendering and user interactions, testing responsive layouts, taking screenshots, and debugging client-side behavior.
---

# Playwright MCP

Playwright MCP enables AI agents to interact directly with real headless or headed browsers via the Model Context Protocol, using structured accessibility trees and browser automation commands.

## When to Apply

Use Playwright MCP when:
- Running automated end-to-end (E2E) verification for web flows (e.g. login, checkout, calculator inputs, order creation).
- Capturing full-page screenshots or element screenshots to verify visual layouts.
- Inspecting the accessibility tree (`aria-` attributes, roles, names) to ensure accessibility compliance.
- Reproducing user-reported UI bugs in a live browser environment.

---

## MCP Server Configuration

Add Playwright MCP to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--caps=vision,pdf,network,storage"
      ]
    }
  }
}
```

---

## Core Capabilities & Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to any local (`http://localhost:3000`) or remote URL. |
| `browser_snapshot` | Return the accessibility tree snapshot of the current page. Preferred for LLM token efficiency over raw HTML. |
| `browser_click` | Click buttons, links, or elements by accessibility selector or text. |
| `browser_type` | Type text into input fields, textareas, or form controls. |
| `browser_screenshot` | Capture visual screenshot of the viewport or full page. |
| `browser_evaluate` | Execute JavaScript snippets in the page context. |
| `browser_wait_for` | Wait for specific elements, network idle, or navigation state. |

---

## Verification Workflow

1. **Start Dev Server**: Ensure local app is running (e.g. `http://localhost:3000`).
2. **Navigate**: `browser_navigate(url: "http://localhost:3000/calculator")`
3. **Inspect Snapshot**: Use `browser_snapshot` to discover accessible buttons, inputs, and text.
4. **Interact**: `browser_type(selector: "#weight-input", text: "150")` followed by `browser_click(selector: "button:has-text('Рассчитать')")`.
5. **Verify State**: Confirm calculation results and telemetry indicators in the rendered UI.
6. **Capture Proof**: `browser_screenshot` to validate final layout.
