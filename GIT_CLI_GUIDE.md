# 🚀 Custom Git CLI (`mygit`) — Setup & User Guide

A step-by-step guide on how to configure and use the custom version control CLI (`mygit`) to stage, commit, and push files from **any folder on your computer** to AWS S3 and view them live on your GitHub Clone Web App.

---

## ⚡ 1. Global Installation (Recommended)

You can install `mygit` globally using npm:

```bash
npm install -g @nasir499/mygit
```

🎉 **Done!** You can now use `mygit` as a command from any terminal window on your machine.

---

## 📁 2. Step-by-Step Guide: Uploading Files to Web Repositories

Open a terminal inside **any project folder on your computer** (e.g., `D:\MyProject` or `C:\Users\YourName\Desktop\my-app`) and follow these 4 steps:

### 🔹 Step 1: Initialize Repository Link
```bash
mygit init <repoId>
```
*Replace `<repoId>` with your MongoDB Repository ID from the Web App URL (e.g. `6a9170811b8a1469cf840539`).*

- **What it does**: Creates a hidden `.mygit/` folder containing staging area, commit tracking, and configuration pointing to your web repository.
- **Output**: `Repository initialized successfully for repo: 6a9170811b8a1469cf840539`

---

### 🔹 Step 2: Stage Your Files
To stage **all files and folders** in the current directory:
```bash
mygit add .
```
To stage a **specific file**:
```bash
mygit add index.js
```
- **What it does**: Copies your files recursively into `.mygit/staging/` while preserving directory structures.
- **Output**: `All files added to staging area successfully`

---

### 🔹 Step 3: Create a Commit Snapshot
```bash
mygit commit "Initial commit: Added my project source code"
```
- **What it does**: 
  - Creates a unique commit snapshot folder inside `.mygit/commits/<commit-id>/`.
  - Writes metadata (`commit.json`) with your message and timestamp.
  - Updates `HEAD` to point to the new commit.
  - Clears `.mygit/staging/`.
- **Output**: `Changes committed with ID: fa5f2546-aba6-453e-ae53-a22d900faf37`

---

### 🔹 Step 4: Push Files to AWS S3 Cloud
```bash
mygit push
```
- **What it does**: Uploads all un-pushed commit files directly to your AWS S3 bucket (`nasir499-github-clone`) using fast parallel chunked uploads.
- **Output**: 
  ```text
  Found 1 un-pushed commit(s). Uploading to server...

  Uploading: [██████████████████████████████] 100% | 80/80 files (server\utils\sendEmail.js)

  🎉 Successfully pushed 1 commit(s) to server & AWS S3!
  ```

---

## 🌐 3. Viewing Pushed Files on the Web App

1. **Start Backend & Frontend**:
   - Backend: `cd backend && npm start` (Runs on `http://localhost:3000`)
   - Frontend: `cd frontend && npm run dev` (Runs on `http://localhost:5173`)

2. **Open Browser**:
   Navigate to **`http://localhost:5173/repo/<repoId>`** and sign in.

3. **Browse Files & Code**:
   - Pushed files appear under **Files & Directories** with a ☁️ **AWS S3 Synced** badge.
   - Click any file to open the built-in **Code Viewer Modal** and view your code live in the browser!

---

## 🛠️ 4. Commands Reference

| Command | Description |
|---|---|
| `mygit init <repoId>` | Initializes local tracking linked to web repository ID `<repoId>`. |
| `mygit add <file\|.>` | Stages files or directories into `.mygit/staging/`. |
| `mygit commit <message>` | Takes a local snapshot of staged files. |
| `mygit push` | Uploads un-pushed commit files to AWS S3 via Express API. |
| `mygit pull` | Downloads remote commits from S3 to local repository. |
| `mygit revert <commitId>` | Restores working directory to a specific commit snapshot. |

---

## ❓ 5. Troubleshooting & Tips

- **Reset Stuck Push Track**:
  If a commit failed midway, remove the push tracking log to force re-upload:
  ```powershell
  Remove-Item -Force .mygit\push-track.json
  ```

- **Large Project Uploads**:
  The backend server supports body payloads up to **50MB** and processes S3 uploads in **parallel chunks of 15 files** for high performance.
