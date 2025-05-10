const fabricService = require('../services/fabric-service');
const cacheService = require('../services/cache-service');
const cacheConfig = require('../config/cache-config');

class DrugBatchController {
    async createDrugBatch(req, res) {
        try {
            const { id, name, batchNumber, manufactureDate, expiryDate } = req.body;
            const { userId } = req.user;

            const contract = await fabricService.connect('ManufacturerOrg', userId);
            await contract.submitTransaction(
                'CreateDrugBatch',
                id,
                name,
                batchNumber,
                manufactureDate,
                expiryDate
            );

            // Invalidate batches list cache
            await cacheService.invalidatePattern(cacheConfig.prefixes.batchList);

            fabricService.disconnect();
            res.json({ 
                success: true, 
                message: 'Drug batch created successfully',
                batchId: id
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: `Failed to create drug batch: ${error.message}` 
            });
        }
    }

    async transferDrugBatch(req, res) {
        try {
            const { id, newOwner, newStatus, location, temperature } = req.body;
            const { userId } = req.user;
            const { organization } = req.params;

            const contract = await fabricService.connect(organization, userId);
            await contract.submitTransaction(
                'TransferDrugBatch',
                id,
                newOwner,
                newStatus,
                location,
                temperature.toString()
            );

            // Invalidate related caches
            await Promise.all([
                cacheService.del(`${cacheConfig.prefixes.drugBatch}:${id}`),
                cacheService.invalidatePattern(cacheConfig.prefixes.batchList),
                cacheService.invalidatePattern(`${cacheConfig.prefixes.auditTrail}:${id}`)
            ]);

            fabricService.disconnect();
            res.json({ 
                success: true, 
                message: 'Drug batch transferred successfully' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: `Failed to transfer drug batch: ${error.message}` 
            });
        }
    }

    async getDrugBatch(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.user;
            const { organization } = req.params;

            // Try to get from cache first
            const cacheKey = `${cacheConfig.prefixes.drugBatch}:${id}`;
            const cachedBatch = await cacheService.get(cacheKey);
            
            if (cachedBatch) {
                return res.json({
                    success: true,
                    data: cachedBatch,
                    source: 'cache'
                });
            }

            // If not in cache, get from blockchain
            const contract = await fabricService.connect(organization, userId);
            const batchBuffer = await contract.evaluateTransaction('ReadDrugBatch', id);
            const batch = JSON.parse(batchBuffer.toString());

            // Cache the result
            await cacheService.set(cacheKey, batch, cacheConfig.ttl.drugBatch);

            fabricService.disconnect();
            res.json({ 
                success: true, 
                data: batch,
                source: 'blockchain'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: `Failed to get drug batch: ${error.message}` 
            });
        }
    }

    async getAllDrugBatches(req, res) {
        try {
            const { userId } = req.user;
            const { organization } = req.params;

            // Try to get from cache first
            const cacheKey = `${cacheConfig.prefixes.batchList}:${organization}`;
            const cachedBatches = await cacheService.get(cacheKey);
            
            if (cachedBatches) {
                return res.json({
                    success: true,
                    data: cachedBatches,
                    source: 'cache'
                });
            }

            // If not in cache, get from blockchain
            const contract = await fabricService.connect(organization, userId);
            const batchesBuffer = await contract.evaluateTransaction('GetAllDrugBatches');
            const batches = JSON.parse(batchesBuffer.toString());

            // Cache the result
            await cacheService.set(cacheKey, batches, cacheConfig.ttl.batchList);

            fabricService.disconnect();
            res.json({ 
                success: true, 
                data: batches,
                source: 'blockchain'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: `Failed to get all drug batches: ${error.message}` 
            });
        }
    }
}

module.exports = new DrugBatchController();