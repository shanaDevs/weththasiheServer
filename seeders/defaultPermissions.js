const { Permission, RolePermission, Role } = require('../models');

const permissions = [
    // Products
    { module: 'products', action: 'create', name: 'Create Products', description: 'Create new products' },
    { module: 'products', action: 'read', name: 'View Products', description: 'View product list and details' },
    { module: 'products', action: 'update', name: 'Update Products', description: 'Edit existing products' },
    { module: 'products', action: 'delete', name: 'Delete Products', description: 'Delete products' },

    // Categories
    { module: 'categories', action: 'create', name: 'Create Categories', description: 'Create new categories' },
    { module: 'categories', action: 'read', name: 'View Categories', description: 'View category list' },
    { module: 'categories', action: 'update', name: 'Update Categories', description: 'Edit categories' },
    { module: 'categories', action: 'delete', name: 'Delete Categories', description: 'Delete categories' },

    // Inventory
    { module: 'inventory', action: 'read', name: 'View Inventory', description: 'View stock levels' },
    { module: 'inventory', action: 'update', name: 'Manage Inventory', description: 'Update stock levels' },

    // Orders
    { module: 'orders', action: 'create', name: 'Create Orders', description: 'Create orders' },
    { module: 'orders', action: 'read', name: 'View Orders', description: 'View all orders' },
    { module: 'orders', action: 'update', name: 'Update Orders', description: 'Update order status' },
    { module: 'orders', action: 'delete', name: 'Cancel Orders', description: 'Cancel orders' },

    // Doctors
    { module: 'doctors', action: 'read', name: 'View Doctors', description: 'View doctor profiles' },
    { module: 'doctors', action: 'update', name: 'Manage Doctors', description: 'Verify and manage doctors' },

    // Taxes
    { module: 'taxes', action: 'create', name: 'Create Taxes', description: 'Create tax configurations' },
    { module: 'taxes', action: 'read', name: 'View Taxes', description: 'View tax configurations' },
    { module: 'taxes', action: 'update', name: 'Update Taxes', description: 'Edit tax configurations' },
    { module: 'taxes', action: 'delete', name: 'Delete Taxes', description: 'Delete tax configurations' },

    // Discounts
    { module: 'discounts', action: 'create', name: 'Create Discounts', description: 'Create discount codes' },
    { module: 'discounts', action: 'read', name: 'View Discounts', description: 'View discount codes' },
    { module: 'discounts', action: 'update', name: 'Update Discounts', description: 'Edit discount codes' },
    { module: 'discounts', action: 'delete', name: 'Delete Discounts', description: 'Delete discount codes' },

    // Promotions
    { module: 'promotions', action: 'create', name: 'Create Promotions', description: 'Create promotions' },
    { module: 'promotions', action: 'read', name: 'View Promotions', description: 'View promotions' },
    { module: 'promotions', action: 'update', name: 'Update Promotions', description: 'Edit promotions' },
    { module: 'promotions', action: 'delete', name: 'Delete Promotions', description: 'Delete promotions' },

    // Payments
    { module: 'payments', action: 'create', name: 'Record Payments', description: 'Record payments' },
    { module: 'payments', action: 'read', name: 'View Payments', description: 'View payment history' },
    { module: 'payments', action: 'refund', name: 'Process Refunds', description: 'Process refunds' },

    // Settings
    { module: 'settings', action: 'read', name: 'View Settings', description: 'View system settings' },
    { module: 'settings', action: 'update', name: 'Update Settings', description: 'Update system settings' },
    { module: 'settings', action: 'create', name: 'Create Settings', description: 'Create new settings' },
    { module: 'settings', action: 'delete', name: 'Delete Settings', description: 'Delete settings' },

    // Audit Logs
    { module: 'audit_logs', action: 'read', name: 'View Audit Logs', description: 'View audit logs' },
    { module: 'audit_logs', action: 'export', name: 'Export Audit Logs', description: 'Export audit logs' },

    // Users
    { module: 'users', action: 'create', name: 'Create Users', description: 'Create new users' },
    { module: 'users', action: 'read', name: 'View Users', description: 'View user list' },
    { module: 'users', action: 'update', name: 'Update Users', description: 'Edit users' },
    { module: 'users', action: 'delete', name: 'Delete Users', description: 'Delete users' },

    // Roles
    { module: 'roles', action: 'read', name: 'View Roles', description: 'View roles and permissions' },
    { module: 'roles', action: 'update', name: 'Manage Roles', description: 'Manage role permissions' },
];

// Role permission mapping
const rolePermissions = {
    super_admin: 'all', // Gets all permissions
    admin: [
        'products.*', 'categories.*', 'inventory.*',
        'orders.*', 'doctors.*',
        'taxes.*', 'discounts.*', 'promotions.*',
        'payments.*', 'settings.read', 'settings.update',
        'audit_logs.read', 'audit_logs.export',
        'users.read', 'users.update', 'roles.read'
    ],
    manager: [
        'products.create', 'products.read', 'products.update',
        'categories.read', 'categories.update',
        'inventory.read', 'inventory.update',
        'orders.read', 'orders.update',
        'doctors.read',
        'taxes.read', 'discounts.read', 'promotions.read',
        'payments.read', 'payments.create',
        'audit_logs.read'
    ],
    super_cashier: [
        'products.read',
        'categories.read',
        'inventory.read', 'inventory.update',
        'orders.read', 'orders.update',
        'doctors.read',
        'payments.read', 'payments.create'
    ],
    cashier: [
        'products.read',
        'categories.read',
        'orders.read',
        'payments.read'
    ],
    user: [
        'products.read',
        'categories.read'
    ]
};

async function seedPermissions() {
    console.log('Seeding permissions...');

    try {
        // Create permissions
        for (const perm of permissions) {
            const name = `${perm.module}.${perm.action}`;
            await Permission.findOrCreate({
                where: { module: perm.module, action: perm.action },
                defaults: {
                    ...perm,
                    name: name,
                    displayName: perm.name
                }
            });
        }

        console.log(`Created ${permissions.length} permissions`);

        // Assign permissions to roles
        const roles = await Role.findAll();
        const allPermissions = await Permission.findAll();

        for (const role of roles) {
            const permConfig = rolePermissions[role.name];
            if (!permConfig) continue;

            let permissionIds = [];

            if (permConfig === 'all') {
                permissionIds = allPermissions.map(p => p.id);
            } else {
                for (const permStr of permConfig) {
                    if (permStr.endsWith('.*')) {
                        // All actions for a module
                        const module = permStr.replace('.*', '');
                        const modulePerms = allPermissions.filter(p => p.module === module);
                        permissionIds.push(...modulePerms.map(p => p.id));
                    } else {
                        // Specific module.action
                        const [module, action] = permStr.split('.');
                        const perm = allPermissions.find(p => p.module === module && p.action === action);
                        if (perm) permissionIds.push(perm.id);
                    }
                }
            }

            // Remove duplicates and create role permissions
            permissionIds = [...new Set(permissionIds)];

            for (const permissionId of permissionIds) {
                await RolePermission.findOrCreate({
                    where: { roleId: role.id, permissionId },
                    defaults: { roleId: role.id, permissionId }
                });
            }

            console.log(`Assigned ${permissionIds.length} permissions to ${role.name}`);
        }

        console.log('Permissions seeded successfully');
    } catch (error) {
        console.error('Error seeding permissions:', error);
        throw error;
    }
}

module.exports = seedPermissions;
