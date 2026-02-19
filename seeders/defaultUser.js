const bcrypt = require('bcryptjs');

const { User, Role } = require('../models');

const seedDefaultSuperAdmin = async () => {
    try {
        // Get super_admin role
        const superAdminRole = await Role.findOne({
            where: { name: 'super_admin' }
        });

        if (!superAdminRole) {
            console.log('❌ Super Admin role not found. Please seed roles first.');
            return;
        }

        // Check if super_admin user already exists
        const existingSuperAdmin = await User.findOne({
            where: { roleId: superAdminRole.id }
        });

        if (existingSuperAdmin) {
            console.log('ℹ️  Super Admin user already exists. Skipping seed.');
            return;
        }

        // Create default super_admin user
        const hashedPassword = await bcrypt.hash('123456', 10);

        const superAdmin = await User.create({
            firstName: 'Super',
            lastName: 'Admin',
            userName: 'Super Admin',
            phone: '0743242403',
            password: hashedPassword,
            roleId: superAdminRole.id,
            isDisabled: false,
            isDeleted: false
        });

        console.log('✅ Default Super Admin user created successfully!');
        console.log('📱 Phone: 0743242403');
        console.log('🔑 Password: 123456');
        console.log('⚠️  Please change the default password after first login!');

        return superAdmin;
    } catch (error) {
        console.error('❌ Error creating default Super Admin:', error.message);
        throw error;
    }
};

module.exports = { seedDefaultSuperAdmin };