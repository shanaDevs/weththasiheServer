const { Doctor, User, Address, Order, sequelize } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AuditLogService, NotificationService } = require('../../services');

/**
 * Get current doctor profile
 */
exports.getMyProfile = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({
            where: { userId: req.user.id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'phone', 'userName', 'createdAt']
                }
            ]
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor profile not found. Please complete your registration.'
            });
        }

        res.json({
            success: true,
            data: doctor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Register/Create doctor profile
 */
exports.register = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Check if already registered
        const existing = await Doctor.findOne({
            where: { userId: req.user.id },
            transaction
        });

        if (existing) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Doctor profile already exists'
            });
        }

        const {
            licenseNumber,
            specialization,
            qualification,
            hospitalClinic,
            clinicAddress,
            clinicPhone,
            taxId,
            gstNumber
        } = req.body;

        // Check if license number is unique
        const licenseExists = await Doctor.findOne({
            where: { licenseNumber },
            transaction
        });

        if (licenseExists) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'License number already registered'
            });
        }

        const doctor = await Doctor.create({
            userId: req.user.id,
            licenseNumber,
            specialization,
            qualification,
            hospitalClinic,
            address: clinicAddress,
            secondaryPhone: clinicPhone,
            gstNumber,
            status: 'pending',
            isVerified: false
        }, { transaction });

        await transaction.commit();

        // Send notification to admin for verification
        // This would typically go to admin email

        await AuditLogService.logCreate(req, 'doctors', 'Doctor', doctor.id, {
            licenseNumber,
            specialization
        });

        res.status(201).json({
            success: true,
            message: 'Doctor registration submitted for verification',
            data: doctor
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Update doctor profile
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const doctor = await Doctor.findOne({
            where: { userId: req.user.id }
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor profile not found'
            });
        }

        const oldData = doctor.toJSON();
        const allowedFields = [
            'specialization', 'qualification', 'hospitalClinic',
            'address', 'secondaryPhone', 'email'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                doctor[field] = req.body[field];
            }
        });

        await doctor.save();

        await AuditLogService.logUpdate(req, 'doctors', 'Doctor', doctor.id, oldData, doctor.toJSON());

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: doctor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all doctors (Admin)
 */
