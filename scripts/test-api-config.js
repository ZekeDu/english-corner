#!/usr/bin/env node

/**
 * Comprehensive API Configuration Module Test Runner
 * 
 * This script runs all tests for the API configuration module
 * including unit tests, integration tests, and E2E tests.
 */

import { execSync } from 'child_process';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.bright}${colors.cyan}▶ ${description}${colors.reset}`);
  log(`${colors.dim}${command}${colors.reset}`);
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    log(`${colors.green}✓ ${description} completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}✗ ${description} failed${colors.reset}`, colors.red);
    return false;
  }
}

function runTests() {
  log(`${colors.bright}${colors.magenta}🔍 API Configuration Module Test Suite${colors.reset}`, colors.magenta);
  log(`${colors.dim}Testing all aspects of the new API configuration functionality${colors.reset}`);

  const testResults = [];

  // 1. Unit Tests
  log(`\n${colors.bright}${colors.blue}📊 Phase 1: Unit Tests${colors.reset}`, colors.blue);
  
  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/api-config.test.ts',
    'API Configuration Service Unit Tests'
  ));

  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/api-validator.test.ts',
    'API Validator Service Unit Tests'
  ));

  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/security.test.ts',
    'Security and Encryption Tests'
  ));

  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/ai-integration.test.ts',
    'AI Service Integration Tests'
  ));

  testResults.push(runCommand(
    'npm test -- src/app/api/user/api-config/__tests__/route.test.ts',
    'API Route Unit Tests'
  ));

  // 2. Integration Tests
  log(`\n${colors.bright}${colors.blue}🔗 Phase 2: Integration Tests${colors.reset}`, colors.blue);
  
  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/ai-integration.test.ts --testNamePattern="User API Configuration Priority"',
    'AI Service Priority Tests'
  ));

  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/ai-integration.test.ts --testNamePattern="Provider-Specific API Calls"',
    'Provider Integration Tests'
  ));

  // 3. Fallback Behavior Tests
  log(`\n${colors.bright}${colors.blue}🔄 Phase 3: Fallback Behavior Tests${colors.reset}`, colors.blue);
  
  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/ai-integration.test.ts --testNamePattern="fallback"',
    'Fallback Behavior Tests'
  ));

  // 4. Error Handling Tests
  log(`\n${colors.bright}${colors.blue}⚠️  Phase 4: Error Handling Tests${colors.reset}`, colors.blue);
  
  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/api-validator.test.ts --testNamePattern="handle"',
    'Error Handling Tests'
  ));

  testResults.push(runCommand(
    'npm test -- src/lib/__tests__/ai-integration.test.ts --testNamePattern="Error Handling and Retry Logic"',
    'Retry Logic Tests'
  ));

  // 5. E2E Tests (if environment supports)
  if (process.env.RUN_E2E_TESTS !== 'false') {
    log(`\n${colors.bright}${colors.blue}🎯 Phase 5: E2E Tests${colors.reset}`, colors.blue);
    
    try {
      testResults.push(runCommand(
        'npx playwright test __tests__/e2e/api-config.e2e.test.ts',
        'API Configuration E2E Tests'
      ));
    } catch (error) {
      log(`${colors.yellow}⚠️  E2E tests skipped (Playwright not configured)${colors.reset}`, colors.yellow);
    }
  }

  // Summary
  const passed = testResults.filter(Boolean).length;
  const total = testResults.length;
  const successRate = Math.round((passed / total) * 100);

  log(`\n${colors.bright}${colors.magenta}📈 Test Summary${colors.reset}`, colors.magenta);
  log(`${colors.green}✓ Passed: ${passed}/${total} tests${colors.reset}`);
  log(`${colors.red}✗ Failed: ${total - passed}/${total} tests${colors.reset}`);
  log(`${colors.cyan}📊 Success Rate: ${successRate}%${colors.reset}`);

  if (passed === total) {
    log(`\n${colors.bright}${colors.green}🎉 All tests passed! API configuration module is ready for production.${colors.reset}`, colors.green);
  } else {
    log(`\n${colors.bright}${colors.red}❌ Some tests failed. Please review the output above.${colors.reset}`, colors.red);
    process.exit(1);
  }
}

// Additional test utilities
function runCoverageReport() {
  log(`\n${colors.bright}${colors.magenta}📊 Generating Coverage Report${colors.reset}`, colors.magenta);
  
  try {
    runCommand(
      'npm test -- --coverage --collectCoverageFrom="src/lib/api-config.ts" --collectCoverageFrom="src/lib/api-validator.ts" --collectCoverageFrom="src/lib/ai.ts"',
      'Coverage Report'
    );
  } catch (error) {
    log(`${colors.yellow}⚠️  Coverage report generation skipped${colors.reset}`, colors.yellow);
  }
}

// Performance tests
function runPerformanceTests() {
  log(`\n${colors.bright}${colors.blue}⚡ Phase 6: Performance Tests${colors.reset}`, colors.blue);
  
  try {
    runCommand(
      'npm test -- src/lib/__tests__/performance.test.ts',
      'Performance Tests'
    );
  } catch (error) {
    log(`${colors.yellow}⚠️  Performance tests skipped (file not found)${colors.reset}`, colors.yellow);
  }
}

// Main execution
if (require.main === module) {
  try {
    // Check if we're in the correct directory
    const fs = require('fs');
    if (!fs.existsSync('package.json')) {
      log(`${colors.red}Error: Please run this script from the project root directory${colors.reset}`, colors.red);
      process.exit(1);
    }

    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.API_KEY_ENCRYPTION_KEY = 'test-encryption-key-for-testing-only';

    runTests();
    runCoverageReport();
    runPerformanceTests();

  } catch (error) {
    log(`${colors.red}Error running tests: ${error.message}${colors.reset}`, colors.red);
    process.exit(1);
  }
}

export { runTests, runCoverageReport };