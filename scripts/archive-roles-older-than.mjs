#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const days = Number(process.argv[2] || 8);
if (!Number.isInteger(days) || days < 0) throw new Error('Pass a non-negative whole number of days.');
const root = new URL('../', import.meta.url);
const boardPath = new URL('outputs/ansh-job-scout.html', root);
const statePath = new URL('scout-state/run-state.json', root);
const exclusionsPath = new URL('scout-state/exclusions.json', root);
const now = new Date();
const indiaToday = new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now));
const cutoff = new Date(indiaToday);
cutoff.setDate(cutoff.getDate() - days);
const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata', hour12: false }).replace(' ', 'T') + '+05:30';
const displayDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(now);
const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const strip = value => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function extractDatedFreshness(body) {
  const text = strip(body).toLowerCase();
  const match = text.match(/(?:posted|fresh|indexed|reposted)\s+(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?/i);
  if (!match) return null;
  const monthKey = match[2].slice(0, 3).toLowerCase();
  const year = Number(match[3] || indiaToday.getFullYear());
  return new Date(year, months[monthKey], Number(match[1]));
}

let html = await readFile(boardPath, 'utf8');
const archived = [];
html = html.replace(/\n?\s*<article class="card"([^>]*)>([\s\S]*?)<\/article>/g, (whole, attrs, body) => {
  const postedOn = extractDatedFreshness(body);
  if (!postedOn || postedOn >= cutoff) return whole;
  const company = strip(body.match(/<div class="company">([\s\S]*?)<\/div>/)?.[1] || 'Unknown company');
  const title = strip(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] || 'Unknown role');
  const link = body.match(/<a class="open-link" href="([^"]+)"/)?.[1] || '';
  const location = strip(body.match(/<span class="chip">([\s\S]*?)<\/span>/)?.[1] || 'Location not stated');
  const tier = Number(attrs.match(/data-tier="(\d+)"/)?.[1] || 3);
  archived.push({ company, title, link, location, tier, postedOn });
  return '\n';
});
if (!archived.length) {
  console.log(`No explicitly dated cards older than ${days} days.`);
  process.exit(0);
}
const rows = archived.map(job => `      <div class="archive-row">\n        <div><div class="company">${escape(job.company)}</div><h3>${escape(job.title)}</h3><p>${escape(job.location)} · Direct listing</p></div>\n        <div><span class="status closed">Archived</span><p style="margin-top:7px">Published ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(job.postedOn)}. Archived under the eight-day freshness rule.</p></div>\n        <div><p><strong>Archived ${displayDate}</strong></p><a href="${job.link}" target="_blank" rel="noopener">View archived URL ↗</a></div>\n      </div>`).join('\n');
html = html.replace(/(<summary>Closed or invalidated \()(\d+)(\)<\/summary>)/, (_, before, count, after) => `${before}${Number(count) + archived.length}${after}\n${rows}`);
const active = [...html.matchAll(/<article class="card"/g)].length;
const tier1 = [...html.matchAll(/<article class="card"[^>]*data-tier="1"/g)].length;
html = html.replace(/<div class="stat"><b>\d+<\/b><span>active opportunities<\/span><\/div>/, `<div class="stat"><b>${active}</b><span>active opportunities</span></div>`)
  .replace(/<div class="stat"><b>\d+<\/b><span>high-approachability leads<\/span><\/div>/, `<div class="stat"><b>${tier1}</b><span>high-approachability leads</span></div>`)
  .replace(/<div class="stat"><b>\d+<\/b><span>direct links checked today<\/span><\/div>/, `<div class="stat"><b>${active}</b><span>direct links checked today</span></div>`);
await writeFile(boardPath, html);

const exclusions = JSON.parse(await readFile(exclusionsPath, 'utf8'));
for (const job of archived) {
  const id = job.link.match(/(\d{7,})(?:\D*$)/)?.[1];
  const key = job.link.includes('linkedin.com') && id ? `linkedin:${id}` : `freshness:${job.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${id || job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (!exclusions.entries.some(entry => entry.key === key)) exclusions.entries.push({ key, company: job.company, title: job.title, url: job.link, reason: `older_than_${days}_days_user_requested`, lastCheckedAt: timestamp });
}
exclusions.updatedAt = timestamp;
await writeFile(exclusionsPath, `${JSON.stringify(exclusions, null, 2)}\n`);

const state = JSON.parse(await readFile(statePath, 'utf8'));
state.updatedAt = timestamp;
state.lastRun = { ...state.lastRun, completedAt: timestamp, activeRoles: active, tier1Roles: tier1, closedOrInvalidated: state.lastRun.closedOrInvalidated + archived.length, linkAudit: 'pending-rerun', materialChanges: true };
state.nextRun.notes = `Apply the user-requested eight-day freshness rule before each sweep. ${state.nextRun.notes}`;
await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
console.log(`Archived ${archived.length} explicitly dated roles older than ${days} days. ${active} active roles remain.`);
