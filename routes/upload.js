const express = require('express');
const router = express.Router();
const { uploadMultiple, uploadSingle, deleteImage, getPublicIdFromUrl, uploadToCloudinary, uploadMultipleToCloudinary } = require('../config/cloudinary');
const { authenticateToken, requireAdminOrAbove } = require('../middleware/auth');

/**
 * @route   POST /api/upload/product-images
 * @desc    Upload multiple product images (up to 8)
 * @access  Private (Admin and Super Admin)
 */
router.post('/product-images', requireAdminOrAbove, uploadMultiple, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }

        // Upload all files to Cloudinary
        const cloudinaryResults = await uploadMultipleToCloudinary(req.files);
        const imageUrls = cloudinaryResults.map(result => result.secure_url);

        res.json({
            success: true,
            message: `${req.files.length} image(s) uploaded successfully`,
            data: {
                images: imageUrls,
                count: req.files.length
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload images',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/upload/product-image
 * @desc    Upload single product image
 * @access  Private (Admin and Super Admin)
 */
router.post('/product-image', requireAdminOrAbove, uploadSingle, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded'
            });
        }

        // Upload to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: cloudinaryResult.secure_url,
                publicId: cloudinaryResult.public_id
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/upload/image
 * @desc    Delete image from Cloudinary
 * @access  Private (Admin and Super Admin)
 */
router.delete('/image', requireAdminOrAbove, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }

        const publicId = getPublicIdFromUrl(url);
        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image URL'
            });
        }

        await deleteImage(publicId);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image',
            error: error.message
        });
    }
});

module.exports = router;
