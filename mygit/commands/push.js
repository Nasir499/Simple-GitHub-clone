import fs from "fs/promises";
import path from "path";
import { renderProgressBar } from "../utils/progressBar.js";
import { pushCommits } from "../api/repoApi.js";

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
  const pushTrackPath = path.join(repoPath, "push-track.json");
  const configPath = path.join(repoPath, "config.json");

  try {
    try {
      await fs.access(repoPath);
    } catch {
      console.error('Repository not initialized. Run "mygit init <repoId>" first.');
      return;
    }

    let repoId = null;
    let token = null;
    let apiUrl = process.env.API_URL || "https://github-clone-backend-mt2h.onrender.com";

    // 1. Try reading global credentials first for fresh token
    const globalCredPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.mygit', 'credentials.json');
    try {
      const credData = JSON.parse(await fs.readFile(globalCredPath, 'utf-8'));
      if (credData.token) token = credData.token;
    } catch {}

    // 2. Read local repo config
    try {
      const configData = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      repoId = configData.repoId || null;
      if (!token && configData.token) token = configData.token;
      if (configData.apiUrl) apiUrl = configData.apiUrl;
    } catch {}

    if (!token) {
      console.error('Error: Authentication token missing or expired. Please run "mygit login <username> <password>" first.');
      return;
    }

    if (!repoId) {
      console.error('Error: No repository ID configured. Please re-run "mygit init <repoId>".');
      return;
    }

    let pushedCommits = [];
    try {
      const trackData = await fs.readFile(pushTrackPath, 'utf-8');
      pushedCommits = JSON.parse(trackData).pushed || [];
    } catch {
      // No push tracking file yet
    }

    // Filter to only include valid commit directories
    const allDirs = await fs.readdir(commitsPath);
    const commitDirs = [];
    for (const d of allDirs) {
      try {
        const stat = await fs.stat(path.join(commitsPath, d));
        if (stat.isDirectory()) {
          commitDirs.push(d);
        }
      } catch {}
    }

    const newCommits = commitDirs.filter(dir => !pushedCommits.includes(dir));

    if (newCommits.length === 0) {
      console.log('Everything up to date. No new commits to push.');
      return;
    }

    console.log(`Found ${newCommits.length} un-pushed commit(s). Uploading to backend server...\n`);

    const BATCH_SIZE = 20;

    for (const commitDir of newCommits) {
      const commitPath = path.join(commitsPath, commitDir);
      const relativeFiles = await listFilesRecursive(commitPath, commitPath);

      const allPayloads = [];
      for (const relFile of relativeFiles) {
        // Skip metadata file commit.json from file payloads
        const cleanRel = relFile.replace(/\\/g, '/');
        if (cleanRel === 'commit.json' || cleanRel.endsWith('/commit.json')) continue;

        const fullPath = path.join(commitPath, relFile);
        let content = '';
        try {
          content = await fs.readFile(fullPath, 'utf-8');
        } catch {
          content = '';
        }
        allPayloads.push({
          path: cleanRel,
          content
        });
      }

      // Read commit metadata message if available
      let commitMessage = "CLI Commit";
      try {
        const metaPath = path.join(commitPath, 'commit.json');
        const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
        commitMessage = metaData.message || commitMessage;
      } catch {}

      const totalFiles = allPayloads.length;

      if (totalFiles === 0) {
        pushedCommits.push(commitDir);
        continue;
      }

      renderProgressBar(0, totalFiles, 'Starting batch upload...');

      // Push files in batches of BATCH_SIZE to avoid HTTP payload size / timeout limits
      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batchPayload = allPayloads.slice(i, i + BATCH_SIZE);
        const lastFileInBatch = batchPayload[batchPayload.length - 1]?.path || '';

        try {
          await pushCommits(apiUrl, repoId, token, commitDir, commitMessage, batchPayload);
          renderProgressBar(Math.min(i + BATCH_SIZE, totalFiles), totalFiles, lastFileInBatch);
        } catch (err) {
          console.error(`\n❌ Push failed for commit ${commitDir}: ${err.message}`);
          process.exit(1);
        }
      }

      pushedCommits.push(commitDir);
    }

    await fs.writeFile(pushTrackPath, JSON.stringify({ pushed: pushedCommits }, null, 2));

    console.log(`\n🎉 Successfully pushed ${newCommits.length} commit(s) to server & S3!`);
  } catch (error) {
    console.error("Error during push:", error);
  }
}

async function listFilesRecursive(dirPath, basePath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await listFilesRecursive(fullPath, basePath));
    } else {
      files.push(path.relative(basePath, fullPath));
    }
  }

  return files;
}

export { pushRepo };
