const { Product, sequelize } = require('../models');

/**
 * Fix products by setting them to active status
 */
async function fixProductStatus() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Find all products that are not deleted but not active
        const products = await Product.findAll({
            where: {
                isDeleted: false,
                isActive: false
            }
        });

        console.log(`Found ${products.length} inactive products`);

        if (products.length === 0) {
            console.log('No products to fix');
            return;
        }

        // Update all products to active
        const updateResult = await Product.update(
            {
                isActive: true,
                status: 'active'
            },
            {
                where: {
                    isDeleted: false,
                    isActive: false
                }
            }
        );

        console.log(`✅ Successfully activated ${updateResult[0]} products`);

        // Display updated products
        const updatedProducts = await Product.findAll({
            where: {
                isDeleted: false,
                isActive: true
            },
            attributes: ['id', 'name', 'sku', 'status', 'isActive', 'stockQuantity']
        });

        console.log('\nUpdated products:');
        updatedProducts.forEach(product => {
            console.log(`  - ID: ${product.id}, Name: ${product.name}, SKU: ${product.sku}, Status: ${product.status}, Active: ${product.isActive}, Stock: ${product.stockQuantity}`);
        });

    } catch (error) {
        console.error('❌ Error fixing products:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    fixProductStatus()
        .then(() => {
            console.log('\n✅ Product status fix completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Product status fix failed:', error);
            process.exit(1);
        });
}

module.exports = fixProductStatus;
