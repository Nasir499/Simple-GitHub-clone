import fs from 'fs/promises';
import path from 'path';
import { loadIgnorePatterns, isIgnored } from '../utils/ignore.js';

async function addRepo(filePath) {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const stagingPath = path.join(repoPath, "staging");

  try {
    await fs.mkdir(stagingPath, { recursive: true });
    const rootPath = process.cwd();
    const ignorePatterns = await loadIgnorePatterns(rootPath);

    let stagedCount = 0;

    if (filePath === '.') {
      stagedCount = await stageDirectory(rootPath, rootPath, stagingPath, ignorePatterns);
      console.log(`\n✅ Added ${stagedCount} file(s) to staging area (automatically discarded node_modules, build artifacts & .gitignore files).`);
    } else {
      const absolutePath = path.resolve(rootPath, filePath);
      const relativePath = path.relative(rootPath, absolutePath);
      const name = path.basename(absolutePath);
      const stat = await fs.stat(absolutePath);

      if (stat.isDirectory()) {
        if (isIgnored(name, relativePath, true, ignorePatterns)) {
          console.log(`\n⚠️ Directory "${filePath}" is in ignore rules and was skipped.`);
          return;
        }
        stagedCount = await stageDirectory(absolutePath, rootPath, stagingPath, ignorePatterns);
        console.log(`\n✅ Added ${stagedCount} file(s) from directory "${filePath}" to staging area.`);
      } else {
        if (isIgnored(name, relativePath, false, ignorePatterns)) {
          console.log(`\n⚠️ File "${filePath}" is in ignore rules and was skipped.`);
          return;
        }
        const destPath = path.join(stagingPath, relativePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(absolutePath, destPath);
        stagedCount = 1;
        console.log(`\n✅ File "${filePath}" added to staging area successfully.`);
      }
    }

    // Update index file with staged files list
    await updateIndex(stagingPath, repoPath);
  } catch (error) {
    console.error('ERROR!! Adding File:', error);
  }
}

async function stageDirectory(dirPath, rootPath, stagingPath, ignorePatterns) {
  let count = 0;
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (isIgnored(entry.name, relativePath, entry.isDirectory(), ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      count += await stageDirectory(fullPath, rootPath, stagingPath, ignorePatterns);
    } else {
      const destPath = path.join(stagingPath, relativePath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(fullPath, destPath);
      count++;
    }
  }

  return count;
}

async function updateIndex(stagingPath, repoPath) {
  const files = await listFilesRecursive(stagingPath, stagingPath);
  await fs.writeFile(
    path.join(repoPath, 'index.json'),
    JSON.stringify({ staged: files, updatedAt: new Date().toISOString() }, null, 2)
  );
}

async function listFilesRecursive(dirPath, basePath) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
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
