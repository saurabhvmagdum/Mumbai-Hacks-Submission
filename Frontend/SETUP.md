# Swasthya Complete Setup Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Step 1: Database Setup

1. Install PostgreSQL if not already installed

2. Create database:
```sql
CREATE DATABASE swasthya_db;
```

3. Note your PostgreSQL credentials (host, port, user, password)

## Step 2: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` with your database credentials:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swasthya_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

5. Initialize database:
```bash
npm run init-db
```

This will:
- Create all tables
- Create default users (see below)

6. Start backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:3000`

## Step 3: Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional, defaults work):
```bash
VITE_API_URL=http://localhost:3000
```

4. Start frontend:
```bash
npm run dev
```

Frontend will run on `http://localhost:8000` (or port shown in terminal)

## Step 4: Access the Application

1. Open browser: `http://localhost:8000`

2. You'll see the cover page with Login/Register buttons

3. Use test credentials to login:

### Test Credentials

**Patient:**
- Aadhaar: `123412341234`
- Password: `patient123`
- Access: Patient dashboard only

**Hospital:**
- Aadhaar: `987698769876`
- Password: `hospital123`
- Access: All hospital management pages

**Super Admin:**
- Aadhaar: `111122223333`
- Password: `admin123`
- Access: Full system access, scheduling module

## Features

### Authentication
- ✅ Aadhaar number validation (exactly 12 digits)
- ✅ Password validation (minimum 6 characters)
- ✅ JWT token-based authentication
- ✅ Role-based access control

### Role-Based Access

**Patient:**
- Can view own medical records
- Cannot access hospital pages
- Cannot see other patients' data

**Hospital:**
- Can access all hospital management pages
- Can view multiple patient records
- Cannot access superadmin scheduling

**Super Admin:**
- Can view all hospitals
- Can manage hospital assignments
- Can access scheduling module
- Full system access

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify credentials in `.env`
- Ensure database `swasthya_db` exists

### Port Already in Use
- Change `PORT` in backend `.env`
- Update `VITE_API_URL` in frontend `.env`

### Authentication Errors
- Check JWT_SECRET matches
- Verify token is being sent in headers
- Check token expiration

## Project Structure

```
Swasthya-India-s-Decentralized-Health-Intelligence-Network/
├── backend/
│   ├── config/          # Database configuration
│   ├── database/        # SQL schemas
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   ├── scripts/         # Database init script
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # Auth & Theme contexts
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
│   └── ...
└── SETUP.md            # This file
```

## Next Steps

1. Test all three user roles
2. Create new users via registration
3. Explore role-specific dashboards
4. Test route protection

