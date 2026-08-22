# Job-scout operating rules

The board is a verified shortlist, not a dump of search results. Search snippets are discovery inputs only.

## Persistent run state

Every run starts by reading `scout-state/CONTEXT.md`, `scout-state/run-state.json`, and `scout-state/exclusions.json`. The HTML board remains the canonical role record; the state files preserve source coverage, incomplete lanes, stale destinations, and the next resume point.

Long searches may continue across runs. Complete the oldest partial lane first, then perform the fresh 24-hour sweep. Never mark a login-only, robots-blocked, or otherwise inaccessible lane as complete. Update the checkpoint even when there are no material role changes.

## Coverage required on every run

Search these lanes separately so one source cannot crowd out the others:

1. LinkedIn Jobs: each target role family, each city, past 24 hours first and past 7 days second.
2. LinkedIn normal posts: hiring posts for the same role and city combinations, including MIS/reporting and adjacent data-operations titles.
3. Startup and early-career portals: Wellfound, Cutshort, Instahyre, YC Work at a Startup, Internshala, Unstop, Hirist, and relevant startup communities.
4. Broad job portals: Foundit, Naukri, and Indeed for discovery, then prefer the employer or original listing as the saved link.
5. Employer ATS pages: Lever, Greenhouse, Ashby, SmartRecruiters, Workday, Taleo, and company-hosted application pages.
6. Company career pages: check companies surfaced in the earlier lanes and recurring high-fit targets.

Role families: Data Analyst, Business Analyst, Analytics Intern, BI/Reporting/MIS Analyst, Data Engineering, Data Ops, junior analytics engineering, Product/Growth Analyst, Revenue/Sales/Product Operations, Customer or Commercial Insights, Pricing Analyst, Risk/Fraud/Credit Analyst, Supply or Planning Analyst, Decision Support, Data Quality, Master Data, Reconciliation, Implementation Analyst, Research/Insights, and other clearly data-heavy early-career work.

Search exact titles and vocabulary variants: fresher, graduate, apprentice, associate, junior, trainee, intern, decision science, insights, reporting, MIS, data quality, business intelligence, operations analytics, SQL, Power BI, and Tableau. Do not assume that a similar role will contain “data analyst” in its title.

Locations: Delhi NCR, Gurugram, Noida, and Bengaluru. Remote roles are allowed when they hire in India.

## Freshness and verification gates

- Prefer roles posted or refreshed within 24 hours; use seven days as the normal discovery window.
- Expand to 30 days only when the direct destination still exposes a live application control or a named current hiring route.
- Do not call a role active from a cached search snippet.
- Reject HTTP 404/410, LinkedIn expired-job redirects, ATS `error=true` redirects, “no longer accepting” messages, closed forms, unidentified forms that require sign-in, and links that resolve only to a generic jobs search.
- Every active card must contain a direct checked URL. If there is no usable link, the role is excluded until one is found.
- Run `node scripts/audit-job-links.mjs` before publishing. Any non-OK result blocks an active-board refresh.
- Run `node scripts/validate-scout-state.mjs` before completion. A broken or incomplete checkpoint blocks the refresh.

## Deduplication and lifecycle

Use three keys in this order:

1. Platform ID, especially the LinkedIn numeric job ID.
2. Normalized final URL after redirects and tracking parameters are removed.
3. Normalized company + role + location.

Closed IDs stay in the archive. A repost is new only when it has a new direct ID or URL and the destination is currently open; otherwise update the existing record's freshness and status.

## Ranking

- Tier 1: fresher/intern/0-1 year, strong CV overlap, current direct source, and usable recruiter or small-company access.
- Tier 2: strong stack match with one meaningful hurdle such as 1-2 years or indirect access.
- Tier 3: adjacent role, employer/eligibility ambiguity, 2+ years, or lower-trust agency path. It must still pass the live-link gate.

No application, recruiter message, form submission, or email is part of this workflow.

Automated GitHub publication is authorized for recurring runs. After both validation scripts pass, stage only the job-scout files changed by the run, create a concise refresh commit, push to `origin/main`, and verify that GitHub Pages deployed the pushed commit and serves the current snapshot. A failed audit, commit, push, or deployment must be recorded and reported; never claim publication before verification.
