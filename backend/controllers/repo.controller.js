import Repository from '../models/repo.model.js'
import User from '../models/user.model.js'
import Issue from '../models/issue.model.js'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { s3, S3_BUCKET, ListObjectsV2Command, GetObjectCommand, DeleteObjectsCommand, PutObjectCommand } from '../config/aws-config.js'

dotenv.config()

const createRepository = async (req, res) => {
    const { name, description, visibility } = req.body;
    const owner = req.user; // from auth middleware

    try {
        if (!name) {
            return res.status(400).json({ message: "Repository name is required" });
        }

        const newRepository = new Repository({
            name,
            description,
            owner,
            visibility: visibility !== undefined ? visibility : true
        });
        const result = await newRepository.save();

        await User.findByIdAndUpdate(owner, { $push: { repositories: result._id } });

        res.status(201).json({
            message: "Repository created",
            repository: result
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "You already have a repository with this name" });
        }
        console.error("Error during creating repo:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateRepository = async (req, res) => {
    const id = req.params.id;
    const { content, description } = req.body;

    try {
        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        if (req.user) {
            const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner ? repository.owner.toString() : null;
            if (!ownerId || ownerId !== req.user.toString()) {
                return res.status(403).json({ message: "Access denied. You do not own this repository." });
            }
        }

        if (content) repository.content.push(content);
        if (description !== undefined) repository.description = description;

        const updatedRepo = await repository.save();

        res.json({
            message: "Repository updated successfully",
            repository: updatedRepo
        });
    } catch (error) {
        console.error("Error during updating repo:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteRepository = async (req, res) => {
    const id = req.params.id;

    try {
        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        if (req.user) {
            const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner ? repository.owner.toString() : null;
            if (!ownerId || ownerId !== req.user.toString()) {
                return res.status(403).json({ message: "Access denied. You do not own this repository." });
            }
        }

        await Issue.deleteMany({ repository: id });
        await User.findByIdAndUpdate(repository.owner, { $pull: { repositories: id } });
        await User.updateMany({}, { $pull: { starRepos: id } });
        await Repository.findByIdAndDelete(id);

        // Clean up S3 objects for this repository
        try {
            const listData = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: `repos/${id}/` }));
            if (listData.Contents && listData.Contents.length > 0) {
                const objectsToDelete = listData.Contents.map(obj => ({ Key: obj.Key }));
                await s3.send(new DeleteObjectsCommand({
                    Bucket: S3_BUCKET,
                    Delete: { Objects: objectsToDelete }
                }));
            }
        } catch (s3Err) {
            console.error("S3 cleanup warning on repo delete:", s3Err);
        }

        res.json({ message: "Repository deleted successfully" });
    } catch (error) {
        console.error("Error during deleting repo:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getAllRepositories = async (req, res) => {
    try {
        const repositories = await Repository.find({ visibility: true }).populate("owner").populate("issues");
        res.json(repositories);
    } catch (error) {
        console.error("Error during fetching all repos:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const fetchRepositoryById = async (req, res) => {
    const repoId = req.params.id;
    try {
        const repository = await Repository.findById(repoId).populate("owner").populate("issues");
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }
        
        if (!repository.visibility) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(404).json({ message: "Repository not found" });
            }
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner?.toString();
                if (!ownerId || ownerId !== decoded.id) {
                    return res.status(404).json({ message: "Repository not found" });
                }
            } catch (err) {
                return res.status(404).json({ message: "Repository not found" });
            }
        }

        res.json(repository);
    } catch (error) {
        console.error("Error during fetching repo:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const fetchRepositoryByName = async (req, res) => {
    const repoName = req.params.name;
    try {
        const repository = await Repository.findOne({ name: repoName }).populate("owner").populate("issues");
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        if (!repository.visibility) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(404).json({ message: "Repository not found" });
            }
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner?.toString();
                if (!ownerId || ownerId !== decoded.id) {
                    return res.status(404).json({ message: "Repository not found" });
                }
            } catch (err) {
                return res.status(404).json({ message: "Repository not found" });
            }
        }

        res.json(repository);
    } catch (error) {
        console.error("Error during fetching repo by name:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const fetchRepositoryForCurrentUser = async (req, res) => {
    const userId = req.params.userId;
    try {
        const query = { owner: userId };

        const authHeader = req.headers.authorization;
        let isOwner = false;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                if (decoded.id === userId) {
                    isOwner = true;
                }
            } catch (err) {}
        }

        if (!isOwner) {
            query.visibility = true;
        }

        const repositories = await Repository.find(query);

        res.json({
            message: "Repositories found",
            repositories
        });
    } catch (error) {
        console.error("Error during fetching repo by user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const toggleVisibilityById = async (req, res) => {
    const id = req.params.id;

    try {
        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        repository.visibility = !repository.visibility;
        const updatedRepo = await repository.save();

        res.json({
            message: "Repository visibility toggled successfully",
            repository: updatedRepo
        });
    } catch (error) {
        console.error("Error during toggling repo visibility:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Fetch pushed files from S3 scoped STRICTLY per repository ID
const fetchRepositoryS3Files = async (req, res) => {
    const repoId = req.params.id;
    try {
        const repository = await Repository.findById(repoId);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        if (!repository.visibility) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(404).json({ message: "Repository not found" });
            }
            try {
                const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner?.toString();
                if (!ownerId || ownerId !== decoded.id) {
                    return res.status(404).json({ message: "Repository not found" });
                }
            } catch (err) {
                return res.status(404).json({ message: "Repository not found" });
            }
        }

        const prefix = `repos/${repoId}/`;
        const command = new ListObjectsV2Command({
            Bucket: S3_BUCKET,
            Prefix: prefix
        });
        const data = await s3.send(command);

        if (!data.Contents || data.Contents.length === 0) {
            return res.json({ files: [] });
        }

        const files = data.Contents
            .filter(item => !item.Key.endsWith('commit.json') && !item.Key.endsWith('/'))
            .map(item => {
                const parts = item.Key.split('/');
                const commitId = parts.length > 3 ? parts[3] : '';
                const relativePath = parts.length > 4 ? parts.slice(4).join('/') : parts[parts.length - 1];
                return {
                    key: item.Key,
                    name: relativePath,
                    commitId,
                    size: item.Size,
                    lastModified: item.LastModified
                };
            });

        res.json({ files });
    } catch (error) {
        console.error("Error fetching S3 files:", error);
        res.status(500).json({ message: "Failed to fetch S3 files", error: error.message });
    }
};

// Fetch single file content from S3 with path and repository authorization check
const fetchS3FileContent = async (req, res) => {
    const key = req.query.key;
    const reqRepoId = req.query.repoId;
    if (!key) {
        return res.status(400).json({ message: "Key parameter is required" });
    }

    let repoId = reqRepoId;
    const parts = key.split('/');
    if (parts[0] === 'repos' && parts[1]) {
        repoId = parts[1];
    }

    try {
        if (repoId) {
            const repository = await Repository.findById(repoId);
            if (repository && !repository.visibility) {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(403).json({ message: "Access denied" });
                }
                try {
                    const token = authHeader.split(' ')[1];
                    const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner?.toString();
                    if (!ownerId || ownerId !== decoded.id) {
                        return res.status(403).json({ message: "Access denied" });
                    }
                } catch (err) {
                    return res.status(403).json({ message: "Access denied" });
                }
            }
        }

        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: key
        });
        const response = await s3.send(command);
        const streamToText = async (stream) => {
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks).toString('utf-8');
        };
        const content = await streamToText(response.Body);

        res.json({ key, content });
    } catch (error) {
        console.error("Error fetching S3 file content:", error);
        res.status(500).json({ message: "Failed to fetch file content", error: error.message });
    }
};

