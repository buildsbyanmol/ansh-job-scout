#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const auditPath = process.argv[2];
if (!auditPath) throw new Error('Usage: node scripts/archive-audit-closures.mjs <audit-output>');
const root = new URL('../', import.meta.url);
const boardPath = new URL('outputs/ansh-job-scout.html', root);
const statePath = new URL('scout-state/run-state.json', root);
const exclusionsPath = new URL('scout-state/exclusions.json', root);
const audit = await readFile(auditPath, 'utf8');
const closed = new Set([...audit.matchAll(/^CLOSED\s+(.+?) \| (.+?) \|/gm)].map(match => `${match[1]}|${match[2]}`));
if (!closed.size) {
  console.log('No closures to archive.');
  process.exit(0);
}

const strip = value => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()).replace(/ /g, ' ');
const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata', hour12: false }).replace(' ', 'T') + '+05:30';
let html = await readFile(boardPath, 'utf8');
const archived = [];
html = html.replace(/\n?\s*<article class="card"([^>]*)>([\s\S]*?)<\/article>/g, (whole, attrs, body) => {
  const company = strip(body.match(/<div class="company">([\s\S]*?)<\/div>/)?.[1] || 'Unknown company');
  const title = strip(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] || 'Unknown role');
  if (!closed.has(`${company}|${title}`)) return whole;
  const link = body.match(/<a class="open-link" href="([^"]+)"/)?.[1] || '';
  const location = strip(body.match(/<span class="chip">([\s\S]*?)<\/span>/)?.[1] || 'Location not stated');
  const tier = Number(attrs.match(/data-tier="(\d+)"/)?.[1] || 3);
  archived.push({ company, title, link, location, tier });
  return '\n';
});
if (archived.length !== closed.size) throw new Error(`Expected ${closed.size} cards but archived ${archived.length}. Refusing partial update.`);
const archiveRows = archived.map(job => `      <div class="archive-row">\n        <div><div class="company">${escape(job.company)}</div><h3>${escape(job.title)}</h3><p>${escape(job.location)} · Direct listing</p></div>\n        <div><span class="status closed">Closed</span><p style="margin-top:7px">The fresh direct-link audit found that this listing is no longer accepting applications or its canonical route is unavailable.</p></div>\n        <div><p><strong>Closed ${date}</strong></p><a href="${job.link}" target="_blank" rel="noopener">View archived URL ↗</a></div>\n      </div>`).join('\n');
html = html.replace(/(<summary>Closed or invalidated \()(\d+)(\)<\/summary>)/, (_, before, count, after) => `${before}${Number(count) + archived.length}${after}\n${archiveRows}`);
const active = [...html.matchAll(/<article class="card"/g)].length;
const tier1 = [...html.matchAll(/<article class="card"[^>]*data-tier="1"/g)].length;
html = html.replace(/<div class="stat"><b>\d+<\/b><span>active opportunities<\/span><\/div>/, `<div class="stat"><b>${active}</b><span>active opportunities</span></div>`)
  .replace(/<div class="stat"><b>\d+<\/b><span>high-approachability leads<\/span><\/div>/, `<div class="stat"><b>${tier1}</b><span>high-approachability leads</span></div>`)
  .replace(/<div class="stat"><b>\d+<\/b><span>direct links checked today<\/span><\/div>/, `<div class="stat"><b>${active}</b><span>direct links checked today</span></div>`);
await writeFile(boardPath, html);

const exclusions = JSON.parse(await readFile(exclusionsPath, 'utf8'));
for (const job of archived) {
  const id = job.link.match(/(\d{7,})(?:\D*$)/)?.[1];
  const key = job.link.includes('linkedin.com') && id ? `linkedin:${id}` : `audit:${job.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${id || job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (!exclusions.entries.some(entry => entry.key === key)) exclusions.entries.push({ key, company: job.company, title: job.title, url: job.link, reason: 'fresh_active_link_audit_found_closed_or_unavailable', lastCheckedAt: timestamp });
}
exclusions.updatedAt = timestamp;
await writeFile(exclusionsPath, `${JSON.stringify(exclusions, null, 2)}\n`);

const state = JSON.parse(await readFile(statePath, 'utf8'));
state.updatedAt = timestamp;
state.lastRun = { ...state.lastRun, completedAt: timestamp, activeRoles: active, tier1Roles: tier1, closedOrInvalidated: state.lastRun.closedOrInvalidated + archived.length, linkAudit: 'pending-rerun', materialChanges: true };
state.sourceLanes.find(lane => lane.id === 'linkedin_jobs').lastAttemptAt = timestamp;
state.sourceLanes.find(lane => lane.id === 'linkedin_jobs').notes += ` Fresh audit archived ${archived.length} listings whose direct route is now closed or unavailable.`;
await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
console.log(`Archived ${archived.length} roles; ${active} active remain.`);
