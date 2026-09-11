import Issue from '../models/issue.model.js'
import Repository from '../models/repo.model.js'

const createIssue = async (req, res) => {
    const { title, description } = req.body;
    const repoId = req.params.repoId;

    try {
        if (!title) {
            return res.status(400).json({ message: "Issue title is required" });
        }

        const repository = await Repository.findById(repoId);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }

        const issue = new Issue({
            title,
            description,
            repository: repoId,
            author: req.user
        });
        await issue.save();

        await Repository.findByIdAndUpdate(repoId, { $push: { issues: issue._id } });

        res.status(201).json({ issue });
    } catch (error) {
        console.error("Error during creating issue:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateIssue = async (req, res) => {
    const id = req.params.id;
    const { title, description, status } = req.body;

    try {
        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        if (title !== undefined) issue.title = title;
        if (description !== undefined) issue.description = description;
        if (status !== undefined) issue.status = status;

        await issue.save();
        res.json(issue);
    } catch (error) {
        console.error("Error during updating issue:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteIssueById = async (req, res) => {
    const id = req.params.id;
    try {
        const issue = await Issue.findByIdAndDelete(id);
        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }
        await Repository.findByIdAndUpdate(issue.repository, { $pull: { issues: id } });
        res.json({ message: "Issue deleted successfully" });
    } catch (error) {
        console.error("Error during deleting issue:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getAllIssues = async (req, res) => {
    const repoId = req.params.repoId;
    try {
        const repository = await Repository.findById(repoId);
        if (!repository) {
            return res.status(404).json({ message: "Repository not found" });
        }
        const issues = await Issue.find({ repository: repoId }).populate("author");
        res.json(issues);
    } catch (error) {
        console.error("Error during fetching issues:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getIssueById = async (req, res) => {
    const id = req.params.id;
    try {
        const issue = await Issue.findById(id).populate("author");
        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }
        res.json(issue);
    } catch (error) {
        console.error("Error during fetching issue:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    createIssue,
    updateIssue,
    deleteIssueById,
    getAllIssues,
    getIssueById
}