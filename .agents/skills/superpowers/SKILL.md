---
name: superpowers
description: Complete software development methodology for AI coding agents based on Jesse Vincent's Superpowers framework. Enforces disciplined software engineering: structured brainstorming, red-green-refactor Test-Driven Development (TDD), systematic debugging, subagent delegation, and structured execution plans.
---

# Superpowers

Superpowers transforms AI coding agents into disciplined senior software engineers by enforcing structured engineering methodologies instead of unguided "vibe coding".

## Core Principles

1. **Think Before Coding**: Never jump straight into code implementation without clarifying goals, constraints, and architecture.
2. **True Test-Driven Development (TDD)**: RED (write failing test) → GREEN (write minimal code to pass) → REFACTOR (clean and optimize).
3. **Systematic Debugging**: Find root causes before patching symptoms. Isolate variables, reproduce failures deterministically, and test hypotheses.
4. **Subagent Delegation**: Break large problems into isolated, verifiable chunks executed by specialized subagents with clear contracts.
5. **YAGNI & DRY**: Build only what is needed right now; eliminate duplicate logic; keep solutions simple and maintainable.

---

## The Superpowers Workflow

```
[ Clarify & Brainstorm ]
         │
         ▼
[ Architecture & Spec ]
         │
         ▼
[ Implementation Plan ]
         │
         ▼
[ Subagent-Driven Execution ] ◄──┐ (Iterative RED -> GREEN -> REFACTOR)
         │                       │
         ▼                       │
[ Review & Verify ] ─────────────┘
         │
         ▼
[ Finish & Ship ]
```

---

## 1. Brainstorming & Specification
- When presented with a feature request or major task:
  - Ask clarifying questions about edge cases, constraints, and non-functional requirements.
  - Define user journeys, data models, and API interfaces in small, digestible chunks.
  - Agree on the definition of done (DoD) before touching code.

---

## 2. Test-Driven Development (TDD)
- **Step 1 (RED)**: Write unit/integration tests that describe the expected behavior and verify that they FAIL.
- **Step 2 (GREEN)**: Implement the simplest possible solution that turns the tests GREEN.
- **Step 3 (REFACTOR)**: Refactor code for readability, performance, and maintainability without breaking tests.
- **Never skip tests**: Untested code is considered unfinished work.

---

## 3. Systematic Debugging
When a bug or test failure occurs:
1. **Reproduce**: Create a minimal reproducible test case.
2. **Trace & Isolate**: Trace execution flow and check logs/state at each boundary.
3. **Hypothesize**: Form a clear hypothesis of the root cause before editing code.
4. **Fix & Validate**: Apply the fix and verify that the reproduction passes without causing regressions.

---

## 4. Subagent-Driven Development
- Delegate self-contained, parallel tasks to subagents.
- Provide each subagent with:
  - Exact file scope and context
  - Clear input/output specifications
  - Strict verification criteria
- Inspect subagent outputs thoroughly before merging or proceeding.
