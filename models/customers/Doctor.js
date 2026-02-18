const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Doctor = sequelize.define('Doctor', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            unique: true,
            comment: 'Reference to users table'
        },
        // Professional Info
        licenseNumber: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            field: 'license_number',
            comment: 'Medical license number'
        },
        licenseExpiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'license_expiry_date'
        },
        specialization: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        qualification: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Degrees and qualifications'
        },
        hospitalClinic: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'hospital_clinic',
            comment: 'Hospital or clinic name'
        },
        yearsOfExperience: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'years_of_experience'
        },
        // Contact Info
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: {
                isEmail: true
            }
        },
        secondaryPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'secondary_phone'
        },
        // Address
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        state: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        country: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        postalCode: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'postal_code'
        },
        // Business Info
        gstNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'gst_number',
            comment: 'Tax registration number'
        },
        panNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'pan_number'
        },
        // Credit & Billing
        creditLimit: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'credit_limit'
        },
        currentCredit: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'current_credit',
            comment: 'Current credit used'
        },
        paymentTerms: {
            type: DataTypes.INTEGER,
            defaultValue: 30,
            field: 'payment_terms',
            comment: 'Payment terms in days'
        },
        // Discount
        defaultDiscountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'default_discount_percentage',
            comment: 'Special discount for this doctor'
        },
        // License Photo
        licensePhoto: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'license_photo'
        },
        // Documents
        documents: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of document URLs (license, ID proof, etc.)'
        },
        profileImage: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'profile_image'
        },
        // Verification
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_verified'
        },
        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'verified_at'
        },
        verifiedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'verified_by'
        },
        verificationNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'verification_notes'
        },
        // Status
        status: {
            type: DataTypes.ENUM('pending', 'active', 'suspended', 'blocked'),
            defaultValue: 'pending'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        },
        // Notifications
        emailNotifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'email_notifications'
        },
        smsNotifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'sms_notifications'
        },
        // Notes
        internalNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'internal_notes',
            comment: 'Internal notes (not visible to doctor)'
        }
    }, {
        tableName: 'doctors',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'], unique: true },
            { fields: ['license_number'], unique: true },
            { fields: ['email'] },
            { fields: ['city'] },
            { fields: ['status'] },
            { fields: ['is_verified'] },
            { fields: ['is_active'] }
        ]
    });

    return Doctor;
};
