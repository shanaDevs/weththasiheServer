const { Category } = require('./models');

async function listCategories() {
    try {
        const categories = await Category.findAll({
            attributes: ['id', 'name', 'slug', 'parentId']
        });
        console.log(JSON.stringify(categories, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listCategories();
