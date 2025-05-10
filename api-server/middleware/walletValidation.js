const Joi = require('joi');

const validateRegistration = (req, res, next) => {
    const schema = Joi.object({
        userId: Joi.string()
            .min(3)
            .max(30)
            .required()
            .pattern(/^[a-zA-Z0-9_-]+$/),
        role: Joi.string()
            .valid('admin', 'manufacturer', 'distributor', 'pharmacy', 'regulator')
            .required(),
        attributes: Joi.object().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateOrganization = (req, res, next) => {
    const validOrgs = ['ManufacturerOrg', 'DistributorOrg', 'PharmacyOrg', 'RegulatorOrg'];
    const { organization } = req.params;

    if (!validOrgs.includes(organization)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid organization specified'
        });
    }
    next();
};

module.exports = {
    validateRegistration,
    validateOrganization
};