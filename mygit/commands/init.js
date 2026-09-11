import fs from "fs/promises";
import path from "path";

async function initRepo(repoId) {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
  const stagingPath = path.join(repoPath, "staging");

  try {
    await fs.mkdir(repoPath, { recursive: true });
    await fs.mkdir(commitsPath, { recursive: true });
    await fs.mkdir(stagingPath, { recursive: true });

    const apiUrl = process.env.API_URL || "https://github-clone-backend-mt2h.onrender.com";

    const configData = {
      apiUrl
    };

    if (repoId && typeof repoId === 'string') {
      configData.repoId = repoId;
    }

    await fs.writeFile(
      path.join(repoPath, "config.json"),
      JSON.stringify(configData, null, 2)
    );

    // Initialize HEAD pointer to track the latest commit
    await fs.writeFile(
      path.join(repoPath, "HEAD"),
      JSON.stringify({ current: null, branch: "main" }, null, 2)
    );

    console.log('Repository initialized successfully' + (repoId ? ` for repo: ${repoId}` : ''));
  } catch (error) {
    console.error('ERROR!! Initialising the repository', error);
    process.exit(1);
  }
}

export { initRepo };
