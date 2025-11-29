# 🚀 Quick Start Guide

## Prerequisites Check

- ✅ Node.js 18+ installed
- ✅ PostgreSQL installed and running
- ✅ npm installed

## Quick Setup (5 minutes)

### 1. Database Setup

```bash
# Create database
psql -U postgres
CREATE DATABASE swasthya_db;
\q
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL password
npm run init-db
npm run dev
```

Backend runs on: `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:8000`

## Test Credentials

| Role | Aadhaar | Password |
|------|---------|----------|
| Patient | 123412341234 | patient123 |
| Hospital | 987698769876 | hospital123 |
| Super Admin | 111122223333 | admin123 |

## Testing Flow

1. **Open** `http://localhost:8000`
2. **Click** "Login" button
3. **Enter** test credentials (e.g., Patient)
4. **Verify** role-based dashboard appears
5. **Test** logout and try different roles

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -U postgres -l | grep swasthya_db`
- Check `.env` file has correct credentials

**Frontend won't connect:**
- Verify backend is running on port 3000
- Check browser console for errors
- Verify CORS is enabled in backend

**Database errors:**
- Run `npm run init-db` again
- Check PostgreSQL logs
- Verify user has CREATE TABLE permissions

## Next Steps

- Register new users
- Test role-based access
- Explore dashboards
- Check route protection

