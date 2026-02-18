const { Role } = require('../models');

const seedDefaultRoles = async () => {
    try {
        // Check if roles already exist
        const existingRoles = await Role.count();

        if (existingRoles > 0) {
            console.log('ℹ️  Roles already exist. Skipping seed.');
            return;
        }

        // Create default roles
        const roles = [
            {
                name: 'super_admin',
                displayName: 'Super Administrator',
                description: 'Full system access with all permissions',
                level: 100,
                isActive: true
            },
            {
                name: 'admin',
                displayName: 'Administrator',
                description: 'Administrative access to manage company operations',
                level: 80,
                isActive: true
            },
            {
                name: 'manager',
                displayName: 'Manager',
                description: 'Manage daily operations, inventory, and staff',
                level: 60,
                isActive: true
            },
            {
                name: 'super_cashier',
                displayName: 'Super Cashier',
                description: 'Advanced cashier with additional permissions',
                level: 40,
                isActive: true
            },
            {
                name: 'cashier',
                displayName: 'Cashier',
                description: 'Process sales and handle transactions',
                level: 20,
                isActive: true
            },
            {
                name: 'user',
                displayName: 'User',
                description: 'Basic user with limited access',
                level: 10,
                isActive: true
            }
        ];

        await Role.bulkCreate(roles);

        console.log('✅ Default roles created successfully!');
        console.log('   - Super Administrator (level 100)');
        console.log('   - Administrator (level 80)');
        console.log('   - Manager (level 60)');
        console.log('   - Super Cashier (level 40)');
        console.log('   - Cashier (level 20)');
        console.log('   - User (level 10)');
        
    } catch (error) {
        console.error('❌ Error creating default roles:', error.message);
        throw error;
    }
};

module.exports = { seedDefaultRoles };
