const express = require('express');
const router = express.Router();
const regulatorController = require('../controllers/regulatorController');
const authMiddleware = require('../middleware/auth');

// Middleware to ensure only regulators can access these routes
const regulatorOnly = async (req, res, next) => {
    if (req.user.organization !== 'RegulatorOrg') {
        return res.status(403).json({
            success: false,
            message: 'Access restricted to regulators only'
        });
    }
    next();
};

// Apply authentication and regulator-only middleware
router.use(authMiddleware);
router.use(regulatorOnly);

// Regulator-specific routes
router.post('/search', regulatorController.searchDrugBatches);
router.get('/audit-trail/:id', regulatorController.getAuditTrail);
router.post('/flag-batch', regulatorController.flagSuspiciousBatch);
router.post('/compliance-report', regulatorController.generateComplianceReport);
router.post('/temperature-violations', regulatorController.getTemperatureViolations);

module.exports = router;