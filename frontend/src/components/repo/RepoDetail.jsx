import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../../api.js';
import { useAuth } from '../../useAuth.js';
import Navbar from '../Navbar';
import { getHighlightedCodeLines } from '../../utils/syntaxHighlighter.js';
import './repoDetail.css';

function RepoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [repo, setRepo] = useState(null);
  const [s3Files, setS3Files] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentFolder, setCurrentFolder] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileExtension = (filename) => {
    if (!filename) return 'TXT';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'TXT';
  };

  const fetchRepoAndFiles = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [repoRes, s3Res] = await Promise.all([
        API.get(`/repo/${id}`),
        API.get(`/repo/${id}/s3-files`).catch(() => ({ data: { files: [] } }))
      ]);
      setRepo(repoRes.data);
      setS3Files(Array.isArray(s3Res.data?.files) ? s3Res.data.files : []);
    } catch (err) {
      console.error('Error fetching repository:', err);
      setError('Repository not found or access denied');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Initial fetch on page load
  useEffect(() => {
    fetchRepoAndFiles();
  }, [id, fetchRepoAndFiles]);

  const handleOpenFile = async (fileKey, fileName) => {
    setSelectedFile(fileName);
    setLoadingFileContent(true);
    try {
      const res = await API.get(`/repo/s3-content?key=${encodeURIComponent(fileKey)}&repoId=${id}`);
      setFileContent(res.data.content);
    } catch (err) {
      console.error('Error loading file content:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Error loading file content from S3.';
      setFileContent(`⚠️ Unable to load file content.\nReason: ${serverMsg}`);
    } finally {
      setLoadingFileContent(false);
    }
  };

  const handleDeleteRepo = async () => {
    if (!window.confirm(`Are you sure you want to delete "${repo.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await API.delete(`/repo/delete/${id}`);
      navigate('/');
    } catch (err) {
      console.error('Error deleting repository:', err);
      alert(err.response?.data?.message || 'Failed to delete repository');
    }
  };

  const closeModal = () => {
    setSelectedFile(null);
    setFileContent('');
  };

  if (loading) {
    return (
      <div className="repo-page">
        <Navbar />
        <div className="repo-loading">
          <div className="spinner"></div>
          <p>Loading repository & files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="repo-page">
        <Navbar />
        <div className="repo-error">{error}</div>
      </div>
    );
  }

  const isOwner = currentUser === repo.owner?._id || currentUser === repo.owner;

  // Deduplicate S3 files and DB content, normalizing Windows backslashes (\ -> /)
  const normalizedS3Files = s3Files
    .filter(f => !f.name.endsWith('commit.json'))
    .map(f => ({ ...f, name: f.name.replace(/\\/g, '/') }));

  const s3Names = new Set(normalizedS3Files.map(f => f.name));

  const dbOnlyFiles = (repo.content || [])
    .map(f => f.replace(/\\/g, '/'))
    .filter(f => !s3Names.has(f) && !f.endsWith('commit.json'))
    .map(f => ({ name: f, source: 'database' }));

  const allFiles = [...normalizedS3Files, ...dbOnlyFiles];

  // Helper to filter items for the current folder path
  const getFolderContents = (files, currentPath) => {
    const prefix = currentPath ? currentPath + '/' : '';
    const folders = new Map();
    const fileItems = [];

    for (const file of files) {
      if (prefix && !file.name.startsWith(prefix)) continue;

      const relative = prefix ? file.name.slice(prefix.length) : file.name;
      const parts = relative.split('/');

      if (parts.length > 1) {
        const folderName = parts[0];
        if (!folders.has(folderName)) {
          folders.set(folderName, {
            displayName: folderName,
            fullPath: prefix + folderName,
            isFolder: true,
            commitId: file.commitId,
            lastModified: file.lastModified
          });
        }
      } else if (parts.length === 1 && parts[0] !== '') {
        fileItems.push({
          ...file,
          displayName: parts[0],
          isFolder: false
        });
      }
    }

    return [...folders.values(), ...fileItems];
  };

  const visibleItems = getFolderContents(allFiles, currentFolder);

  const navigateUp = () => {
    const parts = currentFolder.split('/');
    parts.pop();
    setCurrentFolder(parts.join('/'));
  };

  const folderParts = currentFolder ? currentFolder.split('/') : [];

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://github-clone-backend-mt2h.onrender.com';

  return (
    <div className="repo-page">
      <Navbar />
      <div className="repo-detail-container">
        <div className="repo-detail-header">
          <div className="repo-detail-title">
            <Link to="/" className="repo-detail-back">&larr; Back</Link>
            <div className="title-row">
              <h1>
                <Link to={`/user/${repo.owner?._id || repo.owner}`} className="repo-owner">{repo.owner?.username || 'Unknown'}</Link>
                <span className="repo-separator">/</span>
                <span className="repo-name">{repo.name}</span>
              </h1>
              <span className={`visibility-badge ${repo.visibility ? 'public' : 'private'}`}>
                {repo.visibility ? 'Public' : 'Private'}
              </span>

              {isOwner && (
                <button className="btn-delete-repo" onClick={handleDeleteRepo}>
                  🗑️ Delete Repository
                </button>
              )}
            </div>
          </div>
          <p className="repo-description">{repo.description || 'No description provided.'}</p>
          <p className="repo-meta">Created: {new Date(repo.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Automated Installer Setup Banner */}
        <div className="cli-setup-banner">
          <div className="cli-banner-header">
            <span className="terminal-icon">💻</span>
            <h4>Quick Setup — Push code from terminal</h4>
          </div>

          <div className="cli-setup-steps">
            <div className="cli-step">
              <span className="step-number">1</span>
              <div className="step-content">
                <h5>Install mygit CLI & log in to your account (Run once per computer)</h5>
                <div className="cli-code-block">
                  <code>npm install -g @nasir499/mygit</code>
                  <code>mygit login &lt;username&gt; &lt;password&gt;</code>
                </div>
              </div>
            </div>

            <div className="cli-step" style={{ marginTop: '14px' }}>
              <span className="step-number">2</span>
              <div className="step-content">
                <h5>Initialize & push code from your project folder</h5>
                <div className="cli-code-block">
                  <code>mygit init {id}</code>
                  <code>mygit add .</code>
                  <code>mygit commit "Upload files by {repo.owner?.username || 'user'}"</code>
                  <code>mygit push</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pushed Files & Folders Section */}
        <div className="repo-detail-section">
          <div className="section-header">
            <h3>Files & Directories ({allFiles.length})</h3>
            <div className="header-actions">
              <button
                className={`btn-refresh-files ${refreshing ? 'spinning' : ''}`}
                onClick={() => fetchRepoAndFiles(true)}
                title="Refresh files list"
              >
                🔄 Refresh
              </button>
              <span className="s3-cloud-badge">☁️ AWS S3 Synced</span>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="folder-breadcrumb">
            <span className="breadcrumb-item clickable" onClick={() => setCurrentFolder('')}>
              📁 {repo.name}
            </span>
            {folderParts.map((part, idx) => {
              const subPath = folderParts.slice(0, idx + 1).join('/');
              return (
                <React.Fragment key={subPath}>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-item clickable" onClick={() => setCurrentFolder(subPath)}>
                    {part}
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          {allFiles.length > 0 ? (
            <div className="file-list-table">
              <div className="file-table-header">
                <span>Name</span>
                <span>Commit ID</span>
                <span>Size</span>
                <span>Last Modified</span>
              </div>

              {/* Back to Parent Directory Button */}
              {currentFolder && (
                <div className="file-table-row clickable parent-row" onClick={navigateUp}>
                  <div className="file-name-cell">
                    <span className="file-icon">📁</span>
                    <span className="file-name">..</span>
                  </div>
                  <span className="file-commit-cell">-</span>
                  <span className="file-size-cell">-</span>
                  <span className="file-date-cell">-</span>
                </div>
              )}

              {visibleItems.map((item, index) => (
                <div
                  key={index}
                  className="file-table-row clickable"
                  onClick={() => {
                    if (item.isFolder) {
                      setCurrentFolder(item.fullPath);
                    } else if (item.key) {
                      handleOpenFile(item.key, item.displayName || item.name);
                    }
                  }}
                >
                  <div className="file-name-cell">
                    <span className="file-icon">{item.isFolder ? '📁' : '📄'}</span>
                    <span className={`file-name ${item.isFolder ? 'folder-link' : ''}`}>
                      {item.displayName || item.name}
                    </span>
                  </div>
                  <span className="file-commit-cell">
                    {item.commitId ? item.commitId.slice(0, 8) : 'latest'}
                  </span>
                  <span className="file-size-cell">
                    {item.isFolder ? '-' : item.size ? `${(item.size / 1024).toFixed(1)} KB` : '-'}
                  </span>
                  <span className="file-date-cell">
                    {item.lastModified
                      ? new Date(item.lastModified).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-files-box">
              <span className="box-icon">📁</span>
              <p>No pushed files yet. Follow the CLI commands above to push files!</p>
            </div>
          )}
        </div>

        {/* Issues Section */}
        <div className="repo-detail-section">
          <div className="section-header">
            <h3>Issues ({repo.issues?.length || 0})</h3>
            <Link to={`/repo/${id}/issues/new`} className="new-issue-btn">New Issue</Link>
          </div>
          {repo.issues && repo.issues.length > 0 ? (
            <div className="issues-list">
              {repo.issues.map((issue) => (
                <Link key={issue._id} to={`/issue/${issue._id}`} className="issue-item">
                  <span className={`issue-status ${issue.status}`}>
                    {issue.status === 'open' ? '🟢' : '🔴'}
                  </span>
                  <div className="issue-info">
                    <h4>{issue.title}</h4>
                    <p>#{issue._id?.slice(-6)} • {issue.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-message">No issues yet.</p>
          )}
        </div>
      </div>

      {/* Code Viewer Modal */}
      {selectedFile && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content code-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <span className="modal-file-icon">📄</span>
                <h3 className="modal-file-title">{selectedFile}</h3>
                <span className="file-ext-badge">{getFileExtension(selectedFile)}</span>
              </div>
              <div className="modal-header-actions">
                <button
                  className={`btn-copy-code ${copied ? 'copied' : ''}`}
                  onClick={handleCopyCode}
                  title="Copy code to clipboard"
                >
                  {copied ? '✓ Copied!' : '📋 Copy Code'}
                </button>
                <button className="modal-close-btn" onClick={closeModal}>&times;</button>
              </div>
            </div>

            <div className="modal-body code-modal-body">
              {loadingFileContent ? (
                <div className="code-loading">
                  <div className="spinner"></div>
                  <p>Fetching file content from AWS S3...</p>
                </div>
              ) : (
                <div className="code-viewer-wrapper">
                  <table className="code-table">
                    <tbody>
                      {getHighlightedCodeLines(fileContent, selectedFile).map((lineHtml, idx) => (
                        <tr key={idx} className="code-line-row">
                          <td className="line-num-td">{idx + 1}</td>
                          <td
                            className="line-code-td"
                            dangerouslySetInnerHTML={{ __html: lineHtml || ' ' }}
                          />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loadingFileContent && fileContent && (
              <div className="modal-footer">
                <span className="file-stat">{fileContent.split('\n').length} lines</span>
                <span className="stat-separator">•</span>
                <span className="file-stat">{(new Blob([fileContent]).size / 1024).toFixed(2)} KB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RepoDetail;