exports.getAllDoctors = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where[Op.or] = [
                { licenseNumber: { [Op.like]: `%${search}%` } },
                { hospitalClinic: { [Op.like]: `%${search}%` } },
                { specialization: { [Op.like]: `%${search}%` } },
                { '$user.firstName$': { [Op.like]: `%${search}%` } },
                { '$user.lastName$': { [Op.like]: `%${search}%` } },
                { '$user.phone$': { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Doctor.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'phone', 'userName']
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                doctors: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get doctor by ID (Admin)
 */
exports.getDoctor = async (req, res, next) => {
    try {
        const { id } = req.params;

        const doctor = await Doctor.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'phone', 'userName', 'createdAt'],
                    include: [{
                        model: Address,
                        as: 'addresses'
                    }]
                }
            ]
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Get order stats
        const orderStats = await Order.findOne({
            where: { doctorId: id, isDeleted: false },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
                [sequelize.fn('SUM', sequelize.col('total')), 'totalSpent']
            ]
        });

        res.json({
            success: true,
            data: {
                ...doctor.toJSON(),
                stats: {
                    totalOrders: parseInt(orderStats?.get('totalOrders')) || 0,
                    totalSpent: parseFloat(orderStats?.get('totalSpent')) || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify doctor (Admin)
 */
exports.verifyDoctor = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { status, notes, creditLimit, paymentTerms } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be approved or rejected'
            });
        }

        const doctor = await Doctor.findByPk(id, {
            include: [{ model: User, as: 'user' }],
            transaction
        });

        if (!doctor) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const oldData = doctor.toJSON();

        doctor.status = status;
        doctor.isVerified = status === 'approved';
        doctor.verifiedAt = status === 'approved' ? new Date() : null;
        doctor.verifiedBy = req.user.id;
        doctor.verificationNotes = notes;

        if (status === 'approved') {
            doctor.creditLimit = creditLimit || 50000;
            doctor.paymentTerms = paymentTerms || 30;
        }

        await doctor.save({ transaction });

        await transaction.commit();

        // Send notification to doctor
        const user = await User.findByPk(doctor.userId);
        if (status === 'approved') {
            await NotificationService.sendEmail(
                user,
                'Doctor Verification Approved',
                `Congratulations! Your doctor registration has been approved. You can now enjoy credit purchases up to Rs.${doctor.creditLimit}.`
            );
        } else {
            await NotificationService.sendEmail(
                user,
                'Doctor Verification Update',
                `Your doctor verification was not approved. Reason: ${notes || 'Not specified'}. Please contact support for more details.`
            );
        }

        await AuditLogService.logStatusChange(
            req, 'doctors', 'Doctor', id,
            oldData.status, status, notes
        );

        res.json({
            success: true,
            message: `Doctor ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
            data: doctor
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Update doctor credit limit (Admin)
 */
exports.updateCreditLimit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { creditLimit, paymentTerms } = req.body;

        const doctor = await Doctor.findByPk(id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const oldData = doctor.toJSON();

        if (creditLimit !== undefined) doctor.creditLimit = creditLimit;
        if (paymentTerms !== undefined) doctor.paymentTerms = paymentTerms;

        await doctor.save();

        await AuditLogService.logUpdate(
            req, 'doctors', 'Doctor', id, oldData, doctor.toJSON()
        );

        res.json({
            success: true,
            message: 'Credit limit updated',
            data: doctor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get doctor's addresses
 */
exports.getAddresses = async (req, res, next) => {
    try {
        const addresses = await Address.findAll({
            where: {
                userId: req.user.id,
                isDeleted: false
            },
            order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add address
 */
exports.addAddress = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { isDefault, ...addressData } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            const whereClause = { userId: req.user.id };
            // Only filter by addressType if it's provided
            if (addressData.addressType) {
                whereClause.addressType = addressData.addressType;
            }
            await Address.update(
                { isDefault: false },
                { where: whereClause, transaction }
            );
        }

        const address = await Address.create({
            ...addressData,
            userId: req.user.id,
            addressType: addressData.addressType || 'both', // Default to 'both' if not specified
            isDefault: isDefault || false
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: address
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Update address
 */
exports.updateAddress = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;

        const address = await Address.findOne({
            where: { id, userId: req.user.id, isDeleted: false },
            transaction
        });

        if (!address) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const { isDefault, ...updateData } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            const whereClause = { userId: req.user.id };
            // Only filter by addressType if it's provided
            if (address.addressType) {
                whereClause.addressType = address.addressType;
            }
            await Address.update(
                { isDefault: false },
                { where: whereClause, transaction }
            );
        }

        Object.assign(address, updateData);
        if (isDefault !== undefined) address.isDefault = isDefault;

        await address.save({ transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Address updated',
            data: address
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Delete address
 */
exports.deleteAddress = async (req, res, next) => {
    try {
        const { id } = req.params;

        const address = await Address.findOne({
            where: { id, userId: req.user.id, isDeleted: false }
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        address.isDeleted = true;
        await address.save();

        res.json({
            success: true,
            message: 'Address deleted'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get doctor credit summary
 */
exports.getCreditSummary = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({
            where: { userId: req.user.id }
        });

        if (!doctor || !doctor.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Credit not available. Please complete doctor verification.'
            });
        }

        // Get pending credit orders
        const pendingOrders = await Order.findAll({
            where: {
                doctorId: doctor.id,
                isCredit: true,
                paymentStatus: 'credit',
                isDeleted: false
            },
            attributes: ['id', 'orderNumber', 'total', 'creditDueDate', 'createdAt'],
            order: [['creditDueDate', 'ASC']]
        });

        res.json({
            success: true,
            data: {
                creditLimit: parseFloat(doctor.creditLimit),
                currentCredit: parseFloat(doctor.currentCredit),
                availableCredit: parseFloat(doctor.creditLimit) - parseFloat(doctor.currentCredit),
                paymentTerms: doctor.paymentTerms,
                pendingOrders
            }
        });
    } catch (error) {
        next(error);
    }
};
