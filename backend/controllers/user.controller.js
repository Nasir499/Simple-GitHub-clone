import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import User from '../models/user.model.js'
import Repository from '../models/repo.model.js'
import Issue from '../models/issue.model.js'

dotenv.config()

const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await User.find({}).skip(skip).limit(limit);
        res.json(users);
    } catch (error) {
        console.error("Error during fetching:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const signUp = async (req, res) => {
    const { username, password, email } = req.body;

    try {
        if (!username || !password || !email) {
            return res.status(400).json({ message: "Username, email, and password are required" });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = new User({ username, password, email });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: "365d" });

        res.status(201).json({ token, userId: newUser._id });
    } catch (error) {
        console.error("Error during signUp:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserProfile = async (req, res) => {
    const currentId = req.params.id;

    try {
        let currentObjId;
        try {
            currentObjId = new mongoose.Types.ObjectId(currentId);
        } catch {
            currentObjId = currentId;
        }

        const user = await User.findById(currentId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch followed users (following) explicitly by IDs
        const followingIds = (user.followedUsers || []).map(id => (id._id ? id._id.toString() : id.toString()));
        const followingUsers = await User.find({
            _id: { $in: followingIds }
        }).select("_id username email");

        // Fetch followers explicitly
        const followers = await User.find({
            $or: [
                { followedUsers: currentId },
                { followedUsers: currentObjId }
            ]
        }).select("_id username email");

        const userObj = user.toObject();
        userObj.followedUsers = followingUsers;
        userObj.followers = followers;

        res.json(userObj);
    } catch (error) {
        console.error("Error during fetching:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateUserProfile = async (req, res) => {
    const currentId = req.params.id;
    const { email, password } = req.body;

    try {
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: currentId } });
            if (existingUser) {
                return res.status(400).json({ message: "Email is already in use by another account" });
            }
        }

        const updateFields = {};
        if (email) updateFields.email = email;
        if (password) updateFields.password = password;

        if (password) {
            const user = await User.findById(currentId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (email) user.email = email;
            user.password = password;
            await user.save();
            return res.json(user);
        }

        const user = await User.findByIdAndUpdate(
            currentId,
            { $set: updateFields },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("Error during updating:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteUserProfile = async (req, res) => {
    const currentId = req.params.id;

    try {
        const result = await User.findByIdAndDelete(currentId);
        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        const userRepos = await Repository.find({ owner: currentId });
        const repoIds = userRepos.map(repo => repo._id);
        await Issue.deleteMany({ repository: { $in: repoIds } });
        await Repository.deleteMany({ owner: currentId });
        await Issue.deleteMany({ author: currentId });
        await User.updateMany(
            {},
            {
                $pull: {
                    followedUsers: currentId,
                    starRepos: { $in: repoIds }
                }
            }
        );

        res.json({ message: "User deleted" });
    } catch (error) {
        console.error("Error during deleting:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const login = async (req, res) => {
    const { username, email, password } = req.body;
    const identifier = username || email;

    try {
        if (!identifier || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "365d" });

        res.json({ token, userId: user._id });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Fetch real user contribution activity map
const getUserActivity = async (req, res) => {
    const userId = req.params.userId;
    try {
        const [repos, issues] = await Promise.all([
            Repository.find({ owner: userId }),
            Issue.find({ author: userId })
        ]);

        const activityMap = {};

        repos.forEach(repo => {
            if (repo.createdAt) {
                const dateStr = new Date(repo.createdAt).toISOString().split('T')[0];
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
        });

        issues.forEach(issue => {
            if (issue.createdAt) {
                const dateStr = new Date(issue.createdAt).toISOString().split('T')[0];
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
        });

        res.json({ activityMap });
    } catch (error) {
        console.error("Error fetching user activity:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const toggleFollowUser = async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user;

    if (targetUserId === currentUserId.toString()) {
        return res.status(400).json({ message: "You cannot follow yourself" });
    }

    try {
        let targetObjId;
        try {
            targetObjId = new mongoose.Types.ObjectId(targetUserId);
        } catch {
            targetObjId = targetUserId;
        }

        const currentUserDoc = await User.findById(currentUserId);
        const targetUserDoc = await User.findById(targetUserId);

        if (!currentUserDoc || !targetUserDoc) {
            return res.status(404).json({ message: "User not found" });
        }

        const isFollowing = currentUserDoc.followedUsers.some(
            (id) => (id._id ? id._id.toString() : id.toString()) === targetUserId.toString()
        );

        if (isFollowing) {
            currentUserDoc.followedUsers = currentUserDoc.followedUsers.filter(
                (id) => (id._id ? id._id.toString() : id.toString()) !== targetUserId.toString()
            );
        } else {
            currentUserDoc.followedUsers.push(targetObjId);
        }

        await currentUserDoc.save();

        res.json({
            message: isFollowing ? "Unfollowed user" : "Followed user",
            isFollowing: !isFollowing,
            followingCount: currentUserDoc.followedUsers.length
        });
    } catch (error) {
        console.error("Error toggling follow user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    getAllUsers,
    signUp,
    updateUserProfile,
    getUserProfile,
    deleteUserProfile,
    login,
    getUserActivity,
    toggleFollowUser
}
