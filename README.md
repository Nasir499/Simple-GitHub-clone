# 🐙 GitHub Clone & `mygit` CLI

A full-stack GitHub clone built with **React**, **Node.js/Express**, **MongoDB**, and **AWS S3**, featuring a standalone custom command-line client (`mygit`) that communicates with the backend API to initialize repositories, stage files, take commit snapshots, and push code directly to AWS S3.

---

## 🏗️ Project Architecture

The project is structured into two separate applications:

```
┌───────────────────────────────────────────┐
│                 mygit                     │
│            Independent CLI                │
│                                           │
│   mygit init / add / commit / push        │
└─────────────────────┬─────────────────────┘
                      │
                      │ HTTP API (JSON)
                      ▼
┌───────────────────────────────────────────┐
│                 backend                   │
│           Express Server API              │
│                                           │
│  routes / controllers / services / models │
└──────────────┬─────────────────┬──────────┘
               │                 │
               ▼                 ▼
     ┌──────────────────┐  ┌───────────┐
     │ MongoDB Database │  │  AWS S3   │
     └──────────────────┘  └───────────┘
```

- **`mygit` CLI Package**: A lightweight, standalone Node.js client package. Handles local repository tracking inside `.mygit/`, directory staging, commit snapshot metadata, and sends code uploads over HTTP to the backend API.
- **Backend Application**: Express REST API server. Handles user authentication, repository metadata in MongoDB, authorization checks, and object storage management on AWS S3.
- **Frontend Application**: React web dashboard for browsing repositories, viewing commits, and inspecting source files.

---

## 📁 Repository Structure

```text
Simple-GitHub-clone/
│
├── backend/
│   ├── config/          # AWS S3 & server configurations
│   ├── controllers/     # API controllers (repo, user, issue)
│   ├── middlewares/     # Auth & authorization middlewares
│   ├── models/          # MongoDB Mongoose schemas
│   ├── routes/          # Express API route declarations
│   ├── index.js         # Express HTTP server entrypoint
│   └── package.json
│
├── mygit/               # Independent CLI package
│   ├── api/             # HTTP API client layer (repoApi.js)
│   ├── commands/        # CLI command implementations
│   │   ├── init.js
│   │   ├── add.js
│   │   ├── commit.js
│   │   ├── push.js
│   │   ├── pull.js
│   │   └── revert.js
│   ├── utils/           # Terminal UI progress bar & helpers
│   ├── cli.js           # CLI entrypoint executable (yargs)
│   └── package.json     # CLI package configuration & bin definition
│
├── frontend/            # React web application dashboard
│
└── README.md
```

---

## 🚀 Quick Start & Setup

### 1. Start the Backend Server

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start the Express API server (Runs on http://localhost:3000)
npm start
```

### 2. Install `mygit` CLI

To install `mygit` globally on your computer via npm:

```bash
npm install -g @nasir499/mygit
```

Or for local development from source:

```bash
cd mygit
npm install
npm link
```

*Now `mygit` can be invoked from any terminal window on your system.*

---

## 💻 Using `mygit` CLI

Open a terminal inside any local project directory (e.g. `D:\MyProject`) and run:

```bash
# 1. Initialize local repository linked to your Web Repository ID
mygit init <repoId>

# 2. Stage files into .mygit/staging/
mygit add .

# 3. Create a local commit snapshot in .mygit/commits/
mygit commit "Initial commit"

# 4. Push commits to AWS S3 via backend HTTP API
mygit push
```

### Command Reference

| Command | Description |
|---|---|
| `mygit init <repoId>` | Initializes local `.mygit/` tracking linked to backend repo ID `<repoId>`. |
| `mygit add <file\|.>` | Stages individual files or directory trees into `.mygit/staging/`. |
| `mygit commit "<msg>"` | Takes a local snapshot of staged files in `.mygit/commits/<commitId>/`. |
| `mygit push` | Sends un-pushed commit files over HTTP API to the backend server. |
| `mygit pull` | Fetches remote repository files from backend server. |
| `mygit revert <commitId>` | Restores working directory to a specific commit snapshot. |

---

## 🔄 Complete Request Flow (`mygit push`)

```
User types: mygit push
      │
      ▼
mygit CLI (mygit/cli.js)
      │
      ▼
push command handler (mygit/commands/push.js)
      │
      ▼
HTTP API Client (mygit/api/repoApi.js)
      │
      ▼ (POST /repo/:id/push)
Backend Route (backend/routes/repo.route.js)
      │
      ▼
Repo Controller (backend/controllers/repo.controller.js -> pushRepoFiles)
      │
      ▼
MongoDB & AWS S3 Storage (saves commit metadata in DB, uploads files to S3)
```
