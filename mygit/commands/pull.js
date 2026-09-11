import fs from "fs/promises";
import path from "path";
import { fetchS3Files, fetchFileContent } from "../api/repoApi.js";

async function pullRepo() {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
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

    try {
      const configData = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      repoId = configData.repoId || null;
      token = configData.token || null;
      if (configData.apiUrl) apiUrl = configData.apiUrl;
    } catch {}

    if (!token) {
      const globalCredPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.mygit', 'credentials.json');
      try {
        const credData = JSON.parse(await fs.readFile(globalCredPath, 'utf-8'));
        token = credData.token;
      } catch {}
    }

    if (!repoId) {
      console.error('Error: No repository ID configured.');
      return;
    }

    const { files } = await fetchS3Files(apiUrl, repoId, token);

    if (!files || files.length === 0) {
      console.log('No commits or files found on remote server.');
      return;
    }

    for (const fileItem of files) {
      const key = fileItem.key;
      const parts = key.split('/');
      const commitIdIndex = parts.indexOf('commits') + 1;
      if (commitIdIndex <= 0 || commitIdIndex >= parts.length - 1) continue;

      const commitId = parts[commitIdIndex];
      const fileName = parts.slice(commitIdIndex + 1).join('/');
      if (!fileName) continue;

      const localFilePath = path.join(commitsPath, commitId, fileName);
      await fs.mkdir(path.dirname(localFilePath), { recursive: true });

      const fileData = await fetchFileContent(apiUrl, key, repoId, token);
      await fs.writeFile(localFilePath, fileData.content || '', 'utf-8');
    }

    // Checkout latest commit to working directory
    const commitDirs = await fs.readdir(commitsPath);
    let latestCommit = null;
    let latestDate = null;

    for (const dir of commitDirs) {
      try {
        const commitMeta = JSON.parse(
          await fs.readFile(path.join(commitsPath, dir, 'commit.json'), 'utf-8')
        );
        const commitDate = new Date(commitMeta.date);
        if (!latestDate || commitDate > latestDate) {
          latestDate = commitDate;
          latestCommit = dir;
        }
      } catch {}
    }

    if (latestCommit) {
      const latestCommitDir = path.join(commitsPath, latestCommit);
      const relativeFiles = await listFilesRecursive(latestCommitDir, latestCommitDir);
      const workingDir = process.cwd();

      for (const relFile of relativeFiles) {
        if (relFile === 'commit.json' || relFile.endsWith('commit.json')) continue;
        const srcFile = path.join(latestCommitDir, relFile);
        const destFile = path.join(workingDir, relFile);
        await fs.mkdir(path.dirname(destFile), { recursive: true });
        await fs.copyFile(srcFile, destFile);
      }

      await fs.writeFile(
        path.join(repoPath, 'HEAD'),
        JSON.stringify({ current: latestCommit, branch: 'main' }, null, 2)
      );

      console.log(`Pulled and checked out latest commit: ${latestCommit}`);
    } else {
      console.log('All commits pulled successfully.');
    }
  } catch (error) {
    console.error("Error pulling from backend server:", error);
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

export { pullRepo };
