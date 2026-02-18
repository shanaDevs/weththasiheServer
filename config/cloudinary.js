const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage for multer (files stored in buffer)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedFormats.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, PNG and WEBP are allowed.'), false);
        }
    }
});

/**
 * Upload buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, folder = 'medipharm/products') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                transformation: [{ width: 800, height: 800, crop: 'limit' }]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Multer middleware for single image
 */
exports.uploadSingle = upload.single('image');

/**
 * Multer middleware for multiple images (up to 8)
 */
exports.uploadMultiple = upload.array('images', 8);

/**
 * Upload single file buffer to Cloudinary
 */
exports.uploadToCloudinary = uploadToCloudinary;

/**
 * Upload multiple file buffers to Cloudinary
 */
exports.uploadMultipleToCloudinary = async (files, folder = 'medipharm/products') => {
    const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));
    return Promise.all(uploadPromises);
};

/**
 * Delete image from Cloudinary
 */
exports.deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

/**
 * Extract public ID from Cloudinary URL
 */
exports.getPublicIdFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    return `medipharm/products/${publicId}`;
};

module.exports.cloudinary = cloudinary;
