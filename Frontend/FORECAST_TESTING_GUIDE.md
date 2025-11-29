# 🧪 Demand Forecast API Testing Guide

## ✅ Fixes Applied

### Backend Changes:
1. ✅ Created `backend/routes/forecast.js` with all forecast endpoints
2. ✅ Added forecast routes to `backend/server.js`
3. ✅ Installed `multer` for file uploads
4. ✅ Added orchestrator endpoints (`/forecast/run`, `/forecast/latest`)

### Frontend Changes:
1. ✅ Updated `forecastEndpoints` to fallback to backend
2. ✅ Updated `orchestratorEndpoints` to use backend API
3. ✅ Fixed endpoint paths

## 🔄 Server Restart Required

**The backend server needs to be restarted** to load the new routes:

1. Stop the current backend server (Ctrl+C in the terminal)
2. Restart it:
   ```bash
   cd backend
   npm run dev
   ```

## 🧪 Testing Steps

### Step 1: Verify Backend Routes

After restarting, test the endpoints:

```bash
# Test 1: Health check
curl http://localhost:3000/health

# Test 2: Get forecast (requires auth token)
# First login to get token, then:
curl -X GET "http://localhost:3000/api/forecast/predict?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 2: Test in Browser

1. **Open** http://localhost:8000
2. **Login** as Hospital user:
   - Aadhaar: `987698769876`
   - Password: `hospital123`
3. **Navigate** to Demand Forecast page
4. **Test Features**:
   - ✅ View forecast chart (should show data)
   - ✅ Change forecast days (should update)
   - ✅ Click "Run Forecast" (should work)
   - ✅ Upload CSV file (should work)
   - ✅ Click "Train Model" (should work)

### Step 3: Check Browser Console

Open browser DevTools (F12) and check:
- ✅ No CORS errors
- ✅ No 404 errors for forecast endpoints
- ✅ API calls returning data
- ✅ Success messages for actions

## 🐛 Troubleshooting

### Issue: "Route not found"
**Solution**: Backend server needs restart

### Issue: "401 Unauthorized"
**Solution**: Make sure you're logged in as hospital or superadmin

### Issue: "CORS error"
**Solution**: Check `ALLOWED_ORIGINS` in `.env` includes `http://localhost:8000`

### Issue: "Forecast data not showing"
**Solution**: 
1. Check browser console for errors
2. Verify backend is running on port 3000
3. Check network tab to see API responses

## 📊 Expected Behavior

### Forecast Page Should:
- ✅ Show forecast chart with data immediately
- ✅ Display forecast summary (average, peak day, total)
- ✅ Allow changing forecast days
- ✅ "Run Forecast" button should work
- ✅ File upload should accept CSV files
- ✅ "Train Model" should show success message

### API Responses Should:
- ✅ Return array of forecast data objects
- ✅ Each object has: `date`, `predicted`, `upper_bound`, `lower_bound`
- ✅ Dates are in ISO format (YYYY-MM-DD)
- ✅ Numbers are integers

## ✅ Success Criteria

- [ ] Backend server restarted
- [ ] Forecast page loads without errors
- [ ] Chart displays forecast data
- [ ] "Run Forecast" button works
- [ ] File upload works
- [ ] No console errors
- [ ] All API calls return data

---

**Status**: Ready for testing after server restart


