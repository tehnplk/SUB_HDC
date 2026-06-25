# Clinical Clean Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing SUB HDC app into the approved Clinical Clean UI without changing behavior.

**Architecture:** Keep the existing Next.js pages and component structure. Apply the redesign mainly through `app/globals.css`, with only small class/markup changes if CSS cannot express the approved design cleanly.

**Tech Stack:** Next.js 16, React 19, plain CSS, Playwright CLI for visual verification.

---

### Task 1: Update Shared Visual System

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update design tokens**

Replace the warm beige variables with white and pale green-gray tokens:

```css
:root {
  color-scheme: light;
  --background: #f7fbf8;
  --foreground: #172033;
  --muted: #667085;
  --panel: #ffffff;
  --panel-soft: #f8fcf9;
  --border: #dfe9e2;
  --border-strong: #c8d8cd;
  --accent: #15803d;
  --accent-strong: #166534;
  --accent-soft: #dcfce7;
  --accent-glow: rgba(21, 128, 61, 0.14);
}
```

- [ ] **Step 2: Refine app shell, panels, headings, buttons, links**

Use a clean health-system background, crisper panels, tighter heading hierarchy, and green primary actions.

- [ ] **Step 3: Refine forms, stat cards, tables, uploader, pagination**

Keep all existing class names and behaviors; improve density, borders, hover states, progress bars, and logs.

### Task 2: Focused Verification

**Files:**
- Test: `tests/dashboard-data.test.mjs`
- Inspect: `/`, `/upload`, `/person`

- [ ] **Step 1: Run existing focused data test**

Run: `npm test -- tests/dashboard-data.test.mjs` if the repo supports it. If no `test` script exists, run the test directly with `node --test tests/dashboard-data.test.mjs`.

- [ ] **Step 2: Start local Next dev server**

Run: `npm run dev` only for local verification, not a production build.

- [ ] **Step 3: Use Playwright CLI**

Run: `playwright-cli show`, open the local app, and inspect dashboard, upload, and person pages at desktop and mobile widths.

- [ ] **Step 4: Fix visible UI issues**

Fix clipping, overflow, poor contrast, broken sticky headers, or unprofessional responsive collapse.
