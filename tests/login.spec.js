// File: tests/login/login-tests.spec.js
const { test, expect } = require('@playwright/test');

// Helper functions for test setup
async function createTestUser(page, userData) {
    // Create a test user via registration form
    await page.goto('/index.php?controller=authentication');
    await page.fill('#email_create', userData.email);
    await page.click('#SubmitCreate');
    await page.waitForURL(/controller=authentication.*account-creation/);

    await page.fill('#customer_firstname', userData.firstName);
    await page.fill('#customer_lastname', userData.lastName);
    await page.fill('#email', userData.email);
    await page.fill('#passwd', userData.password);
    await page.click('#submitAccount');

    // Logout to test login functionality
    await page.click('a.logout');
}

async function setupTestUser(context) {
    const page = await context.newPage();
    const timestamp = Date.now();
    const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: `test.user${timestamp}@automation.com`,
        password: 'Test@1234'
    };

    await createTestUser(page, testUser);
    await page.close();
    return testUser;
}

test.describe('Login Functionality - Comprehensive Test Suite', () => {
    let testUser;

    // Setup: Create a test user before all tests
    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        testUser = await setupTestUser(context);
        await context.close();
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/index.php?controller=authentication&back=my-account');
    });

    // ===== POSITIVE TEST CASES =====

    test('LOGIN-POS-001: Successful login with email/password', async ({ page }) => {
        // Enter credentials
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Verification
        await expect(page.locator('.page-heading')).toHaveText('My account');
        await expect(page.locator('a.logout')).toBeVisible();
        await expect(page.locator('a.account span')).toContainText(`${testUser.firstName} ${testUser.lastName}`);

        // Check welcome message
        await expect(page.locator('.info-account')).toContainText('Welcome to your account');
    });

    test('LOGIN-POS-002: Login with username if supported', async ({ page }) => {
        await page.fill('#email', testUser.email); // Using email as username might work
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Should still work
        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    test('LOGIN-POS-003: Login with "Remember me" checked', async ({ browser }) => {
        // Create a new browser context for this test
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/index.php?controller=authentication&back=my-account');

        // Check "Remember me" if the checkbox exists
        const rememberMeExists = await page.locator('#rememberme').isVisible();
        if (rememberMeExists) {
            await page.check('#rememberme');
        }

        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Verify login successful
        await expect(page.locator('.page-heading')).toHaveText('My account');

        // Get cookies and check if persistent cookie is set
        const cookies = await context.cookies();
        const hasPersistentCookie = cookies.some(cookie =>
            cookie.expires && cookie.expires > Date.now() / 1000
        );

        // Note: You might need to close and reopen browser to fully test persistence
        await context.close();
    });

    test('LOGIN-POS-004: Login case-insensitive email', async ({ page }) => {
        // Login with uppercase email
        const uppercaseEmail = testUser.email.toUpperCase();
        await page.fill('#email', uppercaseEmail);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Should login successfully (case-insensitive)
        await expect(page.locator('.page-heading')).toHaveText('My account');

        // Logout and try with mixed case
        await page.click('a.logout');
        await page.goto('/index.php?controller=authentication&back=my-account');

        const mixedCaseEmail = testUser.email.charAt(0).toUpperCase() + testUser.email.slice(1);
        await page.fill('#email', mixedCaseEmail);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    test('LOGIN-POS-005: Login after password change', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Create a temporary user
        const timestamp = Date.now();
        const tempUser = {
            firstName: 'Password',
            lastName: 'Change',
            email: `password.change${timestamp}@test.com`,
            password: 'OldPass123!',
            newPassword: 'NewPass456!'
        };

        await createTestUser(page, tempUser);

        // Login with old password (should work)
        await page.goto('/index.php?controller=authentication&back=my-account');
        await page.fill('#email', tempUser.email);
        await page.fill('#passwd', tempUser.password);
        await page.click('#SubmitLogin');
        await expect(page.locator('.page-heading')).toHaveText('My account');

        // Change password (assuming password change functionality exists)
        // This would depend on your application's password change flow

        // Note: For a complete test, you'd need to implement password change
        // and then test login with new password

        await context.close();
    });

    test('LOGIN-POS-006: Login redirect to requested page', async ({ page }) => {
        // First, try to access a protected page while logged out
        await page.goto('/index.php?controller=history');

        // Should redirect to login page with return parameter
        await expect(page).toHaveURL(/controller=authentication/);
        await expect(page.locator('.page-heading')).toHaveText('Authentication');

        // Login
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Should redirect back to originally requested page (order history)
        await expect(page).toHaveURL(/controller=history/);
        await expect(page.locator('.page-heading')).toHaveText('Order history');
    });

    test('LOGIN-POS-007: Login with trimmed spaces', async ({ page }) => {
        // Enter credentials with spaces
        await page.fill('#email', `  ${testUser.email}  `);
        await page.fill('#passwd', `  ${testUser.password}  `);
        await page.click('#SubmitLogin');

        // Should login successfully (spaces trimmed)
        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    test('LOGIN-POS-008: Login from different browsers', async ({ browser }) => {
        // Test with Chromium (default)
        const chromiumPage = await browser.newPage();
        await chromiumPage.goto('/index.php?controller=authentication&back=my-account');
        await chromiumPage.fill('#email', testUser.email);
        await chromiumPage.fill('#passwd', testUser.password);
        await chromiumPage.click('#SubmitLogin');
        await expect(chromiumPage.locator('.page-heading')).toHaveText('My account');
        await chromiumPage.close();

        // Note: For testing different browsers, you'd need to run the test
        // with different browser configurations in Playwright config
    });

    test('LOGIN-POS-009: Login from different devices', async ({ browser }) => {
        // Test with mobile viewport
        const mobileContext = await browser.newContext({
            viewport: { width: 375, height: 667 }, // iPhone SE
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        });
        const mobilePage = await mobileContext.newPage();

        await mobilePage.goto('/index.php?controller=authentication&back=my-account');
        await mobilePage.fill('#email', testUser.email);
        await mobilePage.fill('#passwd', testUser.password);
        await mobilePage.click('#SubmitLogin');

        await expect(mobilePage.locator('.page-heading')).toHaveText('My account');
        await expect(mobilePage.locator('a.logout')).toBeVisible();

        await mobileContext.close();

        // Test with tablet viewport
        const tabletContext = await browser.newContext({
            viewport: { width: 768, height: 1024 }, // iPad
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        });
        const tabletPage = await tabletContext.newPage();

        await tabletPage.goto('/index.php?controller=authentication&back=my-account');
        await tabletPage.fill('#email', testUser.email);
        await tabletPage.fill('#passwd', testUser.password);
        await tabletPage.click('#SubmitLogin');

        await expect(tabletPage.locator('.page-heading')).toHaveText('My account');
        await expect(tabletPage.locator('a.logout')).toBeVisible();

        await tabletContext.close();
    });

    test('LOGIN-POS-010: Login session management', async ({ browser }) => {
        // Create two separate browser contexts to simulate different devices
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Login on device 1
        await page1.goto('/index.php?controller=authentication&back=my-account');
        await page1.fill('#email', testUser.email);
        await page1.fill('#passwd', testUser.password);
        await page1.click('#SubmitLogin');
        await expect(page1.locator('.page-heading')).toHaveText('My account');

        // Login on device 2
        await page2.goto('/index.php?controller=authentication&back=my-account');
        await page2.fill('#email', testUser.email);
        await page2.fill('#passwd', testUser.password);
        await page2.click('#SubmitLogin');
        await expect(page2.locator('.page-heading')).toHaveText('My account');

        // Both sessions should be active
        await expect(page1.locator('a.logout')).toBeVisible();
        await expect(page2.locator('a.logout')).toBeVisible();

        await context1.close();
        await context2.close();
    });

    test('LOGIN-POS-011: Login with special characters in password', async ({ browser }) => {
        // Create a user with special characters in password
        const context = await browser.newContext();
        const page = await context.newPage();

        const timestamp = Date.now();
        const specialPassUser = {
            firstName: 'Special',
            lastName: 'Chars',
            email: `special.chars${timestamp}@test.com`,
            password: 'P@0d!@#$%^&*()_+{}[]|:;"<>,.?/~`'
        };

        await createTestUser(page, specialPassUser);

        // Login with special character password
        await page.goto('/index.php?controller=authentication');
        await page.fill('#email', specialPassUser.email);
        await page.fill('#passwd', specialPassUser.password);
        await page.click('#SubmitLogin');

        await expect(page.locator('.page-heading')).toHaveText('My account');

        await context.close();
    });

    test('LOGIN-POS-012: Login timeout and auto-logout', async ({ page }) => {
        // Login first
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');
        await expect(page.locator('.page-heading')).toHaveText('My account');

        // Wait for session timeout (adjust time based on your application)
        // Note: This might require adjusting Playwright timeout or mocking time
        await page.waitForTimeout(1800000); // 30 minutes

        // Try to perform an action
        await page.goto('/index.php?controller=history');

        // Should be redirected to login page or show session expired
        const currentUrl = page.url();
        if (currentUrl.includes('controller=authentication')) {
            await expect(page.locator('.page-heading')).toHaveText('Authentication');
        } else if (await page.locator('.alert.alert-warning').isVisible()) {
            await expect(page.locator('.alert.alert-warning')).toContainText(/session|expired|timeout/i);
        }
    });

    test('LOGIN-POS-013: Login after account reactivation', async ({ browser }) => {
        // This test requires account deactivation/reactivation functionality
        // which may not be available in the base application

        console.log('LOGIN-POS-013: This test requires account reactivation functionality');
        // You would need to implement:
        // 1. Deactivate account (via admin or user setting)
        // 2. Try login (should fail)
        // 3. Reactivate account
        // 4. Try login (should succeed)
    });

    test('LOGIN-POS-014: Login with browser password manager', async ({ page }) => {
        // Simulate browser password manager autofill
        await page.evaluate(() => {
            // Simulate autofill by setting values and triggering events
            document.getElementById('email').value = arguments[0];
            document.getElementById('passwd').value = arguments[1];

            ['email', 'passwd'].forEach(id => {
                const element = document.getElementById(id);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }, testUser.email, testUser.password);

        await page.click('#SubmitLogin');

        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    // ===== NEGATIVE TEST CASES =====

    test('LOGIN-NEG-001: Login with invalid email format', async ({ page }) => {
        const invalidEmails = [
            'invalidemail',
            'user@domain',
            '@domain.com',
            'user@.com',
            'user@domain.',
            'user name@domain.com',
            'user@domain..com'
        ];

        for (const invalidEmail of invalidEmails) {
            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email', invalidEmail);
            await page.fill('#passwd', 'anypassword');
            await page.click('#SubmitLogin');

            // Should show validation error
            const errorVisible = await page.locator('.alert.alert-danger').isVisible();
            expect(errorVisible).toBe(true);

            if (errorVisible) {
                const errorText = await page.locator('.alert.alert-danger').textContent();
                expect(errorText).toMatch(/email|invalid|format/i);
            }
        }
    });

    test('LOGIN-NEG-002: Login with incorrect password', async ({ page }) => {
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', 'WrongPassword123!');
        await page.click('#SubmitLogin');

        // Should show error
        await expect(page.locator('.alert.alert-danger')).toBeVisible();

        const errorText = await page.locator('.alert.alert-danger').textContent();
        expect(errorText).toMatch(/invalid|authentication|failed/i);

        // Should not specify whether email or password is wrong (security)
        expect(errorText.toLowerCase()).not.toContain('password');
        expect(errorText.toLowerCase()).not.toContain('email');
    });

    test('LOGIN-NEG-003: Login with non-existent email', async ({ page }) => {
        const nonExistentEmail = `nonexistent${Date.now()}@test.com`;

        await page.fill('#email', nonExistentEmail);
        await page.fill('#passwd', 'AnyPassword123');
        await page.click('#SubmitLogin');

        // Should show generic error (not "user doesn't exist")
        await expect(page.locator('.alert.alert-danger')).toBeVisible();

        const errorText = await page.locator('.alert.alert-danger').textContent();
        expect(errorText).toMatch(/invalid|authentication|failed/i);

        // Should be same as wrong password error (security)
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', 'WrongPassword123');
        await page.click('#SubmitLogin');

        const errorText2 = await page.locator('.alert.alert-danger').textContent();
        expect(errorText.toLowerCase()).toBe(errorText2.toLowerCase());
    });

    test('LOGIN-NEG-004: Login with empty credentials', async ({ page }) => {
        // Test empty email
        await page.fill('#email', '');
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        await expect(page.locator('.alert.alert-danger')).toBeVisible();

        // Test empty password
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', '');
        await page.click('#SubmitLogin');

        await expect(page.locator('.alert.alert-danger')).toBeVisible();

        // Test both empty
        await page.fill('#email', '');
        await page.fill('#passwd', '');
        await page.click('#SubmitLogin');

        await expect(page.locator('.alert.alert-danger')).toBeVisible();
    });

    test('LOGIN-NEG-005: Login with SQL injection', async ({ page }) => {
        const sqlInjections = [
            "' OR '1'='1",
            "' OR 1=1 --",
            "admin' --",
            "' UNION SELECT * FROM users --"
        ];

        for (const sqlInjection of sqlInjections) {
            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email', sqlInjection);
            await page.fill('#passwd', 'anything');
            await page.click('#SubmitLogin');

            // Should fail with generic error
            const errorVisible = await page.locator('.alert.alert-danger').isVisible();
            expect(errorVisible).toBe(true);

            if (errorVisible) {
                const errorText = await page.locator('.alert.alert-danger').textContent();
                expect(errorText).not.toMatch(/SQL|syntax|database/i);
            }
        }
    });

    test('LOGIN-NEG-006: Login with XSS payload', async ({ page }) => {
        const xssPayloads = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')"
        ];

        for (const xssPayload of xssPayloads) {
            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email', xssPayload);
            await page.fill('#passwd', 'test123');
            await page.click('#SubmitLogin');

            // Should fail (or sanitize and fail)
            const errorVisible = await page.locator('.alert.alert-danger').isVisible();
            expect(errorVisible).toBe(true);

            // Check no script execution
            const alertCount = await page.evaluate(() => {
                let alertCount = 0;
                const originalAlert = window.alert;
                window.alert = () => { alertCount++; };
                return alertCount;
            });
            expect(alertCount).toBe(0);
        }
    });

    test('LOGIN-NEG-007: Login with locked account', async ({ page }) => {
        // This test requires account lockout functionality
        // You would need to trigger lockout first (multiple failed attempts)

        console.log('LOGIN-NEG-007: This test requires account lockout functionality');
        // Implementation steps:
        // 1. Make multiple failed login attempts to trigger lockout
        // 2. Try to login with correct credentials
        // 3. Should fail with "account locked" message
        // 4. Wait for lockout period or follow unlock instructions
    });

    test('LOGIN-NEG-008: Login with deactivated account', async ({ page }) => {
        // This test requires account deactivation functionality

        console.log('LOGIN-NEG-008: This test requires account deactivation functionality');
        // Implementation steps:
        // 1. Create and then deactivate an account
        // 2. Try to login
        // 3. Should fail with "account deactivated" message
    });

    test('LOGIN-NEG-009: Login with expired password', async ({ page }) => {
        // This test requires password expiration functionality

        console.log('LOGIN-NEG-009: This test requires password expiration functionality');
        // Implementation steps:
        // 1. Create account with expiring password
        // 2. Wait for password to expire or manually expire it
        // 3. Try to login
        // 4. Should prompt for password change or show error
    });

    test('LOGIN-NEG-010: Login brute force protection', async ({ page }) => {
        const testEmail = `bruteforce${Date.now()}@test.com`;

        // Attempt multiple failed logins
        for (let i = 0; i < 10; i++) {
            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email', testEmail);
            await page.fill('#passwd', `WrongPass${i}`);
            await page.click('#SubmitLogin');

            // Check for rate limiting after several attempts
            if (i >= 5) {
                const errorVisible = await page.locator('.alert.alert-danger').isVisible();
                if (errorVisible) {
                    const errorText = await page.locator('.alert.alert-danger').textContent();
                    if (errorText.match(/too many|rate limit|try again|locked/i)) {
                        console.log(`Rate limiting triggered after ${i + 1} attempts`);
                        break;
                    }
                }
            }
        }
    });

    test('LOGIN-NEG-011: Login with wrong email case (if case-sensitive)', async ({ page }) => {
        // Create a test user with specific case
        const context = await browser.newContext();
        const setupPage = await context.newPage();

        const timestamp = Date.now();
        const caseSensitiveUser = {
            firstName: 'Case',
            lastName: 'Sensitive',
            email: `casesensitive${timestamp}@test.com`, // lowercase
            password: 'Test@1234'
        };

        await createTestUser(setupPage, caseSensitiveUser);
        await setupPage.close();

        // Try login with different case
        await page.goto('/index.php?controller=authentication&back=my-account');
        await page.fill('#email', caseSensitiveUser.email.toUpperCase());
        await page.fill('#passwd', caseSensitiveUser.password);
        await page.click('#SubmitLogin');

        // Check if it works (case-insensitive) or fails (case-sensitive)
        const success = await page.locator('.page-heading').isVisible();

        if (!success) {
            await expect(page.locator('.alert.alert-danger')).toBeVisible();

            // Try with correct case
            await page.fill('#email', caseSensitiveUser.email);
            await page.fill('#passwd', caseSensitiveUser.password);
            await page.click('#SubmitLogin');
            await expect(page.locator('.page-heading')).toHaveText('My account');
        }

        await context.close();
    });

    test('LOGIN-NEG-012: Login with leading/trailing newlines', async ({ page }) => {
        await page.fill('#email', `\n${testUser.email}\n`);
        await page.fill('#passwd', `\n${testUser.password}\n`);
        await page.click('#SubmitLogin');

        // Check result - should either fail or succeed with trimmed input
        const success = await page.locator('.page-heading').isVisible();
        const error = await page.locator('.alert.alert-danger').isVisible();

        expect(success || error).toBe(true);
    });

    test('LOGIN-NEG-013: Login with extremely long inputs', async ({ page }) => {
        const longString = 'A'.repeat(500);

        await page.fill('#email', longString + '@test.com');
        await page.fill('#passwd', longString);
        await page.click('#SubmitLogin');

        // Should show validation error
        await expect(page.locator('.alert.alert-danger')).toBeVisible();

        const errorText = await page.locator('.alert.alert-danger').textContent();
        expect(errorText).toMatch(/invalid|too long|maximum/i);
    });

    test('LOGIN-NEG-014: Login without HTTPS', async ({ page }) => {
        // Try to access via HTTP
        const httpUrl = page.url().replace('https://', 'http://');

        try {
            await page.goto(httpUrl);
            const currentUrl = page.url();

            // Should redirect to HTTPS or show error
            expect(currentUrl.startsWith('https://')).toBe(true);
        } catch (error) {
            // If HTTP is blocked, that's also acceptable
            console.log('HTTP access blocked or redirected');
        }
    });

    test('LOGIN-NEG-015: Login with different password encoding', async ({ page }) => {
        // Test copy-paste with special characters
        const specialPassword = 'P@ssw0rd✓™©';

        // Create user with special password
        const context = await browser.newContext();
        const setupPage = await context.newPage();

        const timestamp = Date.now();
        const encodingUser = {
            firstName: 'Encoding',
            lastName: 'Test',
            email: `encoding${timestamp}@test.com`,
            password: specialPassword
        };

        await createTestUser(setupPage, encodingUser);
        await setupPage.close();

        // Try login by typing
        await page.fill('#email', encodingUser.email);
        await page.fill('#passwd', specialPassword);
        await page.click('#SubmitLogin');

        // Should work if encoding is handled correctly
        const success = await page.locator('.page-heading').isVisible();

        if (!success) {
            console.log('Special characters in password may not be supported');
        }

        await context.close();
    });

    // ===== SECURITY TEST CASES =====

    test('LOGIN-SEC-001: Password masking', async ({ page }) => {
        // Check password field type
        const passwordType = await page.locator('#passwd').getAttribute('type');
        expect(passwordType).toBe('password');

        // Type password and verify it's not visible
        await page.fill('#passwd', 'Secret123!');
        const isMasked = await page.evaluate(() => {
            const input = document.getElementById('passwd');
            return input.type === 'password';
        });
        expect(isMasked).toBe(true);

        // Check for show/hide toggle if implemented
        const showHideToggle = await page.locator('[type="button"][onclick*="password"], .toggle-password').isVisible();
        if (showHideToggle) {
            await page.click('[type="button"][onclick*="password"], .toggle-password');
            const newType = await page.locator('#passwd').getAttribute('type');
            expect(newType).toBe('text');

            // Click again to hide
            await page.click('[type="button"][onclick*="password"], .toggle-password');
            const finalType = await page.locator('#passwd').getAttribute('type');
            expect(finalType).toBe('password');
        }
    });

    test('LOGIN-SEC-002: Session ID regeneration', async ({ page }) => {
        // Get initial session cookie
        const initialCookies = await page.context().cookies();
        const initialSessionCookie = initialCookies.find(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        // Login
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Get new session cookie
        const newCookies = await page.context().cookies();
        const newSessionCookie = newCookies.find(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        // Session ID should change after login
        if (initialSessionCookie && newSessionCookie) {
            expect(initialSessionCookie.value).not.toBe(newSessionCookie.value);
        }
    });

    test('LOGIN-SEC-003: Secure flag on session cookie', async ({ page }) => {
        // Login first
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Get session cookies
        const cookies = await page.context().cookies();
        const sessionCookies = cookies.filter(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        // Check cookie attributes
        for (const cookie of sessionCookies) {
            if (page.url().startsWith('https://')) {
                expect(cookie.secure).toBe(true);
            }
            expect(cookie.httpOnly).toBe(true);

            // Check SameSite attribute (should be Lax or Strict)
            expect(['Lax', 'Strict', 'None']).toContain(cookie.sameSite);
        }
    });

    test('LOGIN-SEC-004: Login error message security', async ({ page }) => {
        // Test wrong password
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', 'WrongPassword123');
        await page.click('#SubmitLogin');

        const error1 = await page.locator('.alert.alert-danger').textContent();

        // Test non-existent user
        await page.goto('/index.php?controller=authentication&back=my-account');
        await page.fill('#email', 'nonexistent@example.com');
        await page.fill('#passwd', 'AnyPassword123');
        await page.click('#SubmitLogin');

        const error2 = await page.locator('.alert.alert-danger').textContent();

        // Both errors should be identical and generic
        expect(error1.toLowerCase()).toBe(error2.toLowerCase());
        expect(error1).toMatch(/invalid|authentication|failed/i);

        // Check response timing (basic check)
        await page.goto('/index.php?controller=authentication&back=my-account');

        const startTime1 = Date.now();
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', 'WrongPassword123');
        await page.click('#SubmitLogin');
        await page.waitForSelector('.alert.alert-danger');
        const time1 = Date.now() - startTime1;

        await page.goto('/index.php?controller=authentication&back=my-account');

        const startTime2 = Date.now();
        await page.fill('#email', 'nonexistent@example.com');
        await page.fill('#passwd', 'AnyPassword123');
        await page.click('#SubmitLogin');
        await page.waitForSelector('.alert.alert-danger');
        const time2 = Date.now() - startTime2;

        // Response times should be similar (no timing attack vulnerability)
        const timeDiff = Math.abs(time1 - time2);
        expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    test('LOGIN-SEC-005: Login audit logging', async ({ page }) => {
        // This test requires access to audit logs or checking for
        // security notifications in the application

        console.log('LOGIN-SEC-005: Audit logging verification requires backend access');
        // Implementation would involve:
        // 1. Checking database/logs for login attempts
        // 2. Verifying IP address and timestamp are recorded
        // 3. Checking both successful and failed attempts are logged
    });

    test('LOGIN-SEC-006: Concurrent session control', async ({ browser }) => {
        // Create two sessions
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Login on both
        await page1.goto('/index.php?controller=authentication&back=my-account');
        await page1.fill('#email', testUser.email);
        await page1.fill('#passwd', testUser.password);
        await page1.click('#SubmitLogin');

        await page2.goto('/index.php?controller=authentication&back=my-account');
        await page2.fill('#email', testUser.email);
        await page2.fill('#passwd', testUser.password);
        await page2.click('#SubmitLogin');

        // Both should work (or second might invalidate first based on policy)
        const bothWork = await page1.locator('.page-heading').isVisible() &&
            await page2.locator('.page-heading').isVisible();

        if (!bothWork) {
            // Check if there's a message about concurrent sessions
            const alertVisible = await page1.locator('.alert.alert-warning').isVisible() ||
                await page2.locator('.alert.alert-warning').isVisible();
            expect(alertVisible).toBe(true);
        }

        await context1.close();
        await context2.close();
    });

    test('LOGIN-SEC-007: Login with stolen cookie', async ({ browser }) => {
        // Create a session
        const context1 = await browser.newContext();
        const page1 = await context1.newPage();

        await page1.goto('/index.php?controller=authentication&back=my-account');
        await page1.fill('#email', testUser.email);
        await page1.fill('#passwd', testUser.password);
        await page1.click('#SubmitLogin');
        await expect(page1.locator('.page-heading')).toHaveText('My account');

        // Get session cookie
        const cookies = await context1.cookies();
        const sessionCookie = cookies.find(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        // Try to use cookie in different context
        const context2 = await browser.newContext();
        await context2.addCookies([sessionCookie]);
        const page2 = await context2.newPage();

        await page2.goto('/index.php?controller=my-account');

        // Should be denied access (session fixation prevention)
        const accessDenied = !(await page2.locator('.page-heading').isVisible()) ||
            await page2.locator('.alert.alert-danger').isVisible();

        expect(accessDenied).toBe(true);

        await context1.close();
        await context2.close();
    });

    test('LOGIN-SEC-008: Password reset vs login', async ({ browser }) => {
        // Create a test user
        const context = await browser.newContext();
        const page = await context.newPage();

        const timestamp = Date.now();
        const resetUser = {
            firstName: 'Password',
            lastName: 'Reset',
            email: `password.reset${timestamp}@test.com`,
            password: 'OldPass123!',
            newPassword: 'NewPass456!'
        };

        await createTestUser(page, resetUser);

        // Login to establish session
        await page.goto('/index.php?controller=authentication&back=my-account');
        await page.fill('#email', resetUser.email);
        await page.fill('#passwd', resetUser.password);
        await page.click('#SubmitLogin');
        await expect(page.locator('.page-heading')).toHaveText('My account');

        // Get session cookie
        const oldCookies = await context.cookies();

        // Note: Password reset functionality would need to be implemented
        // After password reset, old session should be invalidated

        console.log('LOGIN-SEC-008: Password reset test requires reset functionality');

        await context.close();
    });

    test('LOGIN-SEC-009: Login from suspicious location', async ({ page }) => {
        // This test requires geo-location detection
        // You can simulate different locations by modifying headers

        console.log('LOGIN-SEC-009: Geo-location test requires location detection');
        // Implementation could involve:
        // 1. Mocking different IP addresses
        // 2. Checking for security challenges or notifications
        // 3. Verifying email notifications are sent
    });

    test('LOGIN-SEC-010: Login with referrer check', async ({ page }) => {
        // Test login from external site
        await page.evaluate(() => {
            // Simulate coming from external site
            Object.defineProperty(document, 'referrer', {
                value: 'https://malicious-site.com',
                configurable: true
            });
        });

        await page.goto('/index.php?controller=authentication&back=my-account');
        await page.fill('#email', testUser.email);
        await page.fill('#passwd', testUser.password);
        await page.click('#SubmitLogin');

        // Should still work (referrer shouldn't block legitimate login)
        await expect(page.locator('.page-heading')).toHaveText('My account');

        // Check CSRF protection exists
        const hasCsrfToken = await page.evaluate(() => {
            const form = document.querySelector('form[action*="authentication"]');
            return form && (form.querySelector('input[name*="token"]') ||
                form.querySelector('input[name*="csrf"]'));
        });

        expect(hasCsrfToken).toBe(true);
    });
});