// Push repo files endpoint — handles receiving code files over HTTP and uploading to S3 on behalf of user
const pushRepoFiles = async (req, res) => {
    const repoId = req.params.id;
    const { commitMessage, files, commitId: providedCommitId } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: "No files provided for push" });
    }

    try {
        const repository = await Repository.findById(repoId);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        // Defense-in-depth owner check: ensure authenticated user owns this repository
        if (req.user) {
            const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner ? repository.owner.toString() : null;
            if (!ownerId || ownerId !== req.user.toString()) {
                return res.status(403).json({ message: "Access denied. You do not own this repository." });
            }
        }

        const commitId = providedCommitId || uuidv4();

        // Save commit.json metadata to S3
        const metaKey = `repos/${repoId}/commits/${commitId}/commit.json`;
        const metaContent = JSON.stringify({
            id: commitId,
            message: commitMessage || "Uploaded via API",
            date: new Date().toISOString(),
            author: repository.owner
        }, null, 2);

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: metaKey,
            Body: metaContent
        }));

        // Upload files to S3 in parallel chunks for fast push performance
        const CONCURRENCY = 15;
        const newPaths = new Set();

        for (let i = 0; i < files.length; i += CONCURRENCY) {
            const batch = files.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (fileItem) => {
                const { path: relativePath, content } = fileItem;
                if (!relativePath) return;

                const cleanPath = relativePath.replace(/\\/g, '/');
                if (cleanPath === 'commit.json' || cleanPath.endsWith('/commit.json')) return;
                const s3Key = `repos/${repoId}/commits/${commitId}/${cleanPath}`;
                await s3.send(new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: s3Key,
                    Body: Buffer.from(content || '', 'utf-8')
                }));

                newPaths.add(cleanPath);
            }));
        }

        newPaths.forEach(cleanPath => {
            if (!repository.content.includes(cleanPath)) {
                repository.content.push(cleanPath);
            }
        });

        await repository.save();

        res.json({
            message: `Successfully pushed ${files.length} file(s) to S3!`,
            commitId,
            filesCount: files.length
        });
    } catch (error) {
        console.error("Error during pushRepoFiles:", error);
        res.status(500).json({ message: "Failed to push files to S3", error: error.message });
    }
};

export {
    createRepository,
    updateRepository,
    deleteRepository,
    getAllRepositories,
    fetchRepositoryById,
    fetchRepositoryByName,
    fetchRepositoryForCurrentUser,
    toggleVisibilityById,
    fetchRepositoryS3Files,
    fetchS3FileContent,
    pushRepoFiles
}
