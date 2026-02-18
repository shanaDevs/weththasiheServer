const { Product, Category, Tax, sequelize } = require('../models');

/**
 * Seed sample products for development
 */
async function seedProducts() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if sample products already exist by checking one key SKU
        const existingProduct = await Product.findOne({ where: { sku: 'ANT001' } });
        if (existingProduct) {
            console.log('ℹ️  Sample products already exist. Skipping seed.');
            return;
        }

        // Get or create a default tax
        let tax = await Tax.findOne();
        if (!tax) {
            tax = await Tax.create({
                name: 'Standard pharma Tax',
                percentage: 12,
                type: 'percentage',
                isActive: true
            });
        }

        // Define Categories
        const categoriesData = [
            { name: 'Antibiotics', slug: 'antibiotics', description: 'Medicines that fight bacterial infections', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400' },
            { name: 'Pain Relief', slug: 'pain-relief', description: 'Relieve aches, pains, and fever', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=400' },
            { name: 'Vitamins & Supplements', slug: 'vitamins', description: 'Supports overall health and wellness', image: 'https://images.unsplash.com/photo-1471864190281-ad5fe9afef77?q=80&w=400' },
            { name: 'First Aid', slug: 'first-aid', description: 'Essential supplies for emergency care', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=400' },
            { name: 'Skin Care', slug: 'skin-care', description: 'Dermatological and skin health products', image: 'https://images.unsplash.com/photo-1556228578-8c7c0f44bb0b?q=80&w=400' }
        ];

        const createdCategories = {};
        for (const cat of categoriesData) {
            let category = await Category.findOne({ where: { slug: cat.slug } });
            if (!category) {
                category = await Category.create(cat);
            }
            createdCategories[cat.slug] = category;
        }

        // Sample products data
        const sampleProducts = [
            {
                name: 'Amoxicillin 500mg',
                slug: 'amoxicillin-500mg-' + Date.now(),
                sku: 'ANT001',
                barcode: '8901234567001',
                description: 'Broad-spectrum antibiotic used to treat various bacterial infections like pneumonia and bronchitis.',
                shortDescription: 'Broad-spectrum antibiotic capsule',
                genericName: 'Amoxicillin',
                manufacturer: 'GlaxoSmithKline',
                dosageForm: 'Capsule',
                strength: '500mg',
                packSize: '10 capsules',
                requiresPrescription: true,
                categoryId: createdCategories['antibiotics'].id,
                costPrice: 120,
                sellingPrice: 180,
                mrp: 210,
                minOrderQuantity: 1,
                taxEnabled: true,
                taxPercentage: 12,
                taxId: tax.id,
                stockQuantity: 50,
                lowStockThreshold: 10,
                trackInventory: true,
                images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800'],
                thumbnail: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=200',
                status: 'active',
                isActive: true,
                isFeatured: true
            },
            {
                name: 'Panadol Advance',
                slug: 'panadol-advance-' + Date.now(),
                sku: 'PAIN001',
                barcode: '8901234567002',
                description: 'Fast-acting paracetamol for relief of headache, migraine, backache, and toothache.',
                shortDescription: 'Fast-acting pain relief tablet',
                genericName: 'Paracetamol',
                manufacturer: 'Bayer',
                dosageForm: 'Tablet',
                strength: '500mg',
                packSize: '24 tablets',
                requiresPrescription: false,
                categoryId: createdCategories['pain-relief'].id,
                costPrice: 45,
                sellingPrice: 75,
                mrp: 90,
                minOrderQuantity: 1,
                taxEnabled: true,
                taxPercentage: 12,
                taxId: tax.id,
                stockQuantity: 200,
                lowStockThreshold: 20,
                trackInventory: true,
                images: ['https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=800'],
                thumbnail: 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=200',
                status: 'active',
                isActive: true,
                isFeatured: true
            },
            {
                name: 'Zandu Multivitamins',
                slug: 'zandu-multivitamins-' + Date.now(),
                sku: 'VIT001',
                barcode: '8901234567003',
                description: 'Daily multivitamin supplement with zinc and vitamin D for immune support.',
                shortDescription: 'Complete daily immunity booster',
                genericName: 'Multivitamin',
                manufacturer: 'Zandu Pharma',
                dosageForm: 'Capsule',
                strength: '1000mg',
                packSize: '60 capsules',
                requiresPrescription: false,
                categoryId: createdCategories['vitamins'].id,
                costPrice: 450,
                sellingPrice: 650,
                mrp: 750,
                minOrderQuantity: 1,
                taxEnabled: true,
                taxPercentage: 12,
                taxId: tax.id,
                stockQuantity: 80,
                lowStockThreshold: 10,
                trackInventory: true,
                images: ['https://images.unsplash.com/photo-1471864190281-ad5fe9afef77?q=80&w=800'],
                thumbnail: 'https://images.unsplash.com/photo-1471864190281-ad5fe9afef77?q=80&w=200',
                status: 'active',
                isActive: true,
                isFeatured: true
            },
            {
                name: 'Savlon Antiseptic Liquid',
                slug: 'savlon-antiseptic-' + Date.now(),
                sku: 'AID001',
                barcode: '8901234567004',
                description: 'Used for first aid and medical procedures to cleanse skin and wounds.',
                shortDescription: 'First aid antiseptic liquid',
                genericName: 'Chlorhexidine',
                manufacturer: 'Johnson & Johnson',
                dosageForm: 'Liquid',
                strength: '500ml',
                packSize: '1 bottle',
                requiresPrescription: false,
                categoryId: createdCategories['first-aid'].id,
                costPrice: 120,
                sellingPrice: 195,
                mrp: 220,
                minOrderQuantity: 1,
                taxEnabled: true,
                taxPercentage: 12,
                taxId: tax.id,
                stockQuantity: 150,
                lowStockThreshold: 15,
                trackInventory: true,
                images: ['https://images.unsplash.com/photo-1576091160550-2173599211d0?q=80&w=800'],
                thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173599211d0?q=80&w=200',
                status: 'active',
                isActive: true,
                isFeatured: false
            },
            {
                name: 'Nivea Aloe Hydration',
                slug: 'nivea-aloe-' + Date.now(),
                sku: 'SKIN001',
                barcode: '8901234567005',
                description: 'Moisturizing skin lotion with Aloe Vera for 48-hour hydration.',
                shortDescription: 'Deep moisture skin lotion',
                genericName: 'Body Lotion',
                manufacturer: 'Nivea',
                dosageForm: 'Cream',
                strength: '400ml',
                packSize: '1 bottle',
                requiresPrescription: false,
                categoryId: createdCategories['skin-care'].id,
                costPrice: 280,
                sellingPrice: 420,
                mrp: 499,
                minOrderQuantity: 1,
                taxEnabled: true,
                taxPercentage: 12,
                taxId: tax.id,
                stockQuantity: 60,
                lowStockThreshold: 5,
                trackInventory: true,
                images: ['https://images.unsplash.com/photo-1556228578-8c7c0f44bb0b?q=80&w=800'],
                thumbnail: 'https://images.unsplash.com/photo-1556228578-8c7c0f44bb0b?q=80&w=200',
                status: 'active',
                isActive: true,
                isFeatured: true
            }
        ];

        // Create products
        const createdProducts = await Product.bulkCreate(sampleProducts);
        console.log(`✅ Successfully seeded ${createdProducts.length} products`);

        // Display created products
        createdProducts.forEach(product => {
            console.log(`  - ${product.name} (SKU: ${product.sku})`);
        });

    } catch (error) {
        console.error('❌ Error seeding products:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedProducts()
        .then(() => {
            console.log('Seeding completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = seedProducts;
