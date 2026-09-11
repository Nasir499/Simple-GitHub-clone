import Repository from '../models/repo.model.js';

// Checks that the authenticated user owns the repository being modified
const authorizeOwner = (paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            const userId = req.user;

            if (!userId) {
                return res.status(401).json({ message: 'Authentication required.' });
            }

            const repository = await Repository.findById(resourceId);
            if (!repository) {
                return res.status(404).json({ message: 'Repository not found.' });
            }

            const ownerId = repository.owner?._id ? repository.owner._id.toString() : repository.owner ? repository.owner.toString() : null;
            if (!ownerId || ownerId !== userId.toString()) {
                return res.status(403).json({ message: 'Access denied. You do not own this resource.' });
            }

            next();
        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(500).json({ message: 'Server error during authorization.' });
        }
    };
};

export default authorizeOwner;
