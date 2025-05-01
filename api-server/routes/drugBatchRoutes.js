const express = require('express');
const router = express.Router();
const drugBatchController = require('../controllers/drugBatchController');
const authMiddleware = require('../middleware/auth');

// Authentication middleware for all routes
router.use(authMiddleware);

// Routes for drug batch operations
router.post('/organization/:organization/batch', drugBatchController.createDrugBatch);
router.put('/organization/:organization/batch/transfer', drugBatchController.transferDrugBatch);
router.get('/organization/:organization/batch/:id', drugBatchController.getDrugBatch);
router.get('/organization/:organization/batches', drugBatchController.getAllDrugBatches);

module.exports = router;