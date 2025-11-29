# Automated Test, Verify, and Fix Loop System

## Overview

This system provides comprehensive automated testing that:
1. Tests all API endpoints (backend routes)
2. Tests all UI flows (frontend pages/components)
3. Automatically detects and fixes issues
4. Repeats until all tests pass or max iterations reached

## Quick Start

```bash
# Install dependencies
cd Swasthya-India-s-Decentralized-Health-Intelligence-Network
npm install

# Install backend test dependencies
cd backend
npm install

# Install frontend test dependencies
cd ../frontend
npm install

# Run automated test and fix loop
cd ..
npm run test:auto-fix
```

## Features

### Test Suites

1. **API Test Suite** (`backend/tests/api-test-suite.js`)
   - Tests all backend API endpoints
   - Validates authentication, authorization, validation
   - Checks response formats and error handling

2. **UI Test Suite** (`frontend/tests/ui-test-suite.js`)
   - Tests all UI flows via API calls
   - Validates login, dashboard, and feature pages
   - Checks error handling and data display

3. **Integration Test Suite** (`tests/integration-test-suite.js`)
   - Tests end-to-end user journeys
   - Validates data flow from frontend to backend
   - Checks error propagation and authentication flow

### Auto-Fix Capabilities

The system can automatically fix:
- ✅ Missing routes (creates route files)
- ✅ Missing authentication middleware
- ✅ Missing authorization middleware
- ✅ Missing request validation
- ✅ Missing error handling
- ✅ CORS configuration issues

### Issue Detection

Automatically detects and classifies:
- Missing routes (404 errors)
- Authentication issues (401 errors)
- Authorization issues (403 errors)
- Validation errors (400 errors)
- Response format issues
- Server errors (500+)
- CORS issues
- Type mismatches

## Configuration

Edit `tests/test-config.js` to customize:

```javascript
{
  maxIterations: 10,           // Max iterations before stopping
  testTimeout: 30000,           // Timeout per test suite (ms)
  backendUrl: 'http://localhost:3000',
  frontendUrl: 'http://localhost:8000',
  suites: {
    api: true,
    ui: true,
    integration: true
  },
  autoFix: {
    enabled: true,
    fixMissingRoutes: true,
    fixMissingMiddleware: true,
    // ... more options
  }
}
```

## Usage Examples

### Run all tests with auto-fix
```bash
npm run test:auto-fix
```

### Run with custom max iterations
```bash
npm run test:auto-fix -- --max-iterations 20
```

### Run specific test suite
```bash
npm run test:api           # API tests only
npm run test:ui            # UI tests only
npm run test:integration   # Integration tests only
```

### Disable auto-fix
```bash
npm run test:auto-fix -- --no-fix
```

## Test Reports

Reports are generated in `test-reports/` directory:

- **JSON Format** (default): `test-report-{timestamp}.json`
- **HTML Format**: `test-report-{timestamp}.html` (if configured)
- **Text Format**: `test-report-{timestamp}.txt` (if configured)

## How It Works

1. **Test Execution**: Runs all configured test suites
2. **Issue Detection**: Analyzes failures and classifies issues by type
3. **Auto-Fix**: Applies fixes for fixable issues automatically
4. **Verification**: Verifies that fixes were applied correctly
5. **Re-test**: Runs tests again to check if issues are resolved
6. **Repeat**: Continues loop until all tests pass or max iterations reached

## Files Created

### Test Infrastructure
- `tests/test-config.js` - Configuration
- `tests/test-logger.js` - Logging system
- `tests/test-runner.js` - Main test runner

### Test Suites
- `backend/tests/api-test-suite.js` - API tests
- `frontend/tests/ui-test-suite.js` - UI tests
- `tests/integration-test-suite.js` - Integration tests

### Auto-Fix System
- `tests/issue-detector.js` - Issue detection
- `tests/auto-fix-engine.js` - Auto-fix engine
- `tests/fix-verifier.js` - Fix verification

### Reporting
- `tests/report-generator.js` - Report generation

## Dependencies

### Root Package
- `axios` - HTTP client
- `chai` - Assertions
- `mocha` - Test framework
- `supertest` - API testing

### Backend Package
- `supertest` - API testing
- `mocha` - Test framework
- `chai` - Assertions

### Frontend Package
- `@testing-library/react` - React testing
- `@testing-library/jest-dom` - DOM matchers
- `playwright` - Browser automation (optional)

## Troubleshooting

### Server Not Running
The test system expects the backend server to be running. Start it first:
```bash
cd backend
npm run dev
```

### Import Errors
If you see import errors, ensure all dependencies are installed:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Test Timeouts
Increase timeout in `tests/test-config.js`:
```javascript
testTimeout: 60000  // 60 seconds
```

## Success Criteria

The system is successful when:
- ✅ All API endpoints tested and passing
- ✅ All UI flows tested and passing
- ✅ Auto-fix system resolves common issues
- ✅ Test loop completes successfully
- ✅ Detailed reports generated

## Next Steps

1. Run the automated test system: `npm run test:auto-fix`
2. Review generated reports in `test-reports/`
3. Manually review any issues that couldn't be auto-fixed
4. Iterate until all tests pass

---

**The automated test, verify, and fix loop system is now ready to use!** 🎉


