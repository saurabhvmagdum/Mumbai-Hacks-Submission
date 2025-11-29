# Swasthya Backend API

Backend API for Swasthya Health Intelligence Network with authentication and role-based access control.

## Features

- JWT-based authentication
- Aadhaar number validation (12 digits)
- Role-based access control (Patient, Hospital, Super Admin)
- PostgreSQL database
- Password hashing with bcrypt
- Protected routes with middleware

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swasthya_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

4. Create database:
```sql
CREATE DATABASE swasthya_db;
```

5. Initialize database:
```bash
npm run init-db
```

## Running

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Dashboards

- `GET /api/dashboard/patient` - Patient dashboard (patient role)
- `GET /api/dashboard/hospital` - Hospital dashboard (hospital role)
- `GET /api/dashboard/admin` - Admin dashboard (superadmin role)

### Scheduling (Super Admin only)

- `GET /api/scheduling/hospitals` - Get all hospitals
- `POST /api/scheduling/assign` - Assign hospital
- `GET /api/scheduling/assignments` - Get assignments
- `GET /api/scheduling/hospital/:id` - Get hospital details

## Default Users

After running `npm run init-db`, these users are created:

- **Patient**: Aadhaar: `123412341234`, Password: `patient123`
- **Hospital**: Aadhaar: `987698769876`, Password: `hospital123`
- **Super Admin**: Aadhaar: `111122223333`, Password: `admin123`

## Database Schema

See `database/schema.sql` for complete schema.

## Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

