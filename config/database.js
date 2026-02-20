const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
require('dotenv').config();

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        dialectModule: mysql2,
        logging: false,
        dialectOptions: {
            ssl: {
                rejectUnauthorized: false
            }
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'lms_db',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || 'DB_PASSWORD',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
            dialectModule: mysql2,
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            dialectOptions: {
                ssl: process.env.DB_SSL === 'true' ? {
                    rejectUnauthorized: false
                } : false,
                // Helpful for serverless environments to avoid handshake timeouts
                connectTimeout: 60000,
                keepAlive: true
            },
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            define: {
                timestamps: true,
                underscored: true,
                freezeTableName: false
            }
        }
    );

module.exports = { sequelize, Sequelize };
