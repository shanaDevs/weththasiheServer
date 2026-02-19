const { Agency, AuditLog } = require('../../models');

const agencyController = {
    // Create Agency
    createAgency: async (req, res) => {
        try {
            const agency = await Agency.create({
                ...req.body,
                createdBy: req.user.id
            });

            await AuditLog.create({
                userId: req.user.id,
                action: 'create',
                module: 'agencies',
                entityType: 'Agency',
                entityId: agency.id,
                description: `Created agency: ${agency.name}`,
                newValues: agency.toJSON(),
                ipAddress: req.ip
            });

            res.status(201).json({ success: true, data: agency });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Get all Agencies
    getAgencies: async (req, res) => {
        try {
            const agencies = await Agency.findAll({
                where: { isActive: true },
                order: [['name', 'ASC']]
            });
            res.json({ success: true, data: agencies });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get Agency by ID
    getAgencyById: async (req, res) => {
        try {
            const agency = await Agency.findByPk(req.params.id);
            if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });
            res.json({ success: true, data: agency });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update Agency
    updateAgency: async (req, res) => {
        try {
            const agency = await Agency.findByPk(req.params.id);
            if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

            const oldValues = agency.toJSON();
            await agency.update({
                ...req.body,
                updatedBy: req.user.id
            });

            await AuditLog.create({
                userId: req.user.id,
                action: 'update',
                module: 'agencies',
                entityType: 'Agency',
                entityId: agency.id,
                description: `Updated agency: ${agency.name}`,
                oldValues,
                newValues: agency.toJSON(),
                ipAddress: req.ip
            });

            res.json({ success: true, data: agency });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Delete (Soft) Agency
    deleteAgency: async (req, res) => {
        try {
            const agency = await Agency.findByPk(req.params.id);
            if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

            await agency.update({ isActive: false, updatedBy: req.user.id });

            await AuditLog.create({
                userId: req.user.id,
                action: 'delete',
                module: 'agencies',
                entityType: 'Agency',
                entityId: agency.id,
                description: `Soft deleted agency: ${agency.name}`,
                ipAddress: req.ip
            });

            res.json({ success: true, message: 'Agency deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = agencyController;
