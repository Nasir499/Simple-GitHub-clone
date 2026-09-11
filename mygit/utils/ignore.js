import fs from 'fs/promises';
import path from 'path';

const DEFAULT_IGNORE_NAMES = new Set([
  'node_modules',
  '.git',
  '.mygit',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.cache',
  'target',
  'bin',
  'obj',
  'coverage',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.DS_Store',
  'Thumbs.db'
]);

const DEFAULT_IGNORE_EXTS = ['.log', '.tmp', '.exe', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz'];

async function loadIgnorePatterns(rootPath) {
  const customPatterns = [];
  const gitignorePath = path.join(rootPath, '.gitignore');

  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        customPatterns.push(trimmed.replace(/^\//, ''));
      }
    }
  } catch {}

  return customPatterns;
}

function isIgnored(name, relativePath, isDirectory, customPatterns = []) {
  const cleanName = name.trim();
  const cleanRelPath = relativePath.replace(/\\/g, '/');

  // 1. Check default exact directory/file names
  if (DEFAULT_IGNORE_NAMES.has(cleanName)) {
    return true;
  }

  // 2. Check default extension rules
  const ext = path.extname(cleanName).toLowerCase();
  if (DEFAULT_IGNORE_EXTS.includes(ext)) {
    return true;
  }

  // 3. Check custom .gitignore patterns
  for (const pattern of customPatterns) {
    const cleanPattern = pattern.replace(/\/$/, '');
    if (cleanName === cleanPattern || cleanRelPath === cleanPattern) {
      return true;
    }
    if (cleanRelPath.startsWith(cleanPattern + '/')) {
      return true;
    }
    if (pattern.startsWith('*.')) {
      const targetExt = pattern.slice(1);
      if (cleanName.endsWith(targetExt)) {
        return true;
      }
    }
  }

  return false;
}

export { loadIgnorePatterns, isIgnored };
