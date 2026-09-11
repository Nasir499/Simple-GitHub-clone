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
    let apiUrl = process.env.API_URL || "http://localhost:3000";

    try {
      const configData = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      repoId = configData.repoId || null;
      token = configData.token || null;
      if (configData.apiUrl) apiUrl = configData.apiUrl;
    } catch {
      // Config file missing or invalid
    }

    if (!token) {
      const globalCredPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.mygit', 'credentials.json');
      try {
        const credData = JSON.parse(await fs.readFile(globalCredPath, 'utf-8'));
        token = credData.token;
      } catch {}
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

    const commitDirs = await fs.readdir(commitsPath);
    const newCommits = commitDirs.filter(dir => !pushedCommits.includes(dir));

    if (newCommits.length === 0) {
      console.log('Everything up to date. No new commits to push.');
      return;
    }

    console.log(`Found ${newCommits.length} un-pushed commit(s). Uploading to backend server...\n`);

    for (const commitDir of newCommits) {
      const commitPath = path.join(commitsPath, commitDir);
      const relativeFiles = await listFilesRecursive(commitPath, commitPath);

      const filePayloads = [];
      let processed = 0;
      const totalFiles = relativeFiles.length;

      renderProgressBar(0, totalFiles, 'Starting...');

      for (const relFile of relativeFiles) {
        const fullPath = path.join(commitPath, relFile);
        const content = await fs.readFile(fullPath, 'utf-8');
        filePayloads.push({
          path: relFile,
          content
        });
        processed++;
        renderProgressBar(processed, totalFiles, relFile);
      }

      // Read commit metadata message if available
      let commitMessage = "CLI Commit";
      try {
        const metaPath = path.join(commitPath, 'commit.json');
        const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
        commitMessage = metaData.message || commitMessage;
      } catch {}

      try {
        await pushCommits(apiUrl, repoId, token, commitDir, commitMessage, filePayloads);
        pushedCommits.push(commitDir);
      } catch (err) {
        console.error(`\n❌ Push failed for commit ${commitDir}: ${err.message}`);
        process.exit(1);
      }
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
