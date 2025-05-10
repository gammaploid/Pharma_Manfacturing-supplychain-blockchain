const fabricService = require('../services/fabric-service');
const cacheService = require('../services/cache-service');
const cacheConfig = require('../config/cache-config');

class RegulatorController {
    async searchDrugBatches(req, res) {
        try {
            const { userId } = req.user;
            const { searchCriteria } = req.body;
            
            // Generate cache key based on search criteria
            const cacheKey = `${cacheConfig.prefixes.batchList}:search:${JSON.stringify(searchCriteria)}`;
            const cachedResults = await cacheService.get(cacheKey);
            
            if (cachedResults) {
                return res.json({
                    success: true,
                    data: cachedResults,
                    source: 'cache'
                });
            }

            const contract = await fabricService.connect('RegulatorOrg', userId);
            const queryString = this._buildQueryString(searchCriteria);
            const result = await contract.evaluateTransaction('QueryDrugBatches', queryString);
            const batches = JSON.parse(result.toString());
            
            // Cache search results
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
                message: `Failed to search drug batches: ${error.message}`
            });
        }
    }

    async getAuditTrail(req, res) {
        try {
            const { userId } = req.user;
            const { id } = req.params;
            
            // Try to get from cache first
            const cacheKey = `${cacheConfig.prefixes.auditTrail}:${id}`;
            const cachedTrail = await cacheService.get(cacheKey);
            
            if (cachedTrail) {
                return res.json({
                    success: true,
                    data: cachedTrail,
                    source: 'cache'
                });
            }

            const contract = await fabricService.connect('RegulatorOrg', userId);
            const result = await contract.evaluateTransaction('GetDrugBatchHistory', id);
            const trail = JSON.parse(result.toString());
            
            // Cache audit trail
            await cacheService.set(cacheKey, trail, cacheConfig.ttl.auditTrail);
            
            fabricService.disconnect();
            res.json({
                success: true,
                data: trail,
                source: 'blockchain'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to get audit trail: ${error.message}`
            });
        }
    }

    async flagSuspiciousBatch(req, res) {
        try {
            const { userId } = req.user;
            const { id, reason, severity } = req.body;
            
            const contract = await fabricService.connect('RegulatorOrg', userId);
            await contract.submitTransaction('FlagDrugBatch', id, reason, severity);
            
            // Invalidate related caches
            await Promise.all([
                cacheService.del(`${cacheConfig.prefixes.drugBatch}:${id}`),
                cacheService.invalidatePattern(cacheConfig.prefixes.batchList),
                cacheService.invalidatePattern(`${cacheConfig.prefixes.auditTrail}:${id}`)
            ]);
            
            fabricService.disconnect();
            res.json({
                success: true,
                message: 'Drug batch flagged successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to flag drug batch: ${error.message}`
            });
        }
    }

    async generateComplianceReport(req, res) {
        try {
            const { userId } = req.user;
            const { startDate, endDate, organizationId } = req.body;
            
            // Generate cache key based on report parameters
            const cacheKey = `${cacheConfig.prefixes.reports}:${organizationId}:${startDate}:${endDate}`;
            const cachedReport = await cacheService.get(cacheKey);
            
            if (cachedReport) {
                return res.json({
                    success: true,
                    data: cachedReport,
                    source: 'cache'
                });
            }

            const contract = await fabricService.connect('RegulatorOrg', userId);
            const result = await contract.evaluateTransaction(
                'GenerateComplianceReport',
                startDate,
                endDate,
                organizationId
            );
            const report = JSON.parse(result.toString());
            
            // Cache compliance report
            await cacheService.set(cacheKey, report, cacheConfig.ttl.reports);
            
            fabricService.disconnect();
            res.json({
                success: true,
                data: report,
                source: 'blockchain'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to generate compliance report: ${error.message}`
            });
        }
    }

    async getTemperatureViolations(req, res) {
        try {
            const { userId } = req.user;
            const { startDate, endDate } = req.body;
            
            // Generate cache key based on date range
            const cacheKey = `${cacheConfig.prefixes.violations}:${startDate}:${endDate}`;
            const cachedViolations = await cacheService.get(cacheKey);
            
            if (cachedViolations) {
                return res.json({
                    success: true,
                    data: cachedViolations,
                    source: 'cache'
                });
            }

            const contract = await fabricService.connect('RegulatorOrg', userId);
            const result = await contract.evaluateTransaction(
                'GetTemperatureViolations',
                startDate,
                endDate
            );
            const violations = JSON.parse(result.toString());
            
            // Cache temperature violations
            await cacheService.set(cacheKey, violations, cacheConfig.ttl.violations);
            
            fabricService.disconnect();
            res.json({
                success: true,
                data: violations,
                source: 'blockchain'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to get temperature violations: ${error.message}`
            });
        }
    }

    _buildQueryString(criteria) {
        const conditions = [];
        
        if (criteria.manufacturer) {
            conditions.push(`manufacturer = '${criteria.manufacturer}'`);
        }
        if (criteria.status) {
            conditions.push(`status = '${criteria.status}'`);
        }
        if (criteria.dateRange) {
            conditions.push(`manufactureDate >= '${criteria.dateRange.start}'`);
            conditions.push(`manufactureDate <= '${criteria.dateRange.end}'`);
        }
        if (criteria.batchNumber) {
            conditions.push(`batchNumber = '${criteria.batchNumber}'`);
        }

        return conditions.length > 0 
            ? `{"selector": {${conditions.join(', ')}}}`
            : `{"selector": {}}`;
    }
}

module.exports = new RegulatorController();