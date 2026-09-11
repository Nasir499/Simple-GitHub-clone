import fs from 'fs/promises';
import path from 'path';

async function revertRepo(argv) {
  const commitId = typeof argv === 'object' && argv !== null ? argv.commitId : argv;
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
  const commitDir = path.join(commitsPath, commitId);

  try {
    // Verify commit exists
    try {
      await fs.access(commitDir);
    } catch {
      console.error(`Commit ${commitId} not found.`);
      return;
    }

    // Read commit files (excluding commit.json)
    const entries = await fs.readdir(commitDir, { withFileTypes: true });
    const workingDir = process.cwd();

    for (const entry of entries) {
      if (entry.name === 'commit.json') continue;

      const srcPath = path.join(commitDir, entry.name);
      const destPath = path.join(workingDir, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(srcPath, destPath);
      }
    }

    // Update HEAD to point to this commit
    await fs.writeFile(
      path.join(repoPath, "HEAD"),
      JSON.stringify({ current: commitId, branch: "main" }, null, 2)
    );

    console.log(`Successfully reverted to commit: ${commitId}`);
  } catch (error) {
    console.error('ERROR!! Reverting Changes', error);
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export { revertRepo };
