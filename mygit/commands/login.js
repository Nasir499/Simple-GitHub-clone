import fs from "fs/promises";
import path from "path";
import { loginUser } from "../api/repoApi.js";

async function loginRepo(username, password) {
  const globalCredDir = path.join(process.env.USERPROFILE || process.env.HOME || '', '.mygit');
  const globalCredPath = path.join(globalCredDir, 'credentials.json');

  let apiUrl = process.env.API_URL || "https://github-clone-backend-mt2h.onrender.com";

  // Check if local repo config overrides apiUrl
  const localConfigPath = path.resolve(process.cwd(), ".mygit", "config.json");
  try {
    const configData = JSON.parse(await fs.readFile(localConfigPath, 'utf-8'));
    if (configData.apiUrl) apiUrl = configData.apiUrl;
  } catch {}

  try {
    console.log(`Logging in as "${username}"...`);
    const data = await loginUser(apiUrl, username, password);

    if (!data.token) {
      throw new Error("No token received from backend server.");
    }

    await fs.mkdir(globalCredDir, { recursive: true });
    await fs.writeFile(
      globalCredPath,
      JSON.stringify({ token: data.token, userId: data.userId, username }, null, 2)
    );

    // Also update local .mygit/config.json if in a repository directory
    try {
      const localRepoPath = path.resolve(process.cwd(), ".mygit");
      await fs.access(localRepoPath);
      let localConfig = {};
      try {
        localConfig = JSON.parse(await fs.readFile(localConfigPath, 'utf-8'));
      } catch {}
      localConfig.token = data.token;
      await fs.writeFile(localConfigPath, JSON.stringify(localConfig, null, 2));
    } catch {}

    console.log(`\n🎉 Successfully logged in as "${username}"! Global credentials updated.`);
  } catch (error) {
    console.error(`\n❌ Login failed: ${error.message}`);
    process.exit(1);
  }
}

export { loginRepo };
