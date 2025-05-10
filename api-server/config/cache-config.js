module.exports = {
    ttl: {
        drugBatch: 3600,        // 1 hour for individual drug batches
        batchList: 1800,        // 30 minutes for batch lists
        auditTrail: 7200,       // 2 hours for audit trails
        reports: 86400,         // 24 hours for reports
        violations: 3600        // 1 hour for violations
    },
    prefixes: {
        drugBatch: 'batch',
        batchList: 'batches',
        auditTrail: 'audit',
        reports: 'report',
        violations: 'violations'
    }
};