const core = require('@actions/core');
const github = require('@actions/github');

const START_MARKER = '<!-- GITSTACK-BADGE:START -->';
const END_MARKER = '<!-- GITSTACK-BADGE:END -->';

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });
    const readmePath = core.getInput('readme-path') || 'README.md';
    const gitstackUrl = (core.getInput('gitstack-url') || 'https://gitstack.pro').replace(/\/$/, '');
    const badgeStyle = core.getInput('badge-style') || 'for-the-badge';
    const commitMessage = core.getInput('commit-message') || 'docs: add GitStack analysis badge';
    const sectionTitle = core.getInput('section-title') || '## Tech Stack';

    const { owner, repo } = github.context.repo;
    const repoUrl = `${gitstackUrl}/r/${owner}/${repo}`;
    const embedUrl = `${gitstackUrl}/embed/r/${owner}/${repo}`;

    // Build shields.io badges
    const stackBadge = `[![GitStack Stack](https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=${badgeStyle}&logo=github)](${repoUrl})`;
    const translateBadge = `[![GitStack Translate](https://img.shields.io/badge/Plain%20English-Explanation-00B894?style=${badgeStyle})](${repoUrl})`;
    const xrayBadge = `[![GitStack X-Ray](https://img.shields.io/badge/Repo%20X--Ray-Architecture-E17055?style=${badgeStyle})](${repoUrl})`;

    const badgeBlock = `${START_MARKER}\n\n${sectionTitle}\n\n${stackBadge} ${translateBadge} ${xrayBadge}\n\n> 🔍 [View full tech-stack analysis on GitStack](${repoUrl}) · [Embed this repo](${embedUrl})\n\n${END_MARKER}`;

    const octokit = github.getOctokit(token);

    // Get current README
    let readmeContent = '';
    let readmeSha = null;
    let readmeExists = false;

    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: readmePath,
        ref: github.context.sha || github.context.ref,
      });
      readmeExists = true;
      readmeSha = data.sha;
      readmeContent = Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (err) {
      if (err.status === 404) {
        core.info(`${readmePath} not found — will create new file.`);
      } else {
        throw err;
      }
    }

    let newContent;
    if (readmeContent.includes(START_MARKER) && readmeContent.includes(END_MARKER)) {
      // Replace existing section
      const regex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, 'g');
      newContent = readmeContent.replace(regex, badgeBlock);
      core.info('Existing GitStack badge section updated.');
    } else {
      // Append to end
      const separator = readmeContent.endsWith('\n') ? '\n' : '\n\n';
      newContent = readmeContent + separator + badgeBlock + '\n';
      core.info('New GitStack badge section appended to README.');
    }

    if (newContent === readmeContent) {
      core.info('No changes detected — README already up to date.');
      return;
    }

    // Commit
    const committer = {
      name: 'github-actions[bot]',
      email: 'github-actions[bot]@users.noreply.github.com',
    };

    const contentEncoded = Buffer.from(newContent).toString('base64');

    const params = {
      owner,
      repo,
      path: readmePath,
      message: commitMessage,
      content: contentEncoded,
      committer,
      author: committer,
    };
    if (readmeSha) params.sha = readmeSha;

    await octokit.rest.repos.createOrUpdateFileContents(params);

    core.info(`✅ README badge committed: ${repoUrl}`);
    core.setOutput('gitstack-url', repoUrl);
    core.setOutput('embed-url', embedUrl);
  } catch (error) {
    core.setFailed(`GitStack badge action failed: ${error.message}`);
  }
}

run();
