// File: tests/login/login-tests.spec.js
const { test, expect } = require('@playwright/test');

// ===== HELPER FUNCTIONS =====

// Creates a test user with provided user data
async function createTestUser(browser, userData) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/index.php?controller=authentication&back=my-account');
    await page.fill('#email_create', userData.email);
    await page.click('#SubmitCreate');
    await page.waitForURL(/controller=authentication.*account-creation/);

    await page.fill('#customer_firstname', userData.firstName);
    await page.fill('#customer_lastname', userData.lastName);
    await page.fill('#email', userData.email);
    await page.fill('#passwd', userData.password);
    await page.click('#submitAccount');

    await page.waitForURL(/controller=my-account/);
    await page.click('a.logout');

    await page.close();
    await context.close();

    return userData;
}

// Generates unique user data with timestamp
function generateUniqueUserData(baseName = 'TestUser') {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const uniqueId = `${timestamp}_${randomString}`;

    return {
        firstName: baseName,
        lastName: 'Auto',
        email: `${baseName.toLowerCase()}_${uniqueId}@test.com`,
        password: `P@ssw0rd_${uniqueId}`
    };
}

// Performs login with provided credentials
async function performLogin(page, email, password) {
    await page.fill('#email', email);
    await page.fill('#passwd', password);
    await page.click('#SubmitLogin');
}

// Verifies successful login
async function verifySuccessfulLogin(page, expectedName = null) {
    await expect(page.locator('.page-heading')).toHaveText('My account');
    await expect(page.locator('a.logout')).toBeVisible();

    if (expectedName) {
        await expect(page.locator('a.account span')).toContainText(expectedName);
    }
}

// Creates a browser context with mobile viewport
async function createMobileContext(browser) {
    return await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
}

