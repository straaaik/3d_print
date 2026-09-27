---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, palette selection, avoiding generic AI defaults/slop, and crafting production-grade interfaces tailored to the product's identity.
---

# Frontend Design

Guidance for crafting intentional, memorable, and production-grade user interfaces with distinctive visual identity and zero generic AI defaults ("AI slop").

## When to Apply

Use this skill when:
- Designing new UI components, pages, dashboards, or layouts
- Redesigning or polishing existing interfaces
- Defining typography scales, color palettes, spacing systems, and motion
- Reviewing UI code for generic patterns, poor contrast, or weak hierarchy

---

## Core Philosophy

Approach every design as a dedicated design lead crafting a unique visual identity:
1. **Never default to "AI slop"**: Avoid generic purple-to-blue gradients on dark mode, standard Inter/Roboto sans with no character, and generic rounded card grids with identical drop shadows.
2. **Ground it in the subject**: Understand the domain, physical materials, instruments, technical vernacular, and target audience. For a 3D print lab, use industrial cockpit cues, telemetry readouts, monospace data, and crisp borders.
3. **Intentional Typography**: Pair display and body fonts purposefully. Define clear hierarchy with deliberate weights, tracking, and line heights.
4. **Structure is Information**: Use structural cues (dividers, badges, status lights, mono labels) only when they encode real system state, not pure decoration.

---

## The Design Process

### 1. Brainstorm & Direction
- Identify the core aesthetic tone (e.g. *Industrial Telemetry*, *Tactile Cockpit*, *Editorial Broadsheet*, *Clean Minimalist Precision*).
- Define the primary palette: Neutral background foundation + high-contrast text + 1-2 intentional accent colors with semantic meaning.

### 2. Layout & Information Hierarchy
- **Hero as Thesis**: The top area must immediately communicate the core value with maximum clarity and purpose.
- **Scannability**: Clear visual anchors, consistent rhythm, and strong contrast ratios (meeting WCAG AAA standards for text).
- **Surface Elevation**: Layer cards, modals, and toolbars using subtle border luminance (`border-white/10` to `border-white/20`), backdrop filters (`backdrop-blur-xl`), and dark elevation rather than muddy drop shadows.

### 3. Deliberate Micro-Interactions & Motion
- Use animations to guide user focus, indicate state changes, and celebrate completions.
- Prefer GPU-accelerated springs (`transform`, `opacity`) via Framer Motion / Motion.
- Keep transition durations tight (150ms–300ms) for snappy, responsive feel. Avoid slow, sluggish animations that get in the user's way.

### 4. Production Details & Polish
- **Interactive Feedback**: Distinct `hover`, `active`, `focus-visible`, and `disabled` states for all interactive elements.
- **Empty & Error States**: Well-crafted empty states with clear calls-to-action, helpful inline validation, and resilient error boundaries.
- **Monospace Telemetry**: Use monospace fonts (`font-mono`) for numbers, timestamps, coordinates, metrics, status codes, and calculations to prevent layout jitter and improve readability.
