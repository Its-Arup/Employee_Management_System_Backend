# Employee Management System - Backend API

A comprehensive employee management system backend built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- ✅ User Registration with Email OTP Verification
- ✅ JWT-based Authentication
- ✅ Role-based Access Control (Admin, HR, Manager, Employee)
- ✅ User Approval Workflow
- ✅ Audit Logging
- ✅ Rate Limiting
- ✅ Email Notifications

## 📋 Prerequisites

- Node.js >= 20.0.0
- MongoDB Atlas account or local MongoDB
- Gmail account (for email notifications)

## ⚙️ Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file (see Configuration section)
```

## 🔧 Configuration

Update your `.env` file with the following:

```env
# Server
PORT=8080
NODE_ENV=development

# Database
DB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

# Security
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key
IV=your_iv_key

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@employeemanagementsystem.com
EMAIL_FROM_NAME=Employee Management System

# Frontend
FRONTEND_URL=http://localhost:5173
```


## 🏃 Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start

# Run migrations
npm run migrate:email-verification
```

## 👤 User Registration & Login Flow

### Step 1: Register New User

**Endpoint:** `POST /api/users/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "displayName": "John Doe",
  "dateOfBirth": "1990-01-01",
  "phoneNumber": "+1234567890",
  "address": "123 Main St"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "userId": "65f1234567890abcdef12345",
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "status": "pending",
    "isEmailVerified": false
  }
}
```

**What happens:**
- User account created with status: `pending`
- 6-digit OTP generated (expires in 15 minutes)
- Verification email sent with OTP code

---

### Step 2: Verify Email with OTP

User receives email with 6-digit OTP code.

**Endpoint:** `POST /api/users/verify-email`

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully. Please wait for admin approval.",
  "data": {
    "userId": "65f1234567890abcdef12345",
    "email": "john@example.com",
    "isEmailVerified": true
  }
}
```

**What happens:**
- Email marked as verified
- Welcome email sent
- User status remains `pending` (needs admin approval)

---

### Step 3: Resend OTP (Optional)

If OTP expired or not received:

**Endpoint:** `POST /api/users/resend-verification`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": null
}
```

---

### Step 4: Admin Approval

Admin must approve the user before they can login.

**Endpoint:** `POST /api/users/:userId/approve`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "roles": ["employee"],
  "employeeId": "EMP001",
  "designation": "Software Engineer",
  "department": "IT",
  "joiningDate": "2026-02-05"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "userId": "65f1234567890abcdef12345",
    "status": "active",
    "roles": ["employee"],
    "employeeId": "EMP001"
  }
}
```

**What happens:**
- User status changed to `active`
- User can now login

---

### Step 5: Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65f1234567890abcdef12345",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "roles": ["employee"],
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Scenarios:**

❌ **Email not verified:**
```json
{
  "success": false,
  "message": "Please verify your email before logging in. Check your email for the verification link."
}
```

❌ **Account pending approval:**
```json
{
  "success": false,
  "message": "Your account is pending. Please wait for admin approval."
}
```

❌ **Invalid credentials:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

## 📊 User Status Flow

```
Registration → pending + email not verified
    ↓
Email Verification → pending + email verified
    ↓
Admin Approval → active + email verified
    ↓
Login ✅
```

## 🔐 Authentication

All protected routes require JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 👥 User Roles

- **employee**: Basic access
- **manager**: Team management
- **hr**: HR operations + User approval
- **admin**: Full system access

## 📡 API Endpoints

### Public Routes
- `POST /api/users/register` - Register new user
- `POST /api/users/verify-email` - Verify email with OTP
- `POST /api/users/resend-verification` - Resend OTP
- `POST /api/auth/login` - User login

### Authenticated Routes
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `PUT /api/users/change-password` - Change password

### Admin/HR Routes
- `GET /api/users` - Get all users (with filters)
- `GET /api/users/pending` - Get pending user requests
- `GET /api/users/:userId` - Get user by ID
- `POST /api/users/:userId/approve` - Approve user
- `POST /api/users/:userId/reject` - Reject user
- `PUT /api/users/:userId` - Update user
- `PUT /api/users/:userId/status` - Suspend/Activate user

### Admin Only Routes
- `PUT /api/users/:userId/roles` - Update user roles
- `DELETE /api/users/:userId` - Delete user

## 🧪 Testing with cURL

### Register User
```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "displayName": "John Doe"
  }'
```

### Verify Email
```bash
curl -X POST http://localhost:8080/api/users/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Get Profile (Authenticated)
```bash
curl -X GET http://localhost:8080/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format:check     # Check Prettier formatting
npm run format:fix       # Fix Prettier formatting
npm run migrate:dev      # Run migrations (development)
npm run migrate:prod     # Run migrations (production)
```

## 🗂️ Project Structure

```
Backend/
├── src/
│   ├── api/
│   │   ├── controller/     # Request handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   └── router/         # Route definitions
│   ├── config/            # Configuration files
│   ├── constant/          # Constants and enums
│   ├── model/             # Database models
│   ├── service/           # Business logic
│   ├── types/             # TypeScript types
│   ├── util/              # Utility functions
│   └── index.ts           # Application entry point
├── script/                # Migration scripts
├── .env                   # Environment variables
└── package.json
```

## 🛠️ Technologies

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (jsonwebtoken)
- **Email:** Nodemailer
- **Logging:** Winston
- **Validation:** Zod
- **Security:** Helmet, bcrypt, rate-limiter-flexible

## 📚 Additional Documentation

- [Email Verification Details](./EMAIL_VERIFICATION.md)
- [Quick Start Guide](./QUICK_START_EMAIL_VERIFICATION.md)

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Email verification with OTP
- ✅ Rate limiting on API endpoints
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation with Zod
- ✅ Audit logging for all actions

## 🐛 Troubleshooting

### Emails not sending
1. Check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD in .env
2. Verify Gmail App Password is correct (not regular password)
3. Check firewall/network settings
4. Review application logs

### MongoDB connection issues
1. Check DB_URL in .env
2. Verify IP whitelist in MongoDB Atlas
3. Ensure network access is configured

### OTP not working
1. Check OTP hasn't expired (15 minutes)
2. Verify email was received
3. Check database for user's OTP

## 📄 License

ISC

## 👨‍💻 Author

Its-Arup

---

**Base URL:** `http://localhost:8080`

**API Version:** 1.0.0
