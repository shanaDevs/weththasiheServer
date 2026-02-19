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
            roleName,
            email,
            licenseNumber,
            licensePhoto,
            specialization,
            hospitalClinic
        } = req.body;

        // Check if user or doctor already exists
        const [existingUser, existingDoctor] = await Promise.all([
            User.findOne({ where: { [Op.or]: [{ phone }, { userName }] } }),
            Doctor.findOne({ where: { [Op.or]: [{ phone }, { userName }] } })
        ]);

        if (existingUser || existingDoctor) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'User or Doctor with this phone or username already exists'
            });
        }

        // Get role
        let role = null;
        if (roleId) {
            role = await Role.findByPk(roleId);
        } else if (roleName) {
            role = await Role.findOne({ where: { name: roleName } });
        }

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

        if (role.name === 'doctor' || roleName === 'doctor') {
            // Create doctor profile only
            doctorProfile = await Doctor.create({
                firstName,
                lastName,
                userName,
                phone,
                email,
                password: hashedPassword,
                verificationToken,
                licenseNumber: licenseNumber || `TEMP-${Date.now()}`,
                licensePhoto: licensePhoto,
                specialization,
                hospitalClinic,
                status: 'pending'
            }, { transaction: t });
        } else {
            // Create regular user
            const user = await User.create({
                firstName,
                lastName,
                userName,
                phone,
                email,
                password: hashedPassword,
                roleId: role.id,
                isVerified: false,
                verificationToken
            }, { transaction: t });

            // If they happen to have license info but aren't primarily doctor role (unlikely)
            if (licenseNumber) {
                doctorProfile = await Doctor.create({
                    userId: user.id,
                    email,
                    licenseNumber,
                    licensePhoto,
                    specialization,
                    hospitalClinic,
                    status: 'pending'
                }, { transaction: t });
            }
        }

        await t.commit();

        // Send verification link
        try {
            const isDoctor = role.name === 'doctor' || roleName === 'doctor';
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const verifyPath = isDoctor ? '/verify-doctor' : '/verify-account';
            const verificationUrl = `${frontendUrl}${verifyPath}?token=${verificationToken}`;

            const target = isDoctor ? doctorProfile : user;

            // Reusing notification service or creating a new helper
            await NotificationService.send({
                user: target,
                emailTemplate: 'account_verification',
                smsTemplate: 'account_verification_sms',
                placeholders: {
                    customer_name: `${target.firstName} ${target.lastName || ''}`.trim(),
                    verification_link: verificationUrl,
                    temp_password: tempPassword,
                    company_name: 'MediBulk'
                }
            });
        } catch (error) {
            console.error('Failed to send verification notification:', error.message);
            // Don't fail the whole request if notification fails
        }

        const resData = {
            success: true,
            message: 'User created successfully. Verification link sent.',
            data: {
                user: user ? {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    userName: user.userName,
                    phone: user.phone,
                    role: role.name
                } : null,
                doctorProfile: doctorProfile ? {
                    id: doctorProfile.id,
                    firstName: doctorProfile.firstName,
                    lastName: doctorProfile.lastName,
                    userName: doctorProfile.userName,
                    phone: doctorProfile.phone
                } : null
            }
        };

        res.status(201).json(resData);
    } catch (error) {
        if (t) await t.rollback();
        next(error);
    }
};

// Verify user account
exports.verifyUserAccount = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const account = await User.findOne({
            where: { verificationToken: token, isDeleted: false }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        // Verify account
        account.isVerified = true;
        // Optional: clear token after verification if not needed for password setup
        // But in this flow, they might need it for setupPassword
        await account.save();

        res.json({
            success: true,
            message: 'User account verified successfully.',
            data: {
                accountId: account.id,
                firstName: account.firstName,
                lastName: account.lastName,
                isDoctor: false
            }
        });
    } catch (error) {
        next(error);
    }
};

