const express = require('express');
const router = express.Router();
const doctorController = require('../../controllers/customers/doctorController');
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { doctorValidators, addressValidators, queryValidators } = require('../../validators');

/**
 * @swagger
 * /doctors/me:
 *   get:
 *     summary: Get current doctor profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Doctor profile }
 */
router.get('/me', authenticateToken, doctorController.getMyProfile);

/**
 * @swagger
 * /doctors/register:
 *   post:
 *     summary: Register as doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [licenseNumber, clinicName, clinicAddress]
 *             properties:
 *               licenseNumber: { type: string }
 *               specialization: { type: string }
 *               clinicName: { type: string }
 *               clinicAddress: { type: string }
 *     responses:
 *       201: { description: Registered successfully }
 */
router.post('/register',
    authenticateToken,
    doctorValidators.register,
    doctorController.register
);

/**
 * @swagger
 * /doctors/me:
 *   put:
 *     summary: Update doctor profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clinicName: { type: string }
 *               clinicAddress: { type: string }
 *               specialization: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
router.put('/me',
    authenticateToken,
    doctorController.updateProfile
);

/**
 * @swagger
 * /doctors/credit:
 *   get:
 *     summary: Get credit summary
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Credit summary }
 */
router.get('/credit', authenticateToken, doctorController.getCreditSummary);

/**
 * @swagger
 * /doctors/addresses:
 *   get:
 *     summary: Get my addresses
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of addresses }
 */
router.get('/addresses', authenticateToken, doctorController.getAddresses);

/**
 * @swagger
 * /doctors/addresses:
 *   post:
 *     summary: Add address
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, addressLine1, city, state, postalCode]
 *             properties:
 *               type: { type: string, enum: [shipping, billing] }
 *               addressLine1: { type: string }
 *               addressLine2: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               postalCode: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201: { description: Address added }
 */
router.post('/addresses',
    authenticateToken,
    addressValidators.create,
    doctorController.addAddress
);

/**
 * @swagger
 * /doctors/addresses/{id}:
 *   put:
 *     summary: Update address
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Address updated }
 */
router.put('/addresses/:id',
    authenticateToken,
    addressValidators.update,
    doctorController.updateAddress
);

/**
 * @swagger
 * /doctors/addresses/{id}:
 *   delete:
 *     summary: Delete address
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Address deleted }
 */
router.delete('/addresses/:id',
    authenticateToken,
    doctorController.deleteAddress
);

// Admin routes

/**
 * @swagger
 * /doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of doctors }
 */
router.get('/',
    authenticateToken,
    requirePermission('doctors', 'read'),
    queryValidators.pagination,
    doctorController.getAllDoctors
);

/**
 * @swagger
 * /doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Doctor details }
 */
router.get('/:id',
    authenticateToken,
    requirePermission('doctors', 'read'),
    doctorController.getDoctor
);

/**
 * @swagger
 * /doctors/{id}/verify:
 *   post:
 *     summary: Verify doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isVerified]
 *             properties:
 *               isVerified: { type: boolean }
 *               creditLimit: { type: number }
 *     responses:
 *       200: { description: Doctor verified }
 */
router.post('/:id/verify',
    authenticateToken,
    requirePermission('doctors', 'update'),
    doctorValidators.verify,
    doctorController.verifyDoctor
);

/**
 * @swagger
 * /doctors/{id}/credit-limit:
 *   patch:
 *     summary: Update doctor credit limit
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [creditLimit]
 *             properties:
 *               creditLimit: { type: number }
 *     responses:
 *       200: { description: Credit limit updated }
 */
router.patch('/:id/credit-limit',
    authenticateToken,
    requirePermission('doctors', 'update'),
    doctorController.updateCreditLimit
);

module.exports = router;
