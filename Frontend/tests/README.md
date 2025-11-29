# Automated Test, Verify, and Fix Loop

This directory contains the automated testing system that tests all API endpoints and UI flows, automatically fixes issues, and repeats until all tests pass or max iterations are reached.

## Structure

- `test-config.js` - Configuration for test runner
- `test-logger.js` - Logging system for test activities
- `test-runner.js` - Main test runner with loop logic
- `issue-detector.js` - Issue detection and classification
- `auto-fix-engine.js` - Automatic fix application
- `fix-verifier.js` - Verification of applied fixes
- `report-generator.js` - Test report generation
- `integration-test-suite.js` - Integration tests

## Usage

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
npm run test:api      # API tests only
npm run test:ui       # UI tests only
npm run test:integration  # Integration tests only
```

### Disable auto-fix
```bash
npm run test:auto-fix -- --no-fix
```

## Configuration

Edit `test-config.js` to customize:
- Max iterations
- Test timeouts
- Server URLs
- Test credentials
- Auto-fix settings
- Report format

## Reports

Test reports are generated in `test-reports/` directory:
- JSON format (default)
- HTML format (if configured)
- Text format (if configured)

## How It Works

1. **Test Execution**: Runs all test suites (API, UI, Integration)
2. **Issue Detection**: Analyzes failures and classifies issues
3. **Auto-Fix**: Applies fixes for fixable issues
4. **Verification**: Verifies that fixes were applied correctly
5. **Re-test**: Runs tests again to check if issues are resolved
6. **Repeat**: Continues until all tests pass or max iterations reached

## Fixable Issues

The system can automatically fix:
- Missing routes
- Missing authentication middleware
- Missing authorization middleware
- Missing request validation
- Missing error handling
- CORS configuration issues

## Manual Review Required

Some issues require manual review:
- Type mismatches
- Complex response format issues
- Connection issues (server not running)
- Unknown error types


