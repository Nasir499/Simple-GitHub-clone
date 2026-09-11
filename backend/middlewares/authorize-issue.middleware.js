import Issue from '../models/issue.model.js';
import Repository from '../models/repo.model.js';

const authorizeIssueAuthor = (paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const issueId = req.params[paramName];
            const userId = req.user;

            if (!userId) {
                return res.status(401).json({ message: 'Authentication required.' });
            }

            const issue = await Issue.findById(issueId);
            if (!issue) {
                return res.status(404).json({ message: 'Issue not found.' });
            }

            const repository = await Repository.findById(issue.repository);

            const repoOwnerId = repository?.owner?._id ? repository.owner._id.toString() : repository?.owner ? repository.owner.toString() : null;
            const isAuthor = issue.author && issue.author.toString() === userId.toString();
            const isRepoOwner = repoOwnerId && repoOwnerId === userId.toString();

            if (!isAuthor && !isRepoOwner) {
                return res.status(403).json({ message: 'Access denied. You are not authorized to modify this issue.' });
            }

            next();
        } catch (error) {
            console.error('Issue authorization error:', error);
            return res.status(500).json({ message: 'Server error during authorization.' });
        }
    };
};

export default authorizeIssueAuthor;
