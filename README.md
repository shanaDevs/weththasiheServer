# User Login API

Simple User Login API with JWT Authentication built with Node.js, Express, and MySQL.

## Features

- User login with JWT authentication
- Token refresh functionality
- Role-based user management
- Secure password hashing with bcrypt
- MySQL database with Sequelize ORM

## API Endpoints

### POST /api/users/login
Login with phone and password

**Request Body:**
```json
{
  "phone": "1234567890",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### POST /api/users/refresh-token
Refresh access token

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token"
}
```

### POST /api/users/logout
Logout (client-side token removal)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
```

3. Run the server:
```bash
npm start
# or for development
npm run dev
```

## Database

The application will automatically create the necessary tables:
- `users` - User accounts
- `roles` - User roles

Default admin user will be created on first run.
