import fs from "fs/promises";
import path from "path";

async function initRepo(repoId) {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
  const stagingPath = path.join(repoPath, "staging");
  const configPath = path.join(repoPath, "config.json");

  try {
    await fs.mkdir(repoPath, { recursive: true });
    await fs.mkdir(commitsPath, { recursive: true });
    await fs.mkdir(stagingPath, { recursive: true });

    let existingConfig = {};
    try {
      existingConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    } catch {}

    const apiUrl = process.env.API_URL || existingConfig.apiUrl || "https://github-clone-backend-mt2h.onrender.com";

    const configData = {
      ...existingConfig,
      apiUrl
    };

    if (repoId && typeof repoId === 'string') {
      configData.repoId = repoId;
    }

    await fs.writeFile(
      configPath,
      JSON.stringify(configData, null, 2)
    );

    // Initialize HEAD pointer to track the latest commit if not present
    const headPath = path.join(repoPath, "HEAD");
    try {
      await fs.access(headPath);
    } catch {
      await fs.writeFile(
        headPath,
        JSON.stringify({ current: null, branch: "main" }, null, 2)
      );
    }

    console.log('Repository initialized successfully' + (repoId ? ` for repo: ${repoId}` : ''));
  } catch (error) {
    console.error('ERROR!! Initialising the repository', error);
    process.exit(1);
  }
}

export { initRepo };
