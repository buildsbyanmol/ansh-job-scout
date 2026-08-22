import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.join(root, 'scout-state');
const requiredFiles = ['CONTEXT.md', 'run-state.json', 'exclusions.json'];
const requiredLaneIds = [
  'linkedin_jobs',
  'linkedin_normal_posts',
  'official_ats_and_careers',
  'startup_boards',
  'specialist_early_career_portals',
  'broad_job_portals'
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(stateDir, file))) failures.push(`Missing ${file}`);
}
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(stateDir, file), 'utf8'));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
    return {};
  }
}

const runState = readJson('run-state.json');
const exclusions = readJson('exclusions.json');

if (runState.schemaVersion !== 1) failures.push('run-state.json schemaVersion must be 1');
if (!Array.isArray(runState.sourceLanes)) failures.push('run-state.json sourceLanes must be an array');

const laneIds = new Set((runState.sourceLanes || []).map(lane => lane.id));
for (const id of requiredLaneIds) {
  if (!laneIds.has(id)) failures.push(`Missing source lane: ${id}`);
}

if (!runState.publication?.repository || !runState.publication?.pagesUrl) {
  failures.push('run-state.json publication destination is incomplete');
}

if (!Array.isArray(exclusions.entries)) failures.push('exclusions.json entries must be an array');
const exclusionKeys = (exclusions.entries || []).map(entry => entry.key);
if (new Set(exclusionKeys).size !== exclusionKeys.length) failures.push('exclusions.json contains duplicate keys');

for (const entry of exclusions.entries || []) {
  if (!entry.key || !entry.url || !entry.reason || !entry.lastCheckedAt) {
    failures.push(`Incomplete exclusion entry: ${entry.key || 'unknown'}`);
  }
}

if (failures.length) {
  console.error(failures.map(item => `ERROR   ${item}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK      ${runState.sourceLanes.length} source lanes configured`);
  console.log(`OK      ${exclusions.entries.length} stale or rejected destinations cached`);
  console.log(`OK      publication target recorded (${runState.publication.enabled ? 'enabled' : 'disabled'})`);
}
