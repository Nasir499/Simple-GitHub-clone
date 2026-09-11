import fs from 'fs/promises';
import path from 'path';

async function addRepo(filePath) {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const stagingPath = path.join(repoPath, "staging");

  try {
    await fs.mkdir(stagingPath, { recursive: true });

    if (filePath === '.') {
      // Stage all files in the current directory recursively
      await stageDirectory(process.cwd(), process.cwd(), stagingPath);
      console.log('All files added to staging area successfully');
    } else {
      const absolutePath = path.resolve(process.cwd(), filePath);
      const stat = await fs.stat(absolutePath);

      if (stat.isDirectory()) {
        await stageDirectory(absolutePath, process.cwd(), stagingPath);
        console.log(`Directory ${filePath} added to staging area successfully`);
      } else {
        // Preserve relative path structure in staging
        const relativePath = path.relative(process.cwd(), absolutePath);
        const destPath = path.join(stagingPath, relativePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(absolutePath, destPath);
        console.log(`File ${filePath} added to staging area successfully`);
      }
    }

    // Update index file with staged files list
    await updateIndex(stagingPath, repoPath);
  } catch (error) {
    console.error('ERROR!! Adding File', error);
  }
}

async function stageDirectory(dirPath, rootPath, stagingPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip .mygit directory and node_modules
    if (entry.name === '.mygit' || entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      await stageDirectory(fullPath, rootPath, stagingPath);
    } else {
      const relativePath = path.relative(rootPath, fullPath);
      const destPath = path.join(stagingPath, relativePath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(fullPath, destPath);
    }
  }
}

async function updateIndex(stagingPath, repoPath) {
  const files = await listFilesRecursive(stagingPath, stagingPath);
  await fs.writeFile(
    path.join(repoPath, 'index.json'),
    JSON.stringify({ staged: files, updatedAt: new Date().toISOString() }, null, 2)
  );
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

export { addRepo };
