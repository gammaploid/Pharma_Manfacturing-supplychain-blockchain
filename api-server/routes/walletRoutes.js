const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');
const { validateRegistration, validateOrganization } = require('../middleware/walletValidation');

// Admin-only middleware
const adminOnly = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access restricted to admin users only'
        });
    }
    next();
};

// Public routes for initial setup with validation
router.post('/admin/:organization/enroll', validateOrganization, walletController.enrollAdmin);
router.post('/user/:organization/register', [validateOrganization, validateRegistration], walletController.registerUser);

// Protected routes
router.use(authMiddleware);

// Admin-only routes
router.get('/users', adminOnly, walletController.getAllUsers);
router.delete('/user/:userId', adminOnly, walletController.removeUser);

// User-specific routes
router.get('/user/:userId', walletController.getUserIdentity);

module.exports = router;