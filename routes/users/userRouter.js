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
const { userValidators, queryValidators } = require('../../validators');

// Validation rules
const loginValidation = [
    body('phone').trim().isLength({ min: 9, max: 11 }).withMessage('Phone number must be 9-11 characters').matches(/^\d+$/).withMessage('Phone number must contain only digits'),
    body('password').notEmpty().withMessage('Password is required')
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
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
    requirePermission('manage_users'),
    [
        body('firstName').notEmpty().withMessage('First name is required'),
        body('lastName').notEmpty().withMessage('Last name is required'),
        body('userName').notEmpty().withMessage('Username is required'),
        body('phone').notEmpty().withMessage('Phone is required'),
        body('roleId').notEmpty().withMessage('Role ID is required')
    ],
    userController.adminCreateUser
);

/**
 * @swagger
 * /users/verify:
 *   get:
 *     summary: Account verification
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
router.get('/verify', userController.verifyAccount);

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

module.exports = router;
