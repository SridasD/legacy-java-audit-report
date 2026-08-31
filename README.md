# Legacy Java Resource Lifecycle Audit

A read-only developer reference website containing static-analysis coverage, evidence, remediation guidance, and verification checklists for legacy Java resource-lifecycle findings.

## Features

- Audit coverage and finding totals
- Search by file, class, method, resource, category, or problem
- Severity and category filters
- Expandable developer-ready fix notes
- Responsive and print-friendly presentation
- No database, authentication, cookies, analytics, or editable state

## Technology

- Next.js App Router
- React and TypeScript
- Plain CSS
- Vercel-compatible static rendering

## Requirements

- Node.js 20.9 or newer
- npm

## Local development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```powershell
npm run check
```

To automatically format supported files:

```powershell
npm run format
```

## Production validation

```powershell
npm run build
npm run start
```

## GitHub and Vercel

1. Create an empty private GitHub repository.
2. Copy these project files into the repository root.
3. Commit and push to `main`.
4. In Vercel, select **Add New → Project** and import the GitHub repository.
5. Keep the detected **Next.js** framework and default build settings, then deploy.

No environment variables or database are required. Vercel automatically detects the Next.js settings.

## Updating findings

Audit records are stored in `data/findings.ts`. Preserve the existing `Finding` structure when adding records, and update `auditSummary` whenever coverage or totals change.

Before opening a pull request, run:

```powershell
npm run check
npm run build
```

## Security and privacy

This report may contain source locations and implementation details. Keep the repository private and enable Vercel deployment protection when this information must not be public. Never add credentials, production database details, personal information, or private keys to finding evidence.

See `SECURITY.md` for reporting security concerns.
