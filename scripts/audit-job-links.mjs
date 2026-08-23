#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const sourcePath = new URL('../outputs/ansh-job-scout.html', import.meta.url);
const html = await readFile(sourcePath, 'utf8');
const cardPattern = /<article class="card"([^>]*)>([\s\S]*?)<\/article>/g;
const stripTags = value => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const extract = (body, pattern) => stripTags(body.match(pattern)?.[1] || '');

function normalizeUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(trk|tracking|ref|refId|position|pageNum|utm_)/i.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.replace(/^in\.linkedin\.com$/, 'www.linkedin.com');
  url.pathname = url.pathname.replace(/\/$/, '');
  const linkedInId = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)$/)?.[1];
  return linkedInId ? `linkedin-job:${linkedInId}` : url.toString();
}

const jobs = [...html.matchAll(cardPattern)].map((match, index) => {
  const attributes = match[1];
  const body = match[2];
  const link = body.match(/<a class="open-link" href="([^"]+)"/)?.[1] || '';
  const chips = [...body.matchAll(/<span class="chip">([\s\S]*?)<\/span>/g)].map(item => stripTags(item[1]));
  return {
    index: index + 1,
    company: extract(body, /<div class="company">([\s\S]*?)<\/div>/),
    title: extract(body, /<h3>([\s\S]*?)<\/h3>/),
    location: chips[0] || '',
    url: link,
    normalizedUrl: link ? normalizeUrl(link) : '',
    browserVerifiedDate: attributes.match(/data-audit="browser-verified-(\d{4}-\d{2}-\d{2})"/)?.[1] || '',
  };
});

const todayInIndia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const structuralIssues = [];
const seenUrls = new Map();
const seenRoles = new Map();
for (const job of jobs) {
  if (!job.url) structuralIssues.push(`${job.company || `card ${job.index}`}: missing direct link`);
  if (job.normalizedUrl && seenUrls.has(job.normalizedUrl)) {
    structuralIssues.push(`${job.company}: duplicate URL with ${seenUrls.get(job.normalizedUrl)}`);
  } else if (job.normalizedUrl) seenUrls.set(job.normalizedUrl, job.company);

  const roleKey = [job.company, job.title, job.location].join('|').toLowerCase().replace(/[^a-z0-9|]+/g, ' ').trim();
  if (roleKey && seenRoles.has(roleKey)) structuralIssues.push(`${job.company}: duplicate company + role + location key`);
  else if (roleKey) seenRoles.set(roleKey, job.company);
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        headers: { 'user-agent': 'Mozilla/5.0 job-link-quality-audit/1.0' },
      });
      if (response.status !== 429 || attempt === 2) return response;
      await new Promise(resolve => setTimeout(resolve, 1_500 * (attempt + 1)));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function audit(job) {
  if (!job.url) return { ...job, result: 'MISSING', finalUrl: '', detail: 'No direct URL' };
  try {
    const response = await fetchWithRetry(job.url);
    const finalUrl = response.url;
    const body = (await response.text()).toLowerCase();
    const redirectedToExpiredSearch = /expired_jd_redirect/.test(finalUrl);
    const linkedInJobRedirectedAway = /linkedin\.com\/jobs\/view/.test(job.url) && !/linkedin\.com\/jobs\/view/.test(finalUrl);
    const closureText = /no longer accepting applications|this job is (?:no longer available|closed|expired)|job has expired/.test(body);
    const hardClosed = [404, 410].includes(response.status) || redirectedToExpiredSearch || linkedInJobRedirectedAway || closureText;
    const indeedAutomationGate = /(^|\.)indeed\.com$/.test(new URL(job.url).hostname)
      && /^[0-9a-f]{16}$/.test(new URL(job.url).searchParams.get('jk') || '')
      && [401, 403].includes(response.status)
      && job.browserVerifiedDate === todayInIndia;
    return {
      ...job,
      result: hardClosed ? 'CLOSED' : response.ok || indeedAutomationGate ? 'OK' : 'CHECK',
      finalUrl,
      detail: indeedAutomationGate
        ? `HTTP ${response.status} automation gate; browser verified ${job.browserVerifiedDate}`
        : `HTTP ${response.status}${finalUrl !== job.url ? ' redirected' : ''}`,
    };
  } catch (error) {
    return { ...job, result: 'CHECK', finalUrl: '', detail: error?.name || 'Network error' };
  }
}

const results = [];
const batchSize = 6;
for (let index = 0; index < jobs.length; index += batchSize) {
  results.push(...await Promise.all(jobs.slice(index, index + batchSize).map(audit)));
  if (index + batchSize < jobs.length) await new Promise(resolve => setTimeout(resolve, 750));
}
for (const row of results) {
  process.stdout.write(`${row.result.padEnd(7)} ${row.company} | ${row.title} | ${row.detail}\n`);
  if (row.finalUrl && row.finalUrl !== row.url) process.stdout.write(`        final: ${row.finalUrl}\n`);
}

if (structuralIssues.length) {
  process.stdout.write('\nStructural issues:\n');
  for (const issue of structuralIssues) process.stdout.write(`- ${issue}\n`);
}

const failures = results.filter(row => row.result !== 'OK');
process.stdout.write(`\n${jobs.length} active roles checked; ${failures.length} need attention; ${structuralIssues.length} structural issues.\n`);
if (failures.length || structuralIssues.length) process.exitCode = 1;
