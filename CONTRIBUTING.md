# Contributing

## Scope

Changes should improve the accuracy, clarity, accessibility, or presentation of the audit report. Do not use this repository to modify the audited legacy Java source.

## Local checks

1. Install dependencies with `npm ci`.
2. Run `npm run check`.
3. Run `npm run build`.
4. Confirm searching, filtering, and finding expansion still work.

## Finding changes

- Base every finding on visible code evidence.
- Keep evidence fragments minimal and exclude credentials or personal data.
- Preserve SQL, business behavior, return values, and transaction behavior in developer guidance.
- Update summary totals when findings are added, removed, or reclassified.

## Commits and pull requests

- Keep commits focused and use clear imperative messages.
- Explain finding-count changes in the pull-request description.
- Include screenshots only when presentation changes materially.
- Do not commit `.env` files, generated output, dependencies, or deployment metadata.
