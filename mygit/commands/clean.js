import fs from 'fs/promises';
import path from 'path';

async function cleanRepo() {
  const repoPath = path.resolve(process.cwd(), ".mygit");

  try {
    try {
      await fs.access(repoPath);
    } catch {
      console.error('Repository not initialized. Run "mygit init <repoId>" first.');
      return;
    }

    const stagingPath = path.join(repoPath, "staging");
    const commitsPath = path.join(repoPath, "commits");
    const pushTrackPath = path.join(repoPath, "push-track.json");
    const indexPath = path.join(repoPath, "index.json");
    const headPath = path.join(repoPath, "HEAD");

    // Clean staging
    try {
      await fs.rm(stagingPath, { recursive: true, force: true });
      await fs.mkdir(stagingPath, { recursive: true });
    } catch {}

    // Clean commits
    try {
      await fs.rm(commitsPath, { recursive: true, force: true });
      await fs.mkdir(commitsPath, { recursive: true });
    } catch {}

    // Clean tracking files
    try {
      await fs.rm(pushTrackPath, { force: true });
    } catch {}

    try {
      await fs.rm(indexPath, { force: true });
    } catch {}

    // Reset HEAD pointer
    await fs.writeFile(
      headPath,
      JSON.stringify({ current: null, branch: "main" }, null, 2)
    );

    console.log('🧹 Cleaned local repository! Discarded all staged files, unwanted folders (like node_modules), and un-pushed commits.');
    console.log('👉 Next step: Run "mygit add ." to stage your source code cleanly, then "mygit commit <msg>" and "mygit push".');
  } catch (error) {
    console.error('ERROR!! Cleaning repository:', error);
  }
}

export { cleanRepo };
