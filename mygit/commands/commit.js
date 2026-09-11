import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function commitRepo(message) {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const stagingPath = path.join(repoPath, "staging");
  const commitsPath = path.join(repoPath, "commits");
  const headPath = path.join(repoPath, "HEAD");
  const indexPath = path.join(repoPath, "index.json");

  try {
    // Check if staging area has files
    let stagedFiles;
    try {
      stagedFiles = await fs.readdir(stagingPath);
    } catch {
      console.error('Nothing to commit. Run "mygit add ." first to stage files.');
      return;
    }

    if (stagedFiles.length === 0) {
      console.error('Nothing to commit. Staging area is empty.');
      return;
    }

    // Read current HEAD for parent tracking
    let parentCommit = null;
    try {
      const headData = JSON.parse(await fs.readFile(headPath, 'utf-8'));
      parentCommit = headData.current;
    } catch {
      // HEAD doesn't exist yet, first commit
    }

    const commitId = uuidv4();
    const commitDir = path.join(commitsPath, commitId);
    await fs.mkdir(commitDir, { recursive: true });

    // Copy staged files to commit directory (preserving structure)
    await copyDirectory(stagingPath, commitDir);

    // Write commit metadata
    await fs.writeFile(
      path.join(commitDir, 'commit.json'),
      JSON.stringify({
        id: commitId,
        message: message || "CLI Commit",
        date: new Date().toISOString(),
        parent: parentCommit
      }, null, 2)
    );

    // Update HEAD to point to new commit
    await fs.writeFile(
      headPath,
      JSON.stringify({ current: commitId, branch: "main" }, null, 2)
    );

    // Clear staging area and index file
    await fs.rm(stagingPath, { recursive: true, force: true });
    await fs.mkdir(stagingPath, { recursive: true });
    await fs.writeFile(
      indexPath,
      JSON.stringify({ staged: [], updatedAt: new Date().toISOString() }, null, 2)
    );

    console.log(`Changes committed with ID: ${commitId}`);
  } catch (error) {
    console.error('ERROR!! Committing Changes', error);
  }
}

async function copyDirectory(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export { commitRepo };
