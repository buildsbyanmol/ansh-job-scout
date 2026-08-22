# Ansh job-scout context

Read this file, `run-state.json`, and `exclusions.json` before every automated scout. These files are the durable handoff between runs. Keep them small, factual, and free of personal contact details.

## Objective

Find the widest practical set of current early-career, data-heavy roles for Ansh in Delhi NCR, Gurugram, Noida, and Bengaluru. Remote roles are in scope only when they hire in India.

Search both exact and adjacent titles. Do not assume the title contains “data analyst.” Include:

- Data, BI, reporting, MIS, and business analysts
- Analytics, product, growth, marketing, revenue, sales, and operations analysts or interns
- Data engineering, Data Ops, junior analytics engineering, ETL, and reconciliation
- Customer/commercial insights, pricing, risk, fraud, credit, supply/planning, and decision support
- Data quality, master data, implementation, research/insights, apprentices, associates, trainees, and graduate roles

## Candidate baseline

Match against SQL, Python, ETL/reconciliation, Power BI, Tableau, PostgreSQL, Power Query, hypothesis testing, large datasets, and stakeholder-facing data work. The original CV PDF is not stored in this public repository.

## Canonical files

- Active board and closed archive: `outputs/ansh-job-scout.html`
- Application tracker UI: `outputs/tracker.html`
- Detailed search rules: `SCOUTING_WORKFLOW.md`
- Run checkpoint: `scout-state/run-state.json`
- Rejected/stale destination cache: `scout-state/exclusions.json`
- Link audit: `scripts/audit-job-links.mjs`
- State audit: `scripts/validate-scout-state.mjs`

## Run contract

1. Read the current HTML board, archive, state checkpoint, and exclusion cache.
2. Resume the oldest incomplete source lane first, then perform the fresh 24-hour sweep across all lanes.
3. Search LinkedIn Jobs and normal LinkedIn posts independently.
4. Treat search snippets as discovery only. Open the final destination before saving anything.
5. Prefer canonical employer pages over aggregator copies.
6. Deduplicate by platform ID, normalized final URL, then company + role + location.
7. Update closures and exclusions as well as additions.
8. Update `run-state.json` after every run, including partial runs and blocked lanes.
9. Run both validation scripts before reporting completion.
10. Never apply, submit a form, message a recruiter, or send email.

## Publication state

The public repository is `buildsbyanmol/ansh-job-scout`, branch `main`, and GitHub Pages is enabled. On 22 Aug 2026 the user explicitly authorized recurring staging, committing, and pushing after every successful run. Publish only after both validation scripts pass, stage only job-scout files changed by that run, push to `origin/main`, and verify the Pages deployment before claiming publication.
