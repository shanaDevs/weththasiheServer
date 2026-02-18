const { User, Role, Doctor, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize;
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { NotificationService } = require('../../services');

// ... (existing login, refreshToken, register functions remain unchanged)

// Admin create user/doctor
exports.adminCreateUser = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            firstName,
            lastName,
            userName,
            phone,
            roleId,
            licenseNumber,
            licensePhoto
        } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ phone }, { userName }]
            }
        });

        if (existingUser) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'User with this phone or username already exists'
            });
        }

        // Get role
        const role = await Role.findByPk(roleId);
        if (!role) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Generate verification token and temporary password
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tempPassword = crypto.randomBytes(8).toString('hex'); // Temporary until setup
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            userName,
            phone,
            password: hashedPassword,
            roleId: role.id,
            isVerified: false,
            verificationToken
        }, { transaction: t });

        let doctorProfile = null;
        if (role.name === 'doctor' || licenseNumber) {
            // Create doctor profile
            doctorProfile = await Doctor.create({
                userId: user.id,
                licenseNumber: licenseNumber || `TEMP-${Date.now()}`,
                licensePhoto: licensePhoto,
                status: 'pending'
            }, { transaction: t });
        }

        await t.commit();

        // Send verification link
        try {
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-account?token=${verificationToken}`;

            // Reusing notification service or creating a new helper
            await NotificationService.send({
                user: user,
                emailTemplate: 'account_verification',
                smsTemplate: 'account_verification_sms', // You might need to add these templates
                placeholders: {
                    user_name: user.firstName,
                    verification_link: verificationUrl,
                    temp_password: tempPassword
                }
            });
        } catch (error) {
            console.error('Failed to send verification notification:', error.message);
            // Don't fail the whole request if notification fails
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully. Verification link sent.',
            data: {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    userName: user.userName,
                    phone: user.phone,
                    role: role.name
                },
                doctorProfile
            }
        });
    } catch (error) {
        if (t) await t.rollback();
        next(error);
    }
};

// Verify account
exports.verifyAccount = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const user = await User.findOne({
            where: { verificationToken: token, isDeleted: false }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        // Verify user but don't clear token yet (we'll need it for password setup if following a single flow)
        // Or clear it and use a separate session. Let's keep it until password setup.
        user.isVerified = true;
        await user.save();

        res.json({
            success: true,
            message: 'Account verified successfully. Please set your password.',
            data: {
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        next(error);
    }
};

// Setup password after verification
exports.setupPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and password are required'
            });
        }

        const user = await User.findOne({
            where: { verificationToken: token, isDeleted: false, isVerified: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Invalid token or account not verified'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.password = hashedPassword;
        user.verificationToken = null; // Clear token after use
        await user.save();

        res.json({
            success: true,
            message: 'Password set successfully. You can now login.'
        });
    } catch (error) {
        next(error);
    }
};

// ... (existing getUsers, toggleUserStatus, logout functions)

// Login user
exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { phone, password } = req.body;

        // Find user by phone with role
        const user = await User.findOne({
            where: { phone },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'displayName', 'level']
            }]
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is disabled
        if (user.isDisabled) {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled. Please contact administrator.'
            });
        }

        // Check if user is deleted
        if (user.isDeleted) {
            return res.status(403).json({
                success: false,
                message: 'Account has been deleted.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                phone: user.phone,
                roleId: user.roleId,
                roleName: user.role.name,
                roleLevel: user.role.level
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
            {
                id: user.id,
                phone: user.phone,
                roleId: user.roleId
            },
            process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// Refresh access token
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Verify user still exists and is active
        const user = await User.findOne({
            where: {
                id: decoded.id,
                isDeleted: false,
                isDisabled: false
            },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'displayName', 'level']
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found or account disabled'
            });
        }

        // Generate new access token
        const newToken = jwt.sign(
            {
                id: user.id,
                phone: user.phone,
                roleId: user.roleId,
                roleName: user.role.name,
                roleLevel: user.role.level
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                refreshToken: refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register user
exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { firstName, lastName, userName, phone, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { phone },
                    { userName }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone or username already exists'
            });
        }

        // Get default 'user' role
        const userRole = await Role.findOne({ where: { name: 'user' } });
        if (!userRole) {
            return res.status(500).json({
                success: false,
                message: 'Default user role not found'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            userName,
            phone,
            password: hashedPassword,
            roleId: userRole.id
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                phone: user.phone,
                roleId: user.roleId,
                roleName: userRole.name,
                roleLevel: userRole.level
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get all users (Admin)
exports.getUsers = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            roleId,
            isActive
        } = req.query;

        const where = { isDeleted: false };
        if (roleId) where.roleId = roleId;
        if (isActive !== undefined) where.isDisabled = isActive === 'false';

        const { Op } = require('sequelize');
        if (search) {
            where[Op.or] = [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
                { userName: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'displayName']
                },
                {
                    model: Doctor,
                    as: 'doctorProfile',
                    attributes: ['id', 'licenseNumber', 'hospitalClinic', 'isVerified']
                }
            ],
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                users: rows,
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

// Toggle user status (Admin)
exports.toggleUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isDisabled } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isDisabled = isDisabled;
        await user.save();

        res.json({
            success: true,
            message: `User ${isDisabled ? 'disabled' : 'enabled'} successfully`,
            data: {
                id: user.id,
                isDisabled: user.isDisabled
            }
        });
    } catch (error) {
        next(error);
    }
};

// Logout user (stateless - client should discard tokens)
exports.logout = async (req, res, next) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully. Please discard your tokens.'
        });
    } catch (error) {
        next(error);
    }
};
