const { seedDefaultRoles: seedRoles } = require('./defaultRoles');
const { seedDefaultSuperAdmin: seedUser } = require('./defaultUser');
const seedPermissions = require('./defaultPermissions');
const seedSettings = require('./defaultSettings');
const seedNotificationTemplates = require('./defaultNotificationTemplates');
const seedTaxes = require('./defaultTaxes');
const seedProducts = require('./sampleProducts');

async function runAllSeeders() {
    console.log('Starting database seeding...\n');

    try {
        // Order matters - roles first, then permissions, then user
        if (typeof seedRoles === 'function') {
            await seedRoles();
        } else {
            console.error('seedRoles is not a function:', seedRoles);
        }
        console.log('');

        await seedPermissions();
        console.log('');

        if (typeof seedUser === 'function') {
            await seedUser();
        } else {
            console.error('seedUser is not a function:', seedUser);
        }
        console.log('');

        await seedSettings();
        console.log('');

        await seedNotificationTemplates();
        console.log('');

        await seedTaxes();
        console.log('');

        await seedProducts();
        console.log('');

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Database seeding failed:', error);
        throw error;
    }
}

module.exports = {
    runAllSeeders,
    seedRoles,
    seedUser,
    seedPermissions,
    seedSettings,
    seedNotificationTemplates,
    seedTaxes
};

// Run if called directly
if (require.main === module) {
    runAllSeeders()
        .then(() => {
            console.log('\nSeeding complete. Exiting...');
            process.exit(0);
        })
        .catch(err => {
            console.error('\nSeeding failed:', err);
            process.exit(1);
        });
}
