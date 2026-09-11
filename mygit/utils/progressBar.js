function renderProgressBar(current, total, filename = '') {
  const width = 30;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const filledLength = total > 0 ? Math.round((width * current) / total) : 0;
  const emptyLength = width - filledLength;

  const filledBar = '█'.repeat(filledLength);
  const emptyBar = '░'.repeat(emptyLength);

  const truncatedFile = filename.length > 28 ? '...' + filename.slice(-25) : filename;

  process.stdout.write(
    `\rUploading: [${filledBar}${emptyBar}] ${percentage}% | ${current}/${total} files ${truncatedFile ? `(${truncatedFile})` : ''}          `
  );
  if (current === total) {
    process.stdout.write('\n');
  }
}

export { renderProgressBar };
