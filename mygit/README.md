# `@nasir499/mygit`

> A lightweight, independent Git-like CLI client for managing local repository staging, commit snapshots, and remote file synchronization with the GitHub Clone backend engine.

[![npm version](https://img.shields.io/npm/v/@nasir499/mygit.svg)](https://www.npmjs.com/package/@nasir499/mygit)
[![license](https://img.shields.io/npm/l/@nasir499/mygit.svg)](https://github.com/Nasir499/Simple-GitHub-clone)

---

## 📦 Installation

Install globally via `npm`:

```bash
npm install -g @nasir499/mygit
```

Or run directly using `npx`:

```bash
npx @nasir499/mygit <command>
```

---

## ⚡ Quick Start & Usage Workflow

Open any project folder on your machine and run the following commands:

### 1. Initialize Local Tracking
Link your local project folder to your MongoDB Repository ID from the Web App:

```bash
mygit init <repoId>
```
*(Example: `mygit init 6a9170811b8a1469cf840539`)*

### 2. Stage Your Files
Stage all files and directories in the current folder:

```bash
mygit add .
```

Or stage a specific file:

```bash
mygit add index.js
```

### 3. Take a Commit Snapshot
Create a local commit snapshot:

```bash
mygit commit "Initial commit: Upload project source code"
```

### 4. Push Files to Cloud Storage
Upload all un-pushed commit snapshots to AWS S3 via the backend API:

```bash
mygit push
```

---

## 🛠️ Complete Command Reference

| Command | Description |
|---|---|
| `mygit init <repoId>` | Initializes local `.mygit/` folder and links to web repository `<repoId>`. |
| `mygit add <file\|.>` | Stages individual files or directory trees recursively into `.mygit/staging/`. |
| `mygit commit "<message>"` | Takes a commit snapshot inside `.mygit/commits/<commitId>/`. |
| `mygit push` | Sends un-pushed commit files over HTTP API to the backend server & AWS S3. |
| `mygit pull` | Downloads remote commits from the server to your local repository. |
| `mygit revert <commitId>` | Restores working directory to a specific commit snapshot. |

---

## 🏗️ Architecture Overview

`mygit` operates as a clean, independent client:

```text
                 mygit
              CLI Package
                  │
                  │ HTTP API (JSON)
                  ▼
               Backend
          (Express Server)
                  │
          ┌───────┴───────┐
          ▼               ▼
       Database          S3
      (MongoDB)       (AWS S3)
```

- **Local Storage**: Maintains local `.mygit/` metadata (HEAD pointers, staging area, commit snapshots).
- **Zero Direct AWS Dependency**: Communicates purely over HTTP with the backend server API.
- **Cross-Platform**: Automatic path sanitization for POSIX and Windows environments.

---

## 📄 License

ISC License.
