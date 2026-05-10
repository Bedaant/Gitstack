// Local smoke test - verifies badge markdown generation without hitting GitHub API
const START_MARKER = '<!-- GITSTACK-BADGE:START -->';
const END_MARKER = '<!-- GITSTACK-BADGE:END -->';

function buildBadgeBlock({ owner, repo, gitstackUrl = 'https://gitstack.pro', badgeStyle = 'for-the-badge', sectionTitle = '## Tech Stack' }) {
  const repoUrl = `${gitstackUrl}/r/${owner}/${repo}`;
  const embedUrl = `${gitstackUrl}/embed/r/${owner}/${repo}`;
  const stackBadge = `[![GitStack Stack](https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=${badgeStyle}&logo=github)](${repoUrl})`;
  const translateBadge = `[![GitStack Translate](https://img.shields.io/badge/Plain%20English-Explanation-00B894?style=${badgeStyle})](${repoUrl})`;
  const xrayBadge = `[![GitStack X-Ray](https://img.shields.io/badge/Repo%20X--Ray-Architecture-E17055?style=${badgeStyle})](${repoUrl})`;
  return `${START_MARKER}\n\n${sectionTitle}\n\n${stackBadge} ${translateBadge} ${xrayBadge}\n\n> 🔍 [View full tech-stack analysis on GitStack](${repoUrl}) · [Embed this repo](${embedUrl})\n\n${END_MARKER}`;
}

// Test 1: Fresh README
const existingReadme = '# MyProject\n\nA cool project.\n';
const block = buildBadgeBlock({ owner: 'acme', repo: 'widget' });
const appended = existingReadme + '\n' + block + '\n';
console.log('--- Test 1: Append to fresh README ---');
console.log(appended);

// Test 2: Replace existing block
const readmeWithBlock = existingReadme + '\n' + block + '\n';
const regex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, 'g');
const newBlock = buildBadgeBlock({ owner: 'acme', repo: 'widget', badgeStyle: 'flat-square' });
const replaced = readmeWithBlock.replace(regex, newBlock);
console.log('\n--- Test 2: Replace existing block (style changed) ---');
console.log(replaced);

// Assertions
const assert = require('assert');
assert(appended.includes('GITSTACK-BADGE:START'), 'marker missing');
assert(appended.includes('gitstack.pro/r/acme/widget'), 'repo URL missing');
assert(replaced.includes('flat-square'), 'style not updated');
assert(!replaced.includes('for-the-badge'), 'old style leaked');
console.log('\n✅ All assertions passed.');
