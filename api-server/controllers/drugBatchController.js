const fabricService = require('../services/fabric-service');

class DrugBatchController {
    async createDrugBatch(req, res) {
        try {
            const { id, name, batchNumber, manufactureDate, expiryDate } = req.body;
            const { userId } = req.user; // From auth middleware

            const contract = await fabricService.connect('ManufacturerOrg', userId);

            await contract.submitTransaction(
                'CreateDrugBatch',
                id,
                name,
                batchNumber,
                manufactureDate,
                expiryDate
            );

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

            const contract = await fabricService.connect(organization, userId);

            const batchBuffer = await contract.evaluateTransaction('ReadDrugBatch', id);
            const batch = JSON.parse(batchBuffer.toString());

            fabricService.disconnect();
            res.json({ 
                success: true, 
                data: batch 
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

            const contract = await fabricService.connect(organization, userId);

            const batchesBuffer = await contract.evaluateTransaction('GetAllDrugBatches');
            const batches = JSON.parse(batchesBuffer.toString());

            fabricService.disconnect();
            res.json({ 
                success: true, 
                data: batches 
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