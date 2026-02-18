const { Product, Inventory, InventoryMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const AuditLogService = require('./auditLogService');

/**
 * Inventory Service - Handles all inventory operations
 */
class InventoryService {
    /**
     * Get available stock for a product
     * @param {number} productId - Product ID
     * @returns {number} - Available quantity
     */
    static async getAvailableStock(productId) {
        const product = await Product.findByPk(productId, {
            attributes: ['stockQuantity', 'trackInventory']
        });

        if (!product || !product.trackInventory) {
            return Infinity; // No tracking, unlimited stock
        }

        return product.stockQuantity;
    }

    /**
     * Check if product is in stock
     * @param {number} productId - Product ID
     * @param {number} quantity - Required quantity
     * @returns {Object} - Stock status
     */
    static async checkStock(productId, quantity) {
        const product = await Product.findByPk(productId, {
            attributes: ['id', 'name', 'stockQuantity', 'trackInventory', 'allowBackorder']
        });

        if (!product) {
            return { available: false, message: 'Product not found' };
        }

        if (!product.trackInventory) {
            return { available: true, message: 'Inventory not tracked' };
        }

        if (product.stockQuantity >= quantity) {
            return {
                available: true,
                currentStock: product.stockQuantity,
                message: 'In stock'
            };
        }

        if (product.allowBackorder) {
            return {
                available: true,
                currentStock: product.stockQuantity,
                isBackorder: true,
                message: 'Available for backorder'
            };
        }

        return {
            available: false,
            currentStock: product.stockQuantity,
            message: `Only ${product.stockQuantity} available`
        };
    }

    /**
     * Reserve stock for an order (before payment)
     * @param {number} productId - Product ID
     * @param {number} quantity - Quantity to reserve
     * @param {string} referenceNumber - Order reference
     * @param {Object} req - Request object for audit
     * @param {Object} externalTransaction - Optional external transaction
     */
    static async reserveStock(productId, quantity, referenceNumber, req = null, externalTransaction = null) {
        const transaction = externalTransaction || await sequelize.transaction();
        const shouldCommit = !externalTransaction; // Only commit if we created the transaction

        try {
            const product = await Product.findByPk(productId, {
                lock: true,
                transaction
            });

            if (!product || !product.trackInventory) {
                if (shouldCommit) await transaction.commit();
                return { success: true, message: 'Inventory not tracked' };
            }

            const currentStock = product.stockQuantity;

            // Create inventory movement
            await InventoryMovement.create({
                productId,
                type: 'reserved',
                quantityBefore: currentStock,
                quantityChange: -quantity,
                quantityAfter: currentStock, // Stock not actually reduced
                referenceType: 'order',
                referenceNumber,
                reason: 'Stock reserved for order',
                createdBy: req?.user?.id,
                createdByName: req?.user?.userName,
                ipAddress: AuditLogService.getIpAddress(req)
            }, { transaction });

            // Update reserved quantity in inventory if using detailed inventory
            const inventory = await Inventory.findOne({
                where: { productId },
                lock: true,
                transaction
            });

            if (inventory) {
                inventory.reservedQuantity += quantity;
                await inventory.save({ transaction });
            }

            if (shouldCommit) await transaction.commit();

            return {
                success: true,
                message: 'Stock reserved successfully',
                reservedQuantity: quantity
            };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            throw error;
        }
    }

    /**
     * Release reserved stock (e.g., order cancelled)
     * @param {number} productId - Product ID
     * @param {number} quantity - Quantity to reserve
     * @param {string} referenceNumber - Order reference
     * @param {Object} req - Request object for audit
     * @param {Object} externalTransaction - Optional external transaction
     */
    static async releaseReservedStock(productId, quantity, referenceNumber, req = null, externalTransaction = null) {
        const transaction = externalTransaction || await sequelize.transaction();
        const shouldCommit = !externalTransaction;

        try {
            const inventory = await Inventory.findOne({
                where: { productId },
                lock: true,
                transaction
            });

            if (inventory) {
                inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - quantity);
                await inventory.save({ transaction });
            }

            // Create movement record
            await InventoryMovement.create({
                productId,
                inventoryId: inventory?.id,
                type: 'unreserved',
                quantityBefore: inventory?.quantity ?? 0,
                quantityChange: 0,
                quantityAfter: inventory?.quantity ?? 0,
                referenceType: 'order',
                referenceNumber,
                reason: 'Reserved stock released',
                createdBy: req?.user?.id,
                createdByName: req?.user?.userName
            }, { transaction });

            if (shouldCommit) await transaction.commit();

            return { success: true, message: 'Reserved stock released' };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reduce stock after order completion
     * @param {number} productId - Product ID
     * @param {number} quantity - Quantity to reduce
     * @param {string} referenceType - Reference type (order, return, etc.)
     * @param {number} referenceId - Reference ID
     * @param {string} referenceNumber - Reference number
     * @param {Object} req - Request object for audit
     * @param {Object} externalTransaction - Optional external transaction
     */
    static async reduceStock(productId, quantity, referenceType, referenceId, referenceNumber, req = null, externalTransaction = null) {
        const transaction = externalTransaction || await sequelize.transaction();
        const shouldCommit = !externalTransaction;

        try {
            const product = await Product.findByPk(productId, {
                lock: true,
                transaction
            });

            if (!product || !product.trackInventory) {
                if (shouldCommit) await transaction.commit();
                return { success: true, message: 'Inventory not tracked' };
            }

            const previousStock = product.stockQuantity;
            const newStock = previousStock - quantity;

            // Update product stock
            product.stockQuantity = Math.max(0, newStock);
            await product.save({ transaction });

            // Create movement record
            await InventoryMovement.create({
                productId,
                type: 'sale',
                quantityBefore: previousStock,
                quantityChange: -quantity,
                quantityAfter: product.stockQuantity,
                referenceType,
                referenceId,
                referenceNumber,
                reason: `Stock reduced for ${referenceType}`,
                createdBy: req?.user?.id,
                createdByName: req?.user?.userName,
                ipAddress: AuditLogService.getIpAddress(req)
            }, { transaction });

            // Update detailed inventory if exists
            const inventory = await Inventory.findOne({
                where: { productId },
                lock: true,
                transaction
            });

            if (inventory) {
                inventory.quantity = product.stockQuantity;
                inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - quantity);
                inventory.lastSoldAt = new Date();
                inventory.status = this.determineStockStatus(product.stockQuantity, product.lowStockThreshold);
                await inventory.save({ transaction });
            }

            if (shouldCommit) await transaction.commit();

            // Check for low stock alert
            if (product.stockQuantity <= product.lowStockThreshold) {
                await this.triggerLowStockAlert(product);
            }

            return {
                success: true,
                previousStock,
                newStock: product.stockQuantity,
                message: 'Stock reduced successfully'
            };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            throw error;
        }
    }

    /**
     * Increase stock (purchase, return, adjustment)
     * @param {number} productId - Product ID
     * @param {number} quantity - Quantity
     * @param {string} type - movement type
     * @param {string} referenceType - reference type
     * @param {number} referenceId - reference ID
     * @param {string} referenceNumber - reference number
     * @param {Object} options - adjustment options
     * @param {Object} externalTransaction - Optional external transaction
     */
    static async increaseStock(productId, quantity, type, referenceType, referenceId, referenceNumber, options = {}, externalTransaction = null) {
        const { batchNumber, expiryDate, costPrice, reason, req } = options;
        const transaction = externalTransaction || await sequelize.transaction();
        const shouldCommit = !externalTransaction;

        try {
            const product = await Product.findByPk(productId, {
                lock: true,
                transaction
            });

            if (!product) {
                throw new Error('Product not found');
            }

            const previousStock = product.stockQuantity;
            const newStock = previousStock + quantity;

            // Update product stock
            product.stockQuantity = newStock;

            // Update batch info if provided
            if (batchNumber) product.batchNumber = batchNumber;
            if (expiryDate) product.expiryDate = expiryDate;

            await product.save({ transaction });

            // Create movement record
            await InventoryMovement.create({
                productId,
                type,
                quantityBefore: previousStock,
                quantityChange: quantity,
                quantityAfter: newStock,
                referenceType,
                referenceId,
                referenceNumber,
                batchNumber,
                unitCost: costPrice,
                totalCost: costPrice ? costPrice * quantity : null,
                reason: reason || `Stock increased via ${type}`,
                createdBy: req?.user?.id,
                createdByName: req?.user?.userName,
                ipAddress: AuditLogService.getIpAddress(req)
            }, { transaction });

            // Update or create inventory record
            let inventory = await Inventory.findOne({
                where: { productId, batchNumber: batchNumber || null },
                lock: true,
                transaction
            });

            if (inventory) {
                inventory.quantity += quantity;
                inventory.lastRestockedAt = new Date();
                inventory.status = this.determineStockStatus(newStock, product.lowStockThreshold);
                if (costPrice) inventory.costPrice = costPrice;
                if (expiryDate) inventory.expiryDate = expiryDate;
                await inventory.save({ transaction });
            } else if (batchNumber) {
                inventory = await Inventory.create({
                    productId,
                    quantity,
                    batchNumber,
                    expiryDate,
                    costPrice,
                    lastRestockedAt: new Date(),
                    status: this.determineStockStatus(newStock, product.lowStockThreshold),
                    createdBy: req?.user?.id
                }, { transaction });
            }

            if (shouldCommit) await transaction.commit();

            return {
                success: true,
                previousStock,
                newStock,
                message: 'Stock increased successfully'
            };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            throw error;
        }
    }

    /**
     * Adjust stock (manual adjustment)
     * @param {number} productId - Product ID
     * @param {number} newQuantity - New quantity
     * @param {string} reason - Adjustment reason
     * @param {Object} req - Request object
     * @param {Object} externalTransaction - Optional external transaction
     */
    static async adjustStock(productId, newQuantity, reason, req = null, externalTransaction = null) {
        const transaction = externalTransaction || await sequelize.transaction();
        const shouldCommit = !externalTransaction;

        try {
            const product = await Product.findByPk(productId, {
                lock: true,
                transaction
            });

            if (!product) {
                if (shouldCommit) await transaction.rollback();
                throw new Error('Product not found');
            }

            const previousStock = product.stockQuantity;
            const quantityChange = newQuantity - previousStock;

            product.stockQuantity = newQuantity;
            await product.save({ transaction });

            await InventoryMovement.create({
                productId,
                type: 'adjustment',
                quantityBefore: previousStock,
                quantityChange,
                quantityAfter: newQuantity,
                referenceType: 'adjustment',
                reason,
                createdBy: req?.user?.id,
                createdByName: req?.user?.userName,
                ipAddress: AuditLogService.getIpAddress(req)
            }, { transaction });

            // Update inventory status
            const inventory = await Inventory.findOne({
                where: { productId },
                lock: true,
                transaction
            });

            if (inventory) {
                inventory.quantity = newQuantity;
                inventory.status = this.determineStockStatus(newQuantity, product.lowStockThreshold);
                inventory.updatedBy = req?.user?.id;
                await inventory.save({ transaction });
            }

            if (shouldCommit) await transaction.commit();

            // Log adjustment
            if (req) {
                await AuditLogService.logUpdate(
                    req,
                    'inventory',
                    'Product',
                    productId,
                    { stockQuantity: previousStock },
                    { stockQuantity: newQuantity },
                    `Stock adjusted: ${reason}`
                );
            }

            return {
                success: true,
                previousStock,
                newStock: newQuantity,
                adjustment: quantityChange
            };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            throw error;
        }
    }

    /**
     * Determine stock status based on quantity
     */
    static determineStockStatus(quantity, threshold) {
        if (quantity <= 0) return 'out_of_stock';
        if (quantity <= threshold) return 'low_stock';
        return 'in_stock';
    }

    /**
     * Trigger low stock alert
     */
    static async triggerLowStockAlert(product) {
        // This would trigger notification to admin users
        const NotificationService = require('./notificationService');
        const { User, Role } = require('../models');

        try {
            // Get admin users
            const adminRole = await Role.findOne({ where: { name: 'admin' } });
            if (adminRole) {
                const adminUsers = await User.findAll({
                    where: { roleId: adminRole.id, isDisabled: false, isDeleted: false }
                });

                if (adminUsers.length > 0) {
                    await NotificationService.sendLowStockAlert(product, adminUsers);
                }
            }
        } catch (error) {
            console.error('Failed to send low stock alert:', error.message);
        }
    }

    /**
     * Get low stock products
     */
    static async getLowStockProducts() {
        return Product.findAll({
            where: {
                trackInventory: true,
                isActive: true,
                isDeleted: false,
                stockQuantity: {
                    [Op.lte]: sequelize.col('low_stock_threshold')
                }
            },
            order: [['stockQuantity', 'ASC']]
        });
    }

    /**
     * Get out of stock products
     */
    static async getOutOfStockProducts() {
        return Product.findAll({
            where: {
                trackInventory: true,
                isActive: true,
                isDeleted: false,
                stockQuantity: { [Op.lte]: 0 }
            }
        });
    }

    /**
     * Get expiring products
     * @param {number} daysAhead - Days to look ahead
     */
    static async getExpiringProducts(daysAhead = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return Product.findAll({
            where: {
                isActive: true,
                isDeleted: false,
                expiryDate: {
                    [Op.between]: [new Date(), futureDate]
                }
            },
            order: [['expiryDate', 'ASC']]
        });
    }

    /**
     * Get inventory movements for a product
     */
    static async getMovements(productId, options = {}) {
        const {
            type,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = options;

        const where = { productId };

        if (type) where.type = type;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await InventoryMovement.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        return {
            movements: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Bulk stock update
     */
    static async bulkUpdateStock(updates, req = null) {
        const results = [];

        for (const update of updates) {
            try {
                const result = await this.adjustStock(
                    update.productId,
                    update.quantity,
                    update.reason || 'Bulk stock update',
                    req
                );
                results.push({ productId: update.productId, success: true, ...result });
            } catch (error) {
                results.push({ productId: update.productId, success: false, error: error.message });
            }
        }

        return results;
    }
}

module.exports = InventoryService;
