const { sequelize, Sequelize } = require('../config/database');

// ==================== USERS & AUTH ====================
const User = require('./users/User')(sequelize, Sequelize);
const Role = require('./users/Role')(sequelize, Sequelize);
const Permission = require('./users/Permission')(sequelize, Sequelize);
const RolePermission = require('./users/RolePermission')(sequelize, Sequelize);

// ==================== AUDIT ====================
const AuditLog = require('./audit/AuditLog')(sequelize, Sequelize);

// ==================== PRODUCTS ====================
const Category = require('./products/Category')(sequelize, Sequelize);
const Product = require('./products/Product')(sequelize, Sequelize);
const ProductBulkPrice = require('./products/ProductBulkPrice')(sequelize, Sequelize);
const ProductBatch = require('./products/ProductBatch')(sequelize, Sequelize);

// ==================== PRICING ====================
const Tax = require('./pricing/Tax')(sequelize, Sequelize);
const Discount = require('./pricing/Discount')(sequelize, Sequelize);
const Promotion = require('./pricing/Promotion')(sequelize, Sequelize);

// ==================== CUSTOMERS ====================
const Doctor = require('./customers/Doctor')(sequelize, Sequelize);
const Address = require('./customers/Address')(sequelize, Sequelize);

// ==================== ORDERS ====================
const Cart = require('./orders/Cart')(sequelize, Sequelize);
const CartItem = require('./orders/CartItem')(sequelize, Sequelize);
const Order = require('./orders/Order')(sequelize, Sequelize);
const OrderItem = require('./orders/OrderItem')(sequelize, Sequelize);
const OrderStatusHistory = require('./orders/OrderStatusHistory')(sequelize, Sequelize);
const OrderRequest = require('./orders/OrderRequest')(sequelize, Sequelize);

// ==================== INVENTORY ====================
const Inventory = require('./inventory/Inventory')(sequelize, Sequelize);
const InventoryMovement = require('./inventory/InventoryMovement')(sequelize, Sequelize);
const Supplier = require('./inventory/Supplier')(sequelize, Sequelize);

// ==================== PAYMENTS ====================
const Payment = require('./payments/Payment')(sequelize, Sequelize);

// ==================== SETTINGS ====================
const SystemSetting = require('./settings/SystemSetting')(sequelize, Sequelize);

// ==================== NOTIFICATIONS ====================
const NotificationTemplate = require('./notifications/NotificationTemplate')(sequelize, Sequelize);
const NotificationLog = require('./notifications/NotificationLog')(sequelize, Sequelize);

// ==================== RELATIONSHIPS ====================

// ----- User & Role -----
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

// ----- Role & Permission (Many-to-Many) -----
Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions'
});
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles'
});

// ----- Category (Self-referential for hierarchy) -----
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
Category.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Category.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// ----- Product -----
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

Product.belongsTo(Tax, { foreignKey: 'taxId', as: 'tax' });
Tax.hasMany(Product, { foreignKey: 'taxId', as: 'products' });

Product.hasMany(ProductBulkPrice, { foreignKey: 'productId', as: 'bulkPrices' });
ProductBulkPrice.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Product.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Product.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// ----- Product & Batch -----
Product.hasMany(ProductBatch, { foreignKey: 'productId', as: 'batches' });
ProductBatch.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// ----- Supplier & Batch -----
Supplier.hasMany(ProductBatch, { foreignKey: 'supplierId', as: 'batches' });
ProductBatch.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

// ----- Doctor -----
Doctor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Doctor, { foreignKey: 'userId', as: 'doctorProfile' });

Doctor.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

// ----- Address -----
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });

// ----- Cart -----
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Cart, { foreignKey: 'userId', as: 'carts' });

Cart.belongsTo(Discount, { foreignKey: 'discountId', as: 'discount' });
Cart.belongsTo(Address, { foreignKey: 'shippingAddressId', as: 'shippingAddress' });
Cart.belongsTo(Address, { foreignKey: 'billingAddressId', as: 'billingAddress' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems' });

CartItem.belongsTo(Promotion, { foreignKey: 'promotionId', as: 'promotion' });
CartItem.belongsTo(ProductBulkPrice, { foreignKey: 'appliedBulkPriceId', as: 'appliedBulkPrice' });

// ----- Order -----
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });

Order.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });
Doctor.hasMany(Order, { foreignKey: 'doctorId', as: 'orders' });

Order.belongsTo(Discount, { foreignKey: 'discountId', as: 'discount' });
Order.belongsTo(Promotion, { foreignKey: 'promotionId', as: 'promotion' });

Order.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Order.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
Order.belongsTo(User, { foreignKey: 'cancelledBy', as: 'canceller' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });

OrderItem.belongsTo(Promotion, { foreignKey: 'promotionId', as: 'promotion' });
OrderItem.belongsTo(ProductBulkPrice, { foreignKey: 'appliedBulkPriceId', as: 'appliedBulkPrice' });

// ----- Order Status History -----
Order.hasMany(OrderStatusHistory, { foreignKey: 'orderId', as: 'statusHistory' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderStatusHistory.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

// ----- Order Request -----
User.hasMany(OrderRequest, { foreignKey: 'userId', as: 'orderRequests' });
OrderRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Product.hasMany(OrderRequest, { foreignKey: 'productId', as: 'orderRequests' });
OrderRequest.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

OrderRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });

// ----- Inventory -----
Product.hasMany(Inventory, { foreignKey: 'productId', as: 'inventory' });
Inventory.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Inventory.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Inventory.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// ----- Inventory Movement -----
InventoryMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(InventoryMovement, { foreignKey: 'productId', as: 'movements' });

InventoryMovement.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
Inventory.hasMany(InventoryMovement, { foreignKey: 'inventoryId', as: 'movements' });

InventoryMovement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ----- Payment -----
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });

Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Payment.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
Payment.belongsTo(User, { foreignKey: 'refundedBy', as: 'refunder' });

// ----- Notification Log -----
NotificationLog.belongsTo(NotificationTemplate, { foreignKey: 'templateId', as: 'template' });
NotificationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
NotificationLog.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ----- Audit Log -----
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ----- Tax, Discount, Promotion -----
Tax.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Tax.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

Discount.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Discount.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

Promotion.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Promotion.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// ----- Notification Template -----
NotificationTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
NotificationTemplate.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// ----- System Setting -----
SystemSetting.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

module.exports = {
    sequelize,
    Sequelize,
    // Users & Auth
    User,
    Role,
    Permission,
    RolePermission,
    // Audit
    AuditLog,
    // Products
    Category,
    Product,
    ProductBulkPrice,
    ProductBatch,
    // Pricing
    Tax,
    Discount,
    Promotion,
    // Customers
    Doctor,
    Address,
    // Orders
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatusHistory,
    OrderRequest,
    // Inventory
    Inventory,
    InventoryMovement,
    Supplier,
    // Payments
    Payment,
    // Settings
    SystemSetting,
    // Notifications
    NotificationTemplate,
    NotificationLog
};
