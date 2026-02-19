const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-Commerce Medicine API',
            version: '2.0.0',
            description: 'A comprehensive B2B RESTful API for Bulk Medicine Sales. Features include Role-Based Access Control (RBAC), multi-tier audit logging, dynamic tax management, promotional engine, and integrated customer/doctor credit systems.',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001/api',
                description: 'Development server'
            }
        ],
        tags: [
            { name: 'Auth', description: 'Authentication and identity management' },
            { name: 'Users', description: 'User account and profile administration' },
            { name: 'Doctors', description: 'Specialized healthcare provider management and verification' },
            { name: 'Products', description: 'Medical catalog and inventory tracking' },
            { name: 'Categories', description: 'Classification and hierarchy of medical products' },
            { name: 'Agencies', description: 'Agency management for manufacturers (SPMC, SPC, etc.)' },
            { name: 'Cart', description: 'Real-time shopping cart and checkout preparation' },
            { name: 'Orders', description: 'Order lifecycle and fulfillment tracking' },
            { name: 'Payments', description: 'Financial transaction and invoice management' },
            { name: 'Taxes', description: 'Regional and category-based tax configuration' },
            { name: 'Discounts', description: 'Coupon and bulk discount logic' },
            { name: 'Promotions', description: 'Campaign and promotional offer management' },
            { name: 'Settings', description: 'Global system configuration and features' },
            { name: 'Audit Logs', description: 'System-wide activity and security audit trail' },
            { name: 'Health', description: 'System accessibility and performance monitoring' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token obtained from the Auth login endpoint'
                }
            },
            schemas: {
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        data: { type: 'object' }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation successful' },
                        data: { type: 'object' }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'array', items: { type: 'object' } },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        totalItems: { type: 'integer', example: 100 },
                        itemsPerPage: { type: 'integer', example: 20 },
                        currentPage: { type: 'integer', example: 1 },
                        totalPages: { type: 'integer', example: 5 },
                        hasNextPage: { type: 'boolean', example: true },
                        hasPrevPage: { type: 'boolean', example: false }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        sku: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        retailPrice: { type: 'number' },
                        wholesalePrice: { type: 'number' },
                        distributorPrice: { type: 'number' },
                        mrp: { type: 'number' },
                        costPrice: { type: 'number' },
                        stockQuantity: { type: 'integer' },
                        status: { type: 'string' },
                        images: { type: 'array', items: { type: 'string' } },
                        thumbnail: { type: 'string' }
                    }
                },
                CartItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        productId: { type: 'integer' },
                        quantity: { type: 'integer' },
                        price: { type: 'number' },
                        subtotal: { type: 'number' },
                        product: { $ref: '#/components/schemas/Product' }
                    }
                },
                Order: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        orderNumber: { type: 'string' },
                        totalAmount: { type: 'number' },
                        status: { type: 'string' },
                        paymentStatus: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                OrderItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        productId: { type: 'integer' },
                        quantity: { type: 'integer' },
                        price: { type: 'number' },
                        product: { $ref: '#/components/schemas/Product' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        role: { type: 'string' }
                    }
                },
                Tax: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        percentage: { type: 'number' }
                    }
                },
                Discount: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        value: { type: 'number' }
                    }
                },
                Promotion: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string' }
                    }
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        slug: { type: 'string' }
                    }
                },
                Agency: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        code: { type: 'string' }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        amount: { type: 'number' },
                        status: { type: 'string' }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid'
                },
                ForbiddenError: {
                    description: 'Insufficient permissions'
                },
                NotFoundError: {
                    description: 'The specified resource was not found'
                }
            },
            parameters: {
                PageParam: {
                    in: 'query',
                    name: 'page',
                    schema: { type: 'integer', default: 1 },
                    description: 'Page number'
                },
                LimitParam: {
                    in: 'query',
                    name: 'limit',
                    schema: { type: 'integer', default: 20 },
                    description: 'Items per page'
                },
                SearchParam: {
                    in: 'query',
                    name: 'search',
                    schema: { type: 'string' },
                    description: 'Search keyword'
                }
            }
        }
    },
    apis: ['./routes/**/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

const outputFile = path.join(__dirname, 'swagger-output.json');

try {
    fs.writeFileSync(outputFile, JSON.stringify(swaggerSpec, null, 2));
    console.log('✅ Swagger documentation (JSON) generated successfully at:', outputFile);
} catch (error) {
    console.error('❌ Error generating Swagger documentation:', error);
}
