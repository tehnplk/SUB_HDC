# SUB HDC Clinical Clean Redesign

## Goal

Restyle the existing SUB HDC Next.js app to feel more modern, clean, and sharp while keeping the current app behavior, page structure, and Thai copy intact.

## Approved Direction

Use option C, "Clinical Clean": a white health-system interface with restrained green accents, crisp borders, soft surfaces, stronger typography, and compact data-first layouts.

## Scope

Update the UI for:

- Dashboard page at `/`
- Upload page at `/upload`
- Person table page at `/person`
- Shared uploader, file rows, progress bars, logs, stat cards, filters, buttons, pagination, tables, and loading/error states

Do not change:

- API routes
- Import behavior
- Dashboard data logic
- Table data columns
- Existing Thai visible copy
- Database code

## Visual System

- Background: clean white to very pale green-gray, replacing the current warm beige feel.
- Surfaces: white panels with subtle green-gray borders and light shadows.
- Accent: healthcare green for primary actions, active states, progress, and important metric values.
- Typography: keep the current font setup, but make hierarchy crisper with tighter headings, clearer labels, and better table density.
- Shape: use restrained radii around 8-12px, avoiding overly soft pill-heavy treatment except for primary action buttons where useful.
- Tables: make headers sharper, rows easier to scan, sticky columns readable, and numeric columns tabular.

## Layout

Dashboard:

- Keep the dashboard as the primary first screen.
- Make the top header cleaner with better alignment between title and upload action.
- Keep filters above stats and table.
- Preserve stat cards, but make them flatter, sharper, and easier to compare.
- Keep the table scroll behavior and sticky first column.

Upload:

- Modernize the drop zone with clearer border, icon area, and selected-state styling.
- Make file cards feel like clean rows with stronger status indicators.
- Keep progress and log interactions unchanged.

Person:

- Apply the same panel, header, table, and pagination system as the dashboard.
- Keep existing pagination behavior.

## Verification

After implementation:

- Run a focused syntax or lint check available in the repo without building.
- Start the app locally if needed.
- Use `playwright-cli show`, then inspect the dashboard, upload page, and person page visually.
- Check desktop and a narrow mobile viewport for clipping or overflow.

## Constraints

- Do not commit, build, or deploy unless the user explicitly requests it.
- Keep edits focused on UI files unless a small component class change is needed for styling.
