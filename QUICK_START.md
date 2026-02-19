# Quick Start - Doctor Email Verification

## 🎯 Your System is Ready!

Everything is already configured and working. Here's how to use it:

---

## For Admins: Send Verification Email

### Step 1: Login to Admin Panel
1. Open browser: `http://localhost:3000/login`
2. Login with admin credentials

### Step 2: Navigate to Doctors
1. Click on **"Doctor Management"** in sidebar
2. OR go directly to: `http://localhost:3000/admin/doctors`

### Step 3: Resend Verification
1. Find the doctor in the list
2. Click the **⋮ (three dots)** button in the Actions column
3. Click **"📧 Resend Verification"**
4. Done! Email sent instantly

**Screenshot locations:**
```
Admin Panel
├── Sidebar
│   └── Doctor Management (Click here)
└── Doctors Table
    ├── Doctor Row
    │   └── Actions (⋮) → Dropdown Menu
    │       ├── View Details
    │       ├── Verify / Status
    │       ├── Update Credit Limit
    │       └── 📧 Resend Verification ← (Click here)
```

---

## For Doctors: Complete Verification

### Step 1: Check Email
- Doctor receives email at their registered email address
- Subject: "Welcome to MediBulk - Verify Your Account"

### Step 2: Click Verification Link
- Opens: `http://localhost:3000/verify-account?token=xxx`
- Account automatically verified
- Shows success message

### Step 3: Setup Password
- Automatically redirected to password setup
- Doctor creates their password
- Clicks "Setup Password" button

### Step 4: Login
- Navigate to: `http://localhost:3000/login`
- Enter credentials
- Start using the system!

---

## Requirements

### Backend (Server)
```bash
cd server
npm run dev
# Running on: http://localhost:3000
```

### Frontend (Client)
```bash
cd client
npm run dev
# Running on: http://localhost:3000
```

### Email (.env file)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

---

## Quick Test

### Test Email System:
```bash
cd server
node test_email.js
```

### Check Doctors in Database:
```bash
node check_doctors.js
```

### Full Integration Test:
```bash
node test_full_integration.js
```

---

## Common Scenarios

### ✅ New Doctor Registration
1. Admin creates doctor account
2. System sends verification email automatically
3. Doctor verifies and sets password
4. Doctor can login

### ✅ Resend Email (Doctor didn't receive)
1. Admin goes to Doctor Management
2. Finds the doctor
3. Clicks "Resend Verification"
4. New email sent with new link

### ✅ Email Expired
1. Admin resends verification
2. New token generated
3. Doctor uses new link

---

## That's It! 🎉

The system is fully functional and ready to use. No additional setup needed!

**Both backend and frontend** are already integrated and working together.
