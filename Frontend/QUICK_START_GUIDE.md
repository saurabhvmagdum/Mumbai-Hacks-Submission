# 🚀 Quick Start Guide - Swasthya Application

## ✅ Application Status

Both servers are **RUNNING**:

- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:8000

---

## 🌐 Access the Application

**Open your browser and navigate to**: http://localhost:8000

---

## 🔐 Test Credentials

| Role | Aadhaar Number | Password |
|------|----------------|----------|
| **Patient** | 123412341234 | patient123 |
| **Hospital** | 987698769876 | hospital123 |
| **Super Admin** | 111122223333 | admin123 |

---

## 📋 Quick Test Steps

1. **Open** http://localhost:8000 in your browser
2. **Click** "Login" button
3. **Enter** test credentials (e.g., Patient: `123412341234` / `patient123`)
4. **Verify** you see the role-based dashboard
5. **Test** different features:
   - Patient Dashboard (view records)
   - Hospital Dashboard (manage patients)
   - Admin Dashboard (system overview)

---

## 🔒 Security Features Active

✅ **Rate Limiting** - 5 login attempts per 15 minutes  
✅ **CORS Protection** - Only allowed origins  
✅ **Security Headers** - Helmet middleware active  
✅ **Input Sanitization** - All inputs sanitized  
✅ **Log Sanitization** - Sensitive data redacted  
✅ **Environment Validation** - Required vars checked  

---

## 🛠️ If Servers Are Not Running

### Start Backend:
```bash
cd backend
npm run dev
```

### Start Frontend:
```bash
cd frontend
npm run dev
```

---

## ⚠️ Important Notes

1. **Backend requires `.env` file** - Should be created automatically
2. **Database must be running** - PostgreSQL on localhost:5432
3. **Ports must be available** - 3000 (backend) and 8000 (frontend)

---

## 🐛 Troubleshooting

### Backend won't start:
- Check if `.env` file exists in `backend/` directory
- Verify PostgreSQL is running
- Check console for error messages

### Frontend won't connect:
- Verify backend is running on port 3000
- Check browser console for CORS errors
- Ensure `ALLOWED_ORIGINS` includes `http://localhost:8000`

### Database errors:
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Run `npm run init-db` to initialize database

---

## 📊 Server Status

- ✅ Backend: Running on port 3000
- ✅ Frontend: Running on port 8000
- ✅ Security: All critical fixes applied
- ✅ Environment: Validated

**Status**: 🟢 **READY TO USE**

---

**Enjoy using Swasthya Health Intelligence Network!** 🏥

