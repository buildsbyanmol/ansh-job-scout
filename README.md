# Ansh's Job Scout

A self-contained early-career job-scout knowledge base for data, business analytics, BI, reporting, data engineering, data operations, product/growth analytics, insights, risk, pricing, and other data-heavy roles in Delhi NCR and Bengaluru.

The board ranks verified opportunities into three approachability tiers using role eligibility, CV-stack fit, listing freshness, source trust, competition, and available outreach routes. It also includes a browser-local application tracker with configurable hiring stages.

The recurring search covers LinkedIn Jobs and hiring posts separately, specialist and startup boards, broad portals, company careers, and employer ATS pages. Its search and lifecycle rules are documented in [`SCOUTING_WORKFLOW.md`](SCOUTING_WORKFLOW.md). Before publishing a refresh, run:

```sh
node scripts/audit-job-links.mjs
node scripts/validate-scout-state.mjs
```

The audit fails when an active card has a missing or duplicate URL, a hard closure response, an expired LinkedIn redirect, or another destination that needs manual verification.

Persistent automation context lives in [`scout-state/`](scout-state/). It records source checkpoints, incomplete lanes, rejected stale destinations, and the next resume point without storing Ansh's CV or contact details.

## Live site

The GitHub Pages site is published from the `main` branch. The root page redirects to the current knowledge base in `outputs/ansh-job-scout.html`, with tracked applications available in `outputs/tracker.html`.

## Safety

This repository does not contain Ansh's CV, contact details, applications, recruiter messages, or email recipient information.