// Verify doctor account
exports.verifyDoctorAccount = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const account = await Doctor.findOne({
            where: { verificationToken: token, isDeleted: false }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        // Verify account - set both isVerified and isActive
        account.isVerified = true;
        account.isActive = true;
        await account.save();

        res.json({
            success: true,
            message: 'Doctor account verified successfully.',
            data: {
                accountId: account.id,
                firstName: account.firstName,
                lastName: account.lastName,
                isDoctor: true
            }
        });
    } catch (error) {
        next(error);
    }
};

// Public resend verification (called from login page by unverified user)
// Accepts identifier (phone or userName) and isDoctor flag
exports.publicResendVerification = async (req, res, next) => {
    try {
        const { identifier, isDoctor } = req.body;

        if (!identifier) {
            return res.status(400).json({ success: false, message: 'Identifier is required' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (isDoctor) {
            // Look up in Doctor table
            const doctor = await Doctor.findOne({
                where: {
                    [Op.or]: [{ phone: identifier }, { userName: identifier }],
                    isDeleted: false
                }
            });

            if (!doctor) {
                // Return success anyway to prevent account enumeration
                return res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
            }

            if (doctor.isVerified) {
                return res.status(400).json({ success: false, message: 'This account is already verified. Please log in.' });
            }

            if (!doctor.email) {
                return res.status(400).json({ success: false, message: 'No email address found. Please contact support.' });
            }

            // Reuse or generate token
            let token = doctor.verificationToken;
            if (!token) {
                token = crypto.randomBytes(32).toString('hex');
                doctor.verificationToken = token;
                await doctor.save();
            }

            const verificationUrl = `${frontendUrl}/verify-doctor?token=${token}`;
            try {
                await NotificationService.send({
                    user: doctor,
                    emailTemplate: 'account_verification',
                    placeholders: {
                        customer_name: `${doctor.firstName} ${doctor.lastName || ''}`.trim(),
                        verification_link: verificationUrl,
                        company_name: 'MediBulk'
                    }
                });
            } catch (e) {
                console.error('Failed to send doctor verification email:', e.message);
            }
        } else {
            // Look up in User table
            const user = await User.findOne({
                where: {
                    [Op.or]: [{ phone: identifier }, { userName: identifier }],
                    isDeleted: false
                }
            });

            if (!user) {
                return res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
            }

            if (user.isVerified) {
                return res.status(400).json({ success: false, message: 'This account is already verified. Please log in.' });
            }

            let token = user.verificationToken;
            if (!token) {
                token = crypto.randomBytes(32).toString('hex');
                user.verificationToken = token;
                await user.save();
            }

            const verificationUrl = `${frontendUrl}/verify-account?token=${token}`;
            try {
                await NotificationService.send({
                    user,
                    emailTemplate: 'account_verification',
                    placeholders: {
                        customer_name: `${user.firstName} ${user.lastName || ''}`.trim(),
                        verification_link: verificationUrl,
                        company_name: 'MediBulk'
                    }
                });
            } catch (e) {
                console.error('Failed to send user verification email:', e.message);
            }
        }

        res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
    } catch (error) {
        next(error);
    }
};

// Resend verification email - for USERS only
exports.resendVerification = async (req, res, next) => {
    try {
        const { id } = req.body;
        console.log(`🔄 Resend user verification requested for ID: ${id}`);

        const account = await User.findByPk(id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (account.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User account is already verified'
            });
        }

        // Use existing token or generate new one
        let token = account.verificationToken;
        if (!token) {
            token = crypto.randomBytes(32).toString('hex');
            account.verificationToken = token;
            await account.save();
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${frontendUrl}/verify-account?token=${token}`;

        console.log(`📧 Sending verification email to user: ${account.email}`);

        await NotificationService.send({
            user: account,
            emailTemplate: 'account_verification',
            placeholders: {
                customer_name: `${account.firstName} ${account.lastName || ''}`.trim(),
                verification_link: verificationUrl,
                company_name: 'MediBulk'
            }
        });

        res.json({
            success: true,
            message: 'Verification email resent successfully to user'
        });
    } catch (error) {
        next(error);
    }
};

// Resend verification email - for DOCTORS only
exports.resendDoctorVerification = async (req, res, next) => {
    try {
        const { id } = req.body;
        console.log(`🔄 Resend doctor verification requested for ID: ${id}`);

        const doctor = await Doctor.findByPk(id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        if (!doctor.email) {
            return res.status(400).json({
                success: false,
                message: 'Doctor does not have an email address on file'
            });
        }

        if (doctor.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Doctor account is already verified'
            });
        }

        // Use existing token or generate new one
        let token = doctor.verificationToken;
        if (!token) {
            token = crypto.randomBytes(32).toString('hex');
            doctor.verificationToken = token;
            await doctor.save();
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${frontendUrl}/verify-doctor?token=${token}`;

        console.log(`📧 Sending verification email to doctor: ${doctor.email}`);
        console.log(`📝 Doctor: ${doctor.firstName} ${doctor.lastName || ''} (ID: ${doctor.id})`);

        const result = await NotificationService.send({
            user: doctor,
            emailTemplate: 'account_verification',
            placeholders: {
                customer_name: `${doctor.firstName} ${doctor.lastName || ''}`.trim(),
                verification_link: verificationUrl,
                company_name: 'MediBulk'
            }
        });

        console.log(`✅ Doctor verification email result:`, result);

        res.json({
            success: true,
            message: 'Verification email resent successfully to doctor',
            sentTo: doctor.email
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

        let account = await User.findOne({
            where: { verificationToken: token, isDeleted: false, isVerified: true }
        });

        if (!account) {
            account = await Doctor.findOne({
                where: { verificationToken: token, isDeleted: false, isVerified: true }
            });
        }

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Invalid token or account not verified'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        account.password = hashedPassword;
        account.verificationToken = null; // Clear token after use
        await account.save();

        res.json({
            success: true,
            message: 'Password set successfully. You can now login.'
        });
    } catch (error) {
        next(error);
    }
};

// ... (existing getUsers, toggleUserStatus, logout functions)

// Login doctor specifically
exports.doctorLogin = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { phone, userName, identifier, password } = req.body;
        const identity = identifier || phone || userName;

        if (!identity) {
            return res.status(400).json({
                success: false,
                message: 'Phone or Username is required'
            });
        }

        // Try standalone doctor first
        let account = await Doctor.findOne({
            where: {
                [Op.or]: [{ phone: identity }, { userName: identity }],
                isDeleted: false
            }
        });

        let isStandalone = !!account;

        if (!account) {
            // Try via User table
            const user = await User.findOne({
                where: {
                    [Op.or]: [{ phone: identity }, { userName: identity }],
                    isDeleted: false
                },
                include: [
                    {
                        model: Role,
                        as: 'role',
                        attributes: ['id', 'name', 'displayName', 'level']
                    },
                    {
                        model: Doctor,
                        as: 'doctorProfile',
                        attributes: ['id', 'status', 'isVerified', 'isActive', 'isDeleted']
                    }
                ]
            });

            if (user && user.role.name === 'doctor' && user.doctorProfile) {
                account = user;
                account.isStandalone = false;
            }
        } else {
            account.isStandalone = true;
            // Add virtual role info for doctor
            const doctorRole = await Role.findOne({ where: { name: 'doctor' } });
            account.role = doctorRole || { id: 0, name: 'doctor', displayName: 'Doctor', level: 15 };
        }

        if (!account) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials or not a doctor account'
            });
        }

        // Status checks
        const isActive = isStandalone ? account.isActive : !account.isDisabled;
        if (!isActive || account.isDeleted) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        // ── Verify password ──────────────────────────────────────────────
        const isPasswordValid = await bcrypt.compare(password, account.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is verified (AFTER password check so we don't leak account existence)
        const isPrivileged = account.role?.level >= 50;
        if (!account.isVerified && !isPrivileged) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                isDoctor: true,
                message: 'Please verify your account. Check your email for the verification link.'
            });
        }

        // Determine how they authenticated
        const authenticatedBy = (phone || (identity && /^\d+$/.test(identity))) ? 'phone' : 'userName';

        const tokenPayload = {
            id: account.id,
            phone: account.phone,
            userName: account.userName,
            roleId: account.role.id,
            roleName: account.role.name,
            roleLevel: account.role.level,
            doctorId: isStandalone ? account.id : account.doctorProfile?.id,
            authenticatedBy,
            isDoctorAccount: true
        };

        // Check if 2FA is enabled
        if (account.twoFactorEnabled) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            account.twoFactorCode = code;
            account.twoFactorExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await account.save();

            await NotificationService.send({
                user: account,
                emailTemplate: 'two_factor_code',
                placeholders: {
                    customer_name: account.firstName,
                    verification_code: code,
                    expiry_time: '10 minutes',
                    company_name: 'MediBulk'
                }
            });

            return res.json({
                success: true,
                twoFactorRequired: true,
                isDoctorAccount: true,
                message: '2FA code sent to your email.'
            });
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        const refreshToken = jwt.sign(
            { id: account.id, phone: account.phone, roleId: account.role.id, authenticatedBy, isDoctorAccount: true },
            process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        const responseData = account.toJSON();
        delete responseData.password;
        responseData.authenticatedBy = authenticatedBy;
        responseData.isDoctorAccount = true;

        res.json({
            success: true,
            message: 'Doctor login successful',
            data: {
                user: responseData,
                token,
                accessToken: token, // For frontend compatibility
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Accept 'identifier' (generic), 'phone', or 'userName'
        const { phone, userName, identifier, password } = req.body;
        const identity = identifier || phone || userName;

        if (!identity || !password) {
            return res.status(400).json({
                success: false,
                message: 'Credentials are required'
            });
        }

        // Find user by phone OR userName with role
        let account = await User.findOne({
            where: {
                [Op.or]: [
                    { phone: identity },
                    { userName: identity }
                ],
                isDeleted: false
            },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'displayName', 'level']
            }]
        });

        let isDoctor = false;
        if (!account) {
            // Try searching in Doctors table
            account = await Doctor.findOne({
                where: {
                    [Op.or]: [
                        { phone: identity },
                        { userName: identity }
                    ],
                    isDeleted: false
                }
            });
            if (account) {
                isDoctor = true;
                // Add virtual role info for doctor
                const doctorRole = await Role.findOne({ where: { name: 'doctor' } });
                account.role = doctorRole || { id: 0, name: 'doctor', displayName: 'Doctor', level: 15 };
            }
        }

        if (!account) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is disabled/deleted
        const isDisabled = isDoctor ? !account.isActive : account.isDisabled;
        if (isDisabled || account.isDeleted) {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled or deleted. Please contact administrator.'
            });
        }

        // ── Verify password ──────────────────────────────────────────────
        const isPasswordValid = await bcrypt.compare(password, account.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is verified (AFTER password check so we don't leak account existence)
        const isPrivileged = account.role?.level >= 50;
        if (!account.isVerified && !isPrivileged) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                isDoctor: isDoctor,
                message: 'Please verify your account. Check your email for the verification link.'
            });
        }

        // Determine how they authenticated
        const authenticatedBy = (phone || (identity && /^\d+$/.test(identity))) ? 'phone' : 'userName';

        // Generate JWT token
        const tokenPayload = {
            id: account.id,
            phone: account.phone,
            userName: account.userName,
            roleId: account.role.id,
            roleName: account.role.name,
            roleLevel: account.role.level,
            authenticatedBy,
            isDoctorAccount: isDoctor
        };

        // Check if 2FA is enabled
        if (account.twoFactorEnabled) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            account.twoFactorCode = code;
            account.twoFactorExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await account.save();

            await NotificationService.send({
                user: account,
                emailTemplate: 'two_factor_code',
                placeholders: {
                    customer_name: account.firstName,
                    verification_code: code,
                    expiry_time: '10 minutes',
                    company_name: 'MediBulk'
                }
            });

            return res.json({
                success: true,
                twoFactorRequired: true,
                isDoctorAccount: isDoctor,
                message: '2FA code sent to your email.'
            });
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        // Generate refresh token
        const refreshToken = jwt.sign(
            { id: account.id, phone: account.phone, roleId: account.role.id, authenticatedBy, isDoctorAccount: isDoctor },
            process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Remove password from response
        const userResponse = account.toJSON();
        delete userResponse.password;
        userResponse.authenticatedBy = authenticatedBy;
        userResponse.isDoctorAccount = isDoctor;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token,
                accessToken: token, // For frontend compatibility
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.login = login;

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

        // Verify handle still exists and is active
        let account;
        if (decoded.isDoctorAccount) {
            account = await Doctor.findOne({
                where: { id: decoded.id, isDeleted: false, isActive: true }
            });
            if (account) {
                const doctorRole = await Role.findOne({ where: { name: 'doctor' } });
                account.role = doctorRole || { id: 0, name: 'doctor', displayName: 'Doctor', level: 15 };
            }
        } else {
            account = await User.findOne({
                where: { id: decoded.id, isDeleted: false, isDisabled: false },
                include: [{
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'displayName', 'level']
                }]
            });
        }

        if (!account) {
            return res.status(401).json({
                success: false,
                message: 'Account not found or disabled'
            });
        }

        // Generate new access token
        const newToken = jwt.sign(
            {
                id: account.id,
                phone: account.phone,
                userName: account.userName,
                roleId: account.role.id,
                roleName: account.role.name,
                roleLevel: account.role.level,
                authenticatedBy: decoded.authenticatedBy,
                isDoctorAccount: decoded.isDoctorAccount
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                accessToken: newToken, // For frontend compatibility
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
        const authenticatedBy = 'phone';
        const token = jwt.sign(
            {
                id: user.id,
                phone: user.phone,
                userName: user.userName,
                roleId: user.roleId,
                roleName: userRole.name,
                roleLevel: userRole.level,
                authenticatedBy
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;
        userResponse.authenticatedBy = authenticatedBy;

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

// Public Doctor Register
exports.publicRegisterDoctor = async (req, res, next) => {
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
            password,
            email,
            licenseNumber,
            hospitalClinic,
            specialization,
            clinicAddress
        } = req.body;

        // Check if user or doctor already exists
        const [existingUser, existingDoctor] = await Promise.all([
            User.findOne({ where: { [Op.or]: [{ phone }, { userName }] } }),
            Doctor.findOne({ where: { [Op.or]: [{ phone }, { userName }] } })
        ]);

        if (existingUser || existingDoctor) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'User or Doctor with this phone or username already exists'
            });
        }

        // Get doctor role
        const doctorRole = await Role.findOne({ where: { name: 'doctor' } });
        if (!doctorRole) {
            await t.rollback();
            return res.status(500).json({
                success: false,
                message: 'Doctor role configuration missing'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create doctor profile only
        const doctorProfile = await Doctor.create({
            firstName,
            lastName,
            userName,
            phone,
            email,
            password: hashedPassword,
            verificationToken,
            licenseNumber,
            hospitalClinic,
            specialization,
            address: clinicAddress,
            status: 'pending',
            isVerified: false
        }, { transaction: t });

        await t.commit();

        // Send verification link
        try {
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-doctor?token=${verificationToken}`;

            await NotificationService.send({
                user: doctorProfile,
                emailTemplate: 'account_verification',
                placeholders: {
                    customer_name: `${doctorProfile.firstName} ${doctorProfile.lastName || ''}`.trim(),
                    verification_link: verificationUrl,
                    company_name: 'MediBulk'
                }
            });

            // Alert admins
            await NotificationService.sendNewRegistrationAlertToAdmins(doctorProfile);
        } catch (error) {
            console.error('Failed to send verification email:', error.message);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            data: {
                doctorId: doctorProfile.id,
                userName: doctorProfile.userName
            }
        });

    } catch (error) {
        if (t) await t.rollback();
        next(error);
    }
};

// ... (rest of the file)
// 2FA Logic
exports.request2FAEnable = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isDoctor = req.user.isDoctorAccount;

        const account = isDoctor ? await Doctor.findByPk(userId) : await User.findByPk(userId);

        if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

        if (!account.email) {
            return res.status(400).json({ success: false, message: 'Email is required for 2FA. Please update your profile.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        account.twoFactorCode = code;
        account.twoFactorExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await account.save();

        await NotificationService.send({
            user: account,
            emailTemplate: 'two_factor_code',
            placeholders: {
                customer_name: account.firstName,
                verification_code: code,
                expiry_time: '10 minutes',
                company_name: 'MediBulk'
            }
        });

        res.json({ success: true, message: 'Verification code sent to your email.' });
    } catch (error) {
        next(error);
    }
};

exports.confirm2FAEnable = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isDoctor = req.user.isDoctorAccount;
        const { code } = req.body;

        const account = isDoctor ? await Doctor.findByPk(userId) : await User.findByPk(userId);

        if (account.twoFactorCode === code && account.twoFactorExpiresAt > new Date()) {
            account.twoFactorEnabled = true;
            account.twoFactorCode = null;
            account.twoFactorExpiresAt = null;
            await account.save();
            res.json({ success: true, message: '2FA enabled successfully.' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired code.' });
        }
    } catch (error) {
        next(error);
    }
};

exports.disable2FA = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isDoctor = req.user.isDoctorAccount;

        const account = isDoctor ? await Doctor.findByPk(userId) : await User.findByPk(userId);
        account.twoFactorEnabled = false;
        await account.save();

        res.json({ success: true, message: '2FA disabled successfully.' });
    } catch (error) {
        next(error);
    }
};

exports.verify2FALogin = async (req, res, next) => {
    try {
        const { identity, code, isDoctorAccount } = req.body;

        const account = isDoctorAccount
            ? await Doctor.findOne({ where: { [Op.or]: [{ phone: identity }, { userName: identity }] } })
            : await User.findOne({
                where: { [Op.or]: [{ phone: identity }, { userName: identity }] },
                include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'displayName', 'level'] }]
            });

        if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

        if (account.twoFactorCode === code && account.twoFactorExpiresAt > new Date()) {
            // Generate tokens
            const authenticatedBy = (identity && /^\d+$/.test(identity)) ? 'phone' : 'userName';

            const tokenPayload = {
                id: account.id,
                phone: account.phone,
                userName: account.userName,
                roleId: account.role?.id,
                roleName: account.role?.name,
                roleLevel: account.role?.level,
                authenticatedBy,
                isDoctorAccount
            };

            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
            const refreshToken = jwt.sign(
                { id: account.id, phone: account.phone, roleId: account.role?.id, authenticatedBy, isDoctorAccount },
                process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
                { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
            );

            account.twoFactorCode = null;
            account.twoFactorExpiresAt = null;
            await account.save();

            const userResponse = account.toJSON();
            delete userResponse.password;
            userResponse.authenticatedBy = authenticatedBy;
            userResponse.isDoctorAccount = isDoctorAccount;

            res.json({
                success: true,
                message: '2FA verification successful',
                data: {
                    user: userResponse,
                    token,
                    accessToken: token,
                    refreshToken
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired code.' });
        }
    } catch (error) {
        next(error);
    }
};

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
