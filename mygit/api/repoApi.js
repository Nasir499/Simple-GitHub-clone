/**
 * API client module for communicating with backend HTTP services.
 * Keeps CLI logic cleanly separated from backend internals.
 */

async function pushCommits(apiUrl, repoId, token, commitId, commitMessage, files) {
  const url = `${apiUrl}/repo/${repoId}/push`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      commitId,
      commitMessage: commitMessage || "CLI Commit",
      files
    })
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

async function fetchS3Files(apiUrl, repoId, token) {
  const url = `${apiUrl}/repo/${repoId}/s3-files`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

async function fetchFileContent(apiUrl, key, repoId, token) {
  const queryParams = new URLSearchParams({ key });
  if (repoId) queryParams.append('repoId', repoId);

  const url = `${apiUrl}/repo/s3-content?${queryParams.toString()}`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

async function loginUser(apiUrl, username, password) {
  const url = `${apiUrl}/login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

export {
  pushCommits,
  fetchS3Files,
  fetchFileContent,
  loginUser
};
