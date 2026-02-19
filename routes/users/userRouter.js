const express = require('express');
const router = express.Router();
const { userController } = require('../../controllers');
const { body } = require('express-validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - phone
 *         - password
 *       properties:
 *         phone:
 *           type: string
 *           description: User phone number (10-11 digits)
 *           example: "1234567890"
 *         password:
 *           type: string
 *           format: password
 *           description: User password
 *           example: "password123"
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *             token:
 *               type: string
 *             refreshToken:
 *               type: string
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token
 */

const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { userValidators, doctorValidators, queryValidators } = require('../../validators');

// Validation rules — accept identifier (generic), phone, or userName
const loginValidation = [
    body('identifier').optional().trim(),
    body('phone').optional().trim(),
    body('userName').optional().trim(),
    body('password').notEmpty().withMessage('Password is required'),
    body().custom((body) => {
        if (!body.identifier && !body.phone && !body.userName) {
            throw new Error('Phone or username is required');
        }
        return true;
    })
];

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled or deleted
 */
router.post('/login', loginValidation, userController.login);

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: User registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - phone
 *               - userName
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               userName:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/register', userValidators.register, userController.register);

/**
 * @swagger
 * /users/register-doctor:
 *   post:
 *     summary: Public doctor registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, phone, userName, password, licenseNumber]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               userName: { type: string }
 *               password: { type: string }
 *               licenseNumber: { type: string }
 *               hospitalClinic: { type: string }
 *               specialization: { type: string }
 *               clinicAddress: { type: string }
 *     responses:
 *       201:
 *         description: Doctor registered successfully
 */
router.post('/register-doctor', doctorValidators.publicRegister, userController.publicRegisterDoctor);

/**
 * @swagger
 * /users/resend-verification:
 *   post:
 *     summary: Public resend verification email (no auth required)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier: { type: string, description: Phone or username }
 *               isDoctor: { type: boolean, description: Whether the account is a doctor }
 *     responses:
 *       200: { description: Email sent if account exists }
 */
router.post('/resend-verification', userController.publicResendVerification);


/**
 * @swagger
 * /users/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', userController.refreshToken);

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     description: Client should discard tokens after calling this endpoint
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', userController.logout);

// Admin routes
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/',
    authenticateToken,
    requirePermission('users', 'read'),
    queryValidators.pagination,
    userController.getUsers
);

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Toggle user status (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User status toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.patch('/:id/status',
    authenticateToken,
    requirePermission('users', 'update'),
    userController.toggleUserStatus
);

/**
 * @swagger
 * /users/admin/create-user:
 *   post:
 *     summary: Create user/doctor (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, userName, phone, roleId]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               userName: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               roleId: { type: integer }
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/admin/create-user',
    authenticateToken,
    requirePermission('users', 'create'),
    [
        body('firstName').notEmpty().withMessage('First name is required'),
        body('userName').notEmpty().withMessage('Username is required'),
        body('phone').notEmpty().withMessage('Phone is required'),
        body('email').optional().isEmail().withMessage('Invalid email format'),
        body().custom((body) => {
            if (!body.roleId && !body.roleName) {
                throw new Error('Role ID or Role Name is required');
            }
            return true;
        })
    ],
    userController.adminCreateUser
);

/**
 * @swagger
 * /users/admin/resend-verification:
 *   post:
 *     summary: Resend verification email for a USER (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id: { type: integer, description: User ID }
 */
router.post('/admin/resend-verification',
    authenticateToken,
    requirePermission('users', 'update'),
    userController.resendVerification
);

/**
 * @swagger
 * /users/admin/resend-doctor-verification:
 *   post:
 *     summary: Resend verification email for a DOCTOR (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id: { type: integer, description: Doctor ID }
 */
router.post('/admin/resend-doctor-verification',
    authenticateToken,
    requirePermission('users', 'update'),
    userController.resendDoctorVerification
);

/**
 * @swagger
 * /users/verify:
 *   get:
 *     summary: User account verification
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account verified
 */
router.get('/verify', userController.verifyUserAccount);

/**
 * @swagger
 * /users/verify-doctor:
 *   get:
 *     summary: Doctor account verification
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor account verified
 */
router.get('/verify-doctor', userController.verifyDoctorAccount);

/**
 * @swagger
 * /users/setup-password:
 *   post:
 *     summary: Setup password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password set successfully
 */
router.post('/setup-password',
    [
        body('token').notEmpty().withMessage('Token is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ],
    userController.setupPassword
);

// 2FA Routes
router.post('/2fa/request-enable', authenticateToken, userController.request2FAEnable);
router.post('/2fa/confirm-enable', authenticateToken, userController.confirm2FAEnable);
router.post('/2fa/disable', authenticateToken, userController.disable2FA);
router.post('/2fa/verify-login', userController.verify2FALogin);

module.exports = router;