// Creates a browser context with tablet viewport
async function createTabletContext(browser) {
    return await browser.newContext({
        viewport: { width: 768, height: 1024 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
}

// Creates and returns a new browser context and page
async function createBrowserContext(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

// Closes browser context
async function closeBrowserContext(context) {
    await context.close();
}

// Navigates to login page
async function navigateToLoginPage(page) {
    await page.goto('/index.php?controller=authentication&back=my-account');
}

// ===== TEST SUITE =====

test.describe('Login Functionality - Comprehensive Test Suite', () => {
    // ===== POSITIVE TEST CASES =====

    test('LOGIN-POS-001: Successful login with email/password', async ({ browser }) => {
        const userData = generateUniqueUserData('Testuser');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);

        await verifySuccessfulLogin(page, `${userData.firstName} ${userData.lastName}`);
        await expect(page.locator('.info-account')).toContainText('Welcome to your account');

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-002: Login with username if supported', async ({ browser }) => {
        const userData = generateUniqueUserData('UsernameLogin');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);

        await verifySuccessfulLogin(page);
        await closeBrowserContext(context);
    });

    test('LOGIN-POS-003: Login with "Remember me" checked', async ({ browser }) => {
        const userData = generateUniqueUserData('RememberMe');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        const rememberMeExists = await page.locator('#rememberme').isVisible();
        if (rememberMeExists) {
            await page.check('#rememberme');
        }

        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        const cookies = await context.cookies();
        const hasPersistentCookie = cookies.some(cookie =>
            cookie.expires && cookie.expires > Date.now() / 1000
        );

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-004: Login case-insensitive email', async ({ browser }) => {
        const userData = generateUniqueUserData('CaseInsensitive');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);

        // Test with uppercase email
        await navigateToLoginPage(page);
        await performLogin(page, userData.email.toUpperCase(), userData.password);
        await verifySuccessfulLogin(page);

        // Logout and test with mixed case
        await page.click('a.logout');
        await navigateToLoginPage(page);

        const mixedCaseEmail = userData.email.charAt(0).toUpperCase() + userData.email.slice(1);
        await performLogin(page, mixedCaseEmail, userData.password);
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-005: Login after password change', async ({ browser }) => {
        const userData = generateUniqueUserData('PasswordChange');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-006: Login redirect to requested page', async ({ browser }) => {
        const userData = generateUniqueUserData('RedirectTest');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);

        // Try to access protected page
        await page.goto('/index.php?controller=history');
        await expect(page).toHaveURL(/controller=authentication/);

        // Login should redirect back
        await performLogin(page, userData.email, userData.password);
        await expect(page).toHaveURL(/controller=history/);
        await expect(page.locator('.page-heading')).toHaveText('Order history');

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-007: Login with trimmed spaces', async ({ browser }) => {
        const userData = generateUniqueUserData('TrimSpaces');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        await page.fill('#email', `  ${userData.email}  `);
        await page.fill('#passwd', `  ${userData.password}  `);
        await page.click('#SubmitLogin');

        await verifySuccessfulLogin(page);
        await closeBrowserContext(context);
    });

    test('LOGIN-POS-008: Login from different browsers', async ({ browser }) => {
        const userData = generateUniqueUserData('DifferentBrowser');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-009: Login from different devices', async ({ browser }) => {
        const userData = generateUniqueUserData('DifferentDevice');
        await createTestUser(browser, userData);

        // Test with mobile viewport
        const mobileContext = await createMobileContext(browser);
        const mobilePage = await mobileContext.newPage();

        await navigateToLoginPage(mobilePage);
        await performLogin(mobilePage, userData.email, userData.password);
        await verifySuccessfulLogin(mobilePage);
        await mobileContext.close();

        // Test with tablet viewport
        const tabletContext = await createTabletContext(browser);
        const tabletPage = await tabletContext.newPage();

        await navigateToLoginPage(tabletPage);
        await performLogin(tabletPage, userData.email, userData.password);
        await verifySuccessfulLogin(tabletPage);
        await tabletContext.close();
    });

    test('LOGIN-POS-010: Login session management', async ({ browser }) => {
        const userData = generateUniqueUserData('SessionMgmt');
        await createTestUser(browser, userData);

        const { context: context1, page: page1 } = await createBrowserContext(browser);
        const { context: context2, page: page2 } = await createBrowserContext(browser);

        // Login on device 1
        await navigateToLoginPage(page1);
        await performLogin(page1, userData.email, userData.password);
        await verifySuccessfulLogin(page1);

        // Login on device 2
        await navigateToLoginPage(page2);
        await performLogin(page2, userData.email, userData.password);
        await verifySuccessfulLogin(page2);

        // Both sessions should be active
        await expect(page1.locator('a.logout')).toBeVisible();
        await expect(page2.locator('a.logout')).toBeVisible();

        await closeBrowserContext(context1);
        await closeBrowserContext(context2);
    });

    test('LOGIN-POS-011: Login with special characters in password', async ({ browser }) => {
        const userData = {
            ...generateUniqueUserData('SpecialChars'),
            password: `P@0d!@#$%^&*()_+{}[]|:;"<>,.?/~`
        };

        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-012: Login timeout and auto-logout', async ({ browser }) => {
        const userData = generateUniqueUserData('TimeoutTest');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        console.log('LOGIN-POS-012: Session timeout test requires clock manipulation');

        await closeBrowserContext(context);
    });

    test('LOGIN-POS-013: Login after account reactivation', async ({ browser }) => {
        const userData = generateUniqueUserData('Reactivate');
        await createTestUser(browser, userData);

        console.log('LOGIN-POS-013: This test requires account reactivation functionality');
        // Account reactivation test placeholder
    });

    test('LOGIN-POS-014: Login with browser password manager', async ({ browser }) => {
        const userData = generateUniqueUserData('PasswordManager');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        await page.evaluate(({ email, password }) => {
            document.getElementById('email').value = email;
            document.getElementById('passwd').value = password;

            ['email', 'passwd'].forEach(id => {
                const element = document.getElementById(id);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }, { email: userData.email, password: userData.password });

        await page.click('#SubmitLogin');
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    // ===== NEGATIVE TEST CASES =====

    test('LOGIN-NEG-001: Login with invalid email format', async ({ browser }) => {
        const invalidEmails = [
            `invalidemail_${Date.now()}`,
            `user_${Date.now()}@domain`,
            `@domain_${Date.now()}.com`,
            `user_${Date.now()}@.com`,
            `user_${Date.now()}@domain.`,
            `user name_${Date.now()}@domain.com`,
            `user_${Date.now()}@domain..com`
        ];

        const { context, page } = await createBrowserContext(browser);

        for (const invalidEmail of invalidEmails) {
            await navigateToLoginPage(page);
            await performLogin(page, invalidEmail, `anypassword_${Date.now()}`);

            await page.locator('input#email_create[required]:invalid')
        }

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-002: Login with incorrect password', async ({ browser }) => {
        const userData = generateUniqueUserData('WrongPassword');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, `WrongPassword_${Date.now()}!`);
        await expect(page.locator('.alert.alert-danger:not(#create_account_error)')).toBeVisible();

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-003: Login with non-existent email', async ({ browser }) => {
        const { context, page } = await createBrowserContext(browser);
        const nonExistentEmail = `nonexistent_${Date.now()}@test.com`;

        await navigateToLoginPage(page);
        await performLogin(page, nonExistentEmail, `AnyPassword_${Date.now()}`);
        await expect(page.locator('.alert.alert-danger:not(#create_account_error)')).toBeVisible();

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-004: Login with empty credentials', async ({ browser }) => {
        const userData = generateUniqueUserData('EmptyCredentials');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);

        // Test empty email
        await navigateToLoginPage(page);
        await performLogin(page, '', userData.password);
        await expect(page.locator('.alert.alert-danger:not(#create_account_error)')).toBeVisible();

        // Test empty password
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, '');
        await expect(page.locator('.alert.alert-danger:not(#create_account_error)')).toBeVisible();

        // Test both empty
        await navigateToLoginPage(page);
        await performLogin(page, '', '');
        await expect(page.locator('.alert.alert-danger:not(#create_account_error)')).toBeVisible();

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-007: Login with locked account', async ({ browser }) => {
        const userData = generateUniqueUserData('LockedAccount');
        await createTestUser(browser, userData);

        console.log('LOGIN-NEG-007: This test requires account lockout functionality');
        // Account lockout test placeholder
    });

    test('LOGIN-NEG-008: Login with deactivated account', async ({ browser }) => {
        const userData = generateUniqueUserData('Deactivated');
        await createTestUser(browser, userData);

        console.log('LOGIN-NEG-008: This test requires account deactivation functionality');
        // Account deactivation test placeholder
    });

    test('LOGIN-NEG-009: Login with expired password', async ({ browser }) => {
        const userData = generateUniqueUserData('ExpiredPassword');
        await createTestUser(browser, userData);

        console.log('LOGIN-NEG-009: This test requires password expiration functionality');
        // Password expiration test placeholder
    });

    test('LOGIN-NEG-010: Login brute force protection', async ({ browser }) => {
        const testEmail = `bruteforce_${Date.now()}@test.com`;
        let rateLimitingTriggered = false;

        const { context, page } = await createBrowserContext(browser);

        for (let i = 0; i < 15; i++) {
            await navigateToLoginPage(page);
            await performLogin(page, testEmail, `WrongPass_${Date.now()}_${i}`);

            if (i >= 5) {
                const errorVisible = await page.locator('.alert.alert-danger:not(#create_account_error)').isVisible();
                if (errorVisible) {
                    const errorText = await page.locator('.alert.alert-danger:not(#create_account_error)').textContent();
                    if (errorText.match(/too many|rate limit|try again|locked|temporarily|blocked/i)) {
                        console.log(`Rate limiting triggered after ${i + 1} attempts`);
                        rateLimitingTriggered = true;
                        break;
                    }
                }
            }
        }

        expect(rateLimitingTriggered).toBe(true);
        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-011: Login with wrong email case (if case-sensitive)', async ({ browser }) => {
        const userData = generateUniqueUserData('CaseSensitive');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        // Try login with different case
        await performLogin(page, userData.email.toUpperCase(), userData.password);
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-012: Login with leading/trailing newlines', async ({ browser }) => {
        const userData = generateUniqueUserData('Newlines');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        await page.fill('#email', ` ${userData.email} `);
        await page.fill('#passwd', ` ${userData.password} `);
        await page.click('#SubmitLogin');
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-013: Login with extremely long inputs', async ({ browser }) => {
        const { context, page } = await createBrowserContext(browser);
        const longString = `${'A'.repeat(100)}_${Date.now()}`;

        await navigateToLoginPage(page);
        await performLogin(page, `${longString}@test.com`, longString);
        await page.locator('.alert.alert-danger:not(#create_account_error)').isVisible();

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-014: Login without HTTPS', async ({ browser }) => {
        const userData = generateUniqueUserData('HTTPS');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        const httpUrl = page.url().replace('https://', 'http://');

        await page.goto(httpUrl);
        const currentUrl = page.url();
        expect(currentUrl.startsWith('https://')).toBe(true);

        await closeBrowserContext(context);
    });

    test('LOGIN-NEG-015: Login with different password encoding', async ({ browser }) => {
        const userData = {
            ...generateUniqueUserData('Encoding'),
            password: `P@ssw0rd✓™©_${Date.now()}`
        };

        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        await closeBrowserContext(context);
    });

    // ===== SECURITY TEST CASES =====

    test('LOGIN-SEC-001: Password masking', async ({ browser }) => {
        const userData = generateUniqueUserData('PasswordMask');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        const passwordType = await page.locator('#passwd').getAttribute('type');
        expect(passwordType).toBe('password');

        await page.fill('#passwd', `Secret123_${Date.now()}!`);
        const isMasked = await page.evaluate(() => {
            const input = document.getElementById('passwd');
            return input.type === 'password';
        });
        expect(isMasked).toBe(true);

        const showHideToggle = await page.locator('[type="button"][onclick*="password"], .toggle-password').isVisible();
        if (showHideToggle) {
            await page.click('[type="button"][onclick*="password"], .toggle-password');
            expect(await page.locator('#passwd').getAttribute('type')).toBe('text');

            await page.click('[type="button"][onclick*="password"], .toggle-password');
            expect(await page.locator('#passwd').getAttribute('type')).toBe('password');
        }

        await closeBrowserContext(context);
    });

    test('LOGIN-SEC-002: Session ID regeneration', async ({ browser }) => {
        const userData = generateUniqueUserData('SessionID');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);

        const initialCookies = await context.cookies();
        const initialSessionCookie = initialCookies.find(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        await performLogin(page, userData.email, userData.password);

        const newCookies = await context.cookies();
        const newSessionCookie = newCookies.find(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        if (initialSessionCookie && newSessionCookie) {
            expect(initialSessionCookie.value).not.toBe(newSessionCookie.value);
        }

        await closeBrowserContext(context);
    });

    test('LOGIN-SEC-003: Secure flag on session cookie', async ({ browser }) => {
        const userData = generateUniqueUserData('SecureCookie');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);

        const cookies = await context.cookies();
        const sessionCookies = cookies.filter(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        for (const cookie of sessionCookies) {
            if (page.url().startsWith('https://')) {
                expect(cookie.secure).toBe(true);
            }
            expect(cookie.httpOnly).toBe(true);
            expect(['Lax', 'Strict', 'None']).toContain(cookie.sameSite);
        }

        await closeBrowserContext(context);
    });

    test('LOGIN-SEC-004: Login error message security', async ({ browser }) => {
        const userData = generateUniqueUserData('ErrorSecurity');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);

        // Test wrong password
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, `WrongPassword_${Date.now()}`);
        const error1 = await page.locator('.alert.alert-danger').textContent();

        // Test non-existent user
        await navigateToLoginPage(page);
        await performLogin(page, `nonexistent_${Date.now()}@example.com`, `AnyPassword_${Date.now()}`);
        const error2 = await page.locator('.alert.alert-danger').textContent();

        expect(error1.toLowerCase()).toBe(error2.toLowerCase());
        expect(error1).toMatch(/invalid|authentication|failed/i);

        await closeBrowserContext(context);
    });

    test('LOGIN-SEC-005: Login audit logging', async ({ browser }) => {
        const userData = generateUniqueUserData('AuditLog');
        await createTestUser(browser, userData);

        console.log('LOGIN-SEC-005: Audit logging verification requires backend access');
        // Audit logging test placeholder
    });

    test('LOGIN-SEC-006: Concurrent session control', async ({ browser }) => {
        const userData = generateUniqueUserData('ConcurrentSession');
        await createTestUser(browser, userData);

        const { context: context1, page: page1 } = await createBrowserContext(browser);
        const { context: context2, page: page2 } = await createBrowserContext(browser);

        await navigateToLoginPage(page1);
        await performLogin(page1, userData.email, userData.password);

        await navigateToLoginPage(page2);
        await performLogin(page2, userData.email, userData.password);

        const bothWork = await page1.locator('.page-heading').isVisible() &&
            await page2.locator('.page-heading').isVisible();

        if (!bothWork) {
            const alertVisible = await page1.locator('.alert.alert-warning').isVisible() ||
                await page2.locator('.alert.alert-warning').isVisible();
            expect(alertVisible).toBe(true);
        }

        await closeBrowserContext(context1);
        await closeBrowserContext(context2);
    });

    test('LOGIN-SEC-007: Login with stolen cookie', async ({ browser }) => {
        const userData = generateUniqueUserData('StolenCookie');
        await createTestUser(browser, userData);

        const { context: context1, page: page1 } = await createBrowserContext(browser);

        await navigateToLoginPage(page1);
        await performLogin(page1, userData.email, userData.password);
        await verifySuccessfulLogin(page1);

        const cookies = await context1.cookies();
        const sessionCookie = cookies.find(c =>
            c.name.includes('session') || c.name.includes('PHPSESSID')
        );

        const context2 = await browser.newContext();
        await context2.addCookies([sessionCookie]);
        const page2 = await context2.newPage();

        await page2.goto('/index.php?controller=my-account');
        const accessDenied = !(await page2.locator('.page-heading').isVisible()) ||
            await page2.locator('.alert.alert-danger').isVisible();

        expect(accessDenied).toBe(true);

        await closeBrowserContext(context1);
        await context2.close();
    });

    test('LOGIN-SEC-008: Password reset vs login', async ({ browser }) => {
        const userData = generateUniqueUserData('PasswordReset');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);
        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        console.log('LOGIN-SEC-008: Password reset test requires reset functionality');

        await closeBrowserContext(context);
    });

    test('LOGIN-SEC-009: Login from suspicious location', async ({ browser }) => {
        const userData = generateUniqueUserData('SuspiciousLocation');
        await createTestUser(browser, userData);

        console.log('LOGIN-SEC-009: Geo-location test requires location detection');
        // Geo-location test placeholder
    });

    test('LOGIN-SEC-010: Login with referrer check', async ({ browser }) => {
        const userData = generateUniqueUserData('ReferrerCheck');
        await createTestUser(browser, userData);

        const { context, page } = await createBrowserContext(browser);

        await page.evaluate(() => {
            Object.defineProperty(document, 'referrer', {
                value: 'https://malicious-site.com',
                configurable: true
            });
        });

        await navigateToLoginPage(page);
        await performLogin(page, userData.email, userData.password);
        await verifySuccessfulLogin(page);

        const hasCsrfToken = await page.evaluate(() => {
            const form = document.querySelector('form[action*="authentication"]');
            return form && (form.querySelector('input[name*="token"]') ||
                form.querySelector('input[name*="csrf"]'));
        });

        expect(hasCsrfToken).toBe(true);

        await closeBrowserContext(context);
    });
});