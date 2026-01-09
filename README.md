# E-Commerce Web Application - Test Automation Project

## Presentation
<div style="position: relative; padding-bottom: 64.98194945848375%; height: 0;"><iframe src="https://www.loom.com/embed/58f118d89ca1470788c409899256588b" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
## 📋 Project Overview

This repository contains a comprehensive test automation suite for an e-commerce web application (`http://automationpractice.multiformis.com`). The project focuses on testing three critical modules: **Registration**, **Login**, and **Product Search** functionality.

## 🎯 Key Features Tested

### 1. **Registration Module**
- New user account creation
- Email validation and duplicate prevention
- Password strength validation
- Required/optional field handling
- Cross-browser and cross-device compatibility
- Security validations (SQL injection)

### 2. **Login Module**
- User authentication and session management
- Password masking
- Case-insensitive email handling
- Security features (HTTPS, cookie flags, brute-force protection)
- Accessibility and usability testing

### 3. **Product Search Module**
- Search functionality (exact/partial matches)
- Filtering by price, category, size, color, manufacturer
- Sorting options (price, name, relevance)
- Pagination and autocomplete suggestions
- Performance and accessibility testing

## 🛠️ Technical Stack

- **Test Framework**: Playwright
- **Programming Language**: JavaScript/Node.js
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Device Testing**: Desktop, Tablet, Mobile viewports
- **Reporting**: Built-in Playwright reports

## 📁 Project Structure

```
tests/
├── registration/
│   └── registration-tests.spec.js
├── login/
│   └── login-tests.spec.js
├── search/
└── └── search-tests.spec.js

documents/
├── Test Scenarios and Test Cases.pdf
├── Test Plan_ Automation Practice E-Commerce Website.pdf
└── Test Summary Report.pdf
```

## 🧪 Test Categories

### Positive Test Cases
- Successful registration with valid data
- Login with correct credentials
- Accurate search results
- Edge case handling

### Negative Test Cases
- Invalid email/password formats
- SQL injection attempts
- XSS payload testing
- Boundary value testing

### Security Test Cases
- Password masking
- HTTPS enforcement
- Session management
- Cookie security flags

### Performance Test Cases
- Search response times
- Page load performance
- Concurrent session handling

### Accessibility Test Cases
- Keyboard navigation
- Screen reader compatibility
- Mobile responsiveness

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Playwright browsers installed

### Installation
```bash
# Clone the repository
git clone git@github.com:mofeezamasood/Playwright-Automation-Practice-Project.git

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/registration/registration-tests.spec.js

# Run with specific browser
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui

# Generate HTML report
npx playwright test --reporter=html
```

### Configuration
The tests are configured to run against `http://automationpractice.multiformis.com`. Update the base URL in `playwright.config.js` if needed.

## 📊 Test Reports

The project includes comprehensive reporting:

1. **Playwright HTML Reports**: Generate using `--reporter=html` flag
2. **Test Summary PDF**: Overview of test execution results
3. **Test Plan Document**: Detailed testing strategy and approach
4. **Test Scenarios**: Complete test case documentation

## 🐛 Known Issues & Risks

Based on test execution, the following critical issues were identified:

### High Risk Findings
1. **No HTTPS enforcement** - All authentication occurs over HTTP
2. **No brute-force protection** - Unlimited failed login attempts allowed
3. **Weak password policy** - Simple passwords like "123" are accepted
4. **Session invalidation issues** - Logout doesn't properly clear sessions
5. **Search sorting broken** - Price/name sorting not functional

### Blocked Tests
- Cookie security flag validation
- Backend error handling scenarios
- Rate limiting/abuse prevention testing

## 🐞 Jira - QA Testing
https://mofeezamasood.atlassian.net/jira/software/projects/DEV/list?sortBy=key&direction=DESC&atlOrigin=eyJpIjoiNjgwZTRkYzRkMWRjNGE3ODg5ZDQ0OWIzNjAwMzVjMTAiLCJwIjoiaiJ9

## 🔧 Test Design Approach

The test suite uses multiple design techniques:

- **Equivalence Partitioning**: Grouping similar test inputs
- **Boundary Value Analysis**: Testing edge cases
- **Decision Table Testing**: Complex business logic validation
- **State Transition Testing**: Multi-step user flows
- **Error Guessing**: Based on common failure patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests following existing patterns
4. Ensure all tests pass
5. Submit a pull request

## 📝 Documentation

Refer to the following documents for detailed information:

- `Test Scenarios and Test Cases.pdf` - Complete test case catalog
- `Test Plan_ Automation Practice E-Commerce Website.pdf` - Testing strategy
- `Test Summary Report.pdf` - Execution results and recommendations
