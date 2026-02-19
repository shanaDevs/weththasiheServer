const { Role, Permission, RolePermission, sequelize } = require('../../models');

// Get all roles with their permissions
exports.getRoles = async (req, res, next) => {
    try {
        const roles = await Role.findAll({
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }],
            order: [['level', 'DESC']]
        });

        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        next(error);
    }
};

// Get all available permissions
exports.getPermissions = async (req, res, next) => {
    try {
        const permissions = await Permission.findAll({
            order: [['module', 'ASC'], ['name', 'ASC']]
        });

        res.json({
            success: true,
            data: permissions
        });
    } catch (error) {
        next(error);
    }
};

// Update role permissions
exports.updateRolePermissions = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body; // Array of permission IDs

        const role = await Role.findByPk(roleId);
        if (!role) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Remove existing permissions
        await RolePermission.destroy({
            where: { roleId },
            transaction: t
        });

        // Add new permissions
        if (permissionIds && permissionIds.length > 0) {
            const rolePermissions = permissionIds.map(permId => ({
                roleId: role.id,
                permissionId: permId
            }));
            await RolePermission.bulkCreate(rolePermissions, { transaction: t });
        }

        await t.commit();

        res.json({
            success: true,
            message: 'Permissions updated successfully'
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

// Create a new role
exports.createRole = async (req, res, next) => {
    try {
        const { name, displayName, description, level } = req.body;

        const existingRole = await Role.findOne({ where: { name } });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Role already exists'
            });
        }

        const role = await Role.create({
            name,
            displayName,
            description,
            level: level || 0
        });

        res.status(201).json({
            success: true,
            data: role
        });
    } catch (error) {
        next(error);
    }
};
