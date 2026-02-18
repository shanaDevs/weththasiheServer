const { Tax } = require('../models');

const taxes = [
    {
        name: 'No Tax',
        code: 'NO_TAX',
        percentage: 0,
        type: 'percentage',
        isInclusive: false,
        isActive: true,
        isDefault: false,
        description: 'No tax applicable'
    },
    {
        name: 'GST 5%',
        code: 'GST_5',
        percentage: 5,
        type: 'percentage',
        isInclusive: false,
        isActive: true,
        isDefault: false,
        description: 'Goods and Services Tax at 5%'
    },
    {
        name: 'GST 12%',
        code: 'GST_12',
        percentage: 12,
        type: 'percentage',
        isInclusive: false,
        isActive: true,
        isDefault: false,
        description: 'Goods and Services Tax at 12%'
    },
    {
        name: 'GST 18%',
        code: 'GST_18',
        percentage: 18,
        type: 'percentage',
        isInclusive: false,
        isActive: true,
        isDefault: true,
        description: 'Goods and Services Tax at 18% (Default)'
    },
    {
        name: 'GST 28%',
        code: 'GST_28',
        percentage: 28,
        type: 'percentage',
        isInclusive: false,
        isActive: true,
        isDefault: false,
        description: 'Goods and Services Tax at 28%'
    }
];

async function seedTaxes() {
    console.log('Seeding taxes...');

    try {
        for (const taxData of taxes) {
            await Tax.findOrCreate({
                where: { code: taxData.code },
                defaults: {
                    name: taxData.name,
                    code: taxData.code,
                    percentage: taxData.percentage,
                    description: taxData.description,
                    type: taxData.isInclusive ? 'inclusive' : 'exclusive',
                    isDefault: taxData.isDefault,
                    isActive: taxData.isActive
                }
            });
        }

        console.log(`Seeded ${taxes.length} tax configurations`);
    } catch (error) {
        console.error('Error seeding taxes:', error);
        throw error;
    }
}

module.exports = seedTaxes;
