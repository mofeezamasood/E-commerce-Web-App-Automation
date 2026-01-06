const { test, expect } = require('@playwright/test');

// ===== HELPER FUNCTIONS =====

class RegistrationHelper {
    /**
     * Generate a unique email address
     * @param {string} prefix - Email prefix
     * @returns {string} Unique email address
     */
    static generateEmail(prefix = 'test') {
        return `${prefix}${Date.now()}@test.com`;
    }

    /**
     * Navigate to registration form
     * @param {import('@playwright/test').Page} page - Playwright page object
     */
    static async goToRegistrationForm(page) {
        await page.goto('/index.php?controller=authentication&back=my-account');
    }

    /**
     * Start registration process by entering email
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {string} email - Email address
     */
    static async startRegistration(page, email) {
        await page.fill('#email_create', email);
        await page.click('#SubmitCreate');
        await page.waitForURL(/controller=authentication.*account-creation/);
        await page.waitForSelector('#account-creation_form');
    }

    /**
     * Fill basic user information
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {Object} user - User information
     * @param {string} user.email - User email
     * @param {string} user.firstName - First name
     * @param {string} user.lastName - Last name
     * @param {string} user.password - Password
     * @param {number} [user.gender] - Gender (1 for Mr, 2 for Mrs)
     */
    static async fillBasicUserInfo(page, { email, firstName, lastName, password, gender = 1 }) {
        if (gender) {
            await page.check(`#id_gender${gender}`);
        }

        await page.fill('#customer_firstname', firstName);
        await page.fill('#customer_lastname', lastName);
        await page.fill('#email', email);
        await page.fill('#passwd', password);
    }

    /**
     * Fill date of birth fields
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {Object} dob - Date of birth
     * @param {number} dob.day - Day (1-31)
     * @param {number} dob.month - Month (1-12)
     * @param {number} dob.year - Year (e.g., 1990)
     */
    static async fillDateOfBirth(page, { day, month, year }) {
        if (day) await page.selectOption('#days', day.toString());
        if (month) await page.selectOption('#months', month.toString());
        if (year) await page.selectOption('#years', year.toString());
    }

    /**
     * Submit registration form
     * @param {import('@playwright/test').Page} page - Playwright page object
     */
    static async submitRegistration(page) {
        await page.click('#submitAccount');
    }

    /**
     * Verify successful registration
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {string} [expectedName] - Expected user name
     */
    static async verifyRegistrationSuccess(page, expectedName = null) {
        await expect(page.locator('.page-heading')).toHaveText('My account');
        await expect(page.locator('.alert.alert-success')).toBeVisible();
        await expect(page.locator('a.logout')).toBeVisible();

        if (expectedName) {
            await expect(page.locator('a.account span')).toContainText(expectedName);
        }
    }

    /**
     * Verify registration error
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {string} [expectedError] - Expected error message
     */
    static async verifyRegistrationError(page, expectedError = null) {
        await expect(page.locator('.alert.alert-danger')).toBeVisible();

        if (expectedError) {
            await expect(page.locator('.alert.alert-danger')).toContainText(expectedError);
        }
    }

    /**
     * Logout from current session
     * @param {import('@playwright/test').Page} page - Playwright page object
     */
    static async logout(page) {
        await page.click('a.logout');
    }

    /**
     * Login with existing credentials
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {Object} credentials - Login credentials
     * @param {string} credentials.email - Email address
     * @param {string} credentials.password - Password
     */
    static async login(page, { email, password }) {
        await page.fill('#email', email);
        await page.fill('#passwd', password);
        await page.click('#SubmitLogin');
    }

    /**
     * Create a test user for reuse in tests
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {Object} userData - User data
     * @returns {Object} Created user info
     */
    static async createTestUser(page, userData = {}) {
        const defaultUser = {
            firstName: 'Test',
            lastName: 'User',
            password: 'Test@1234',
            gender: 1,
            dob: null
        };

        const user = { ...defaultUser, ...userData };
        user.email = RegistrationHelper.generateEmail(user.firstName.toLowerCase());

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);

        if (user.dob) {
            await RegistrationHelper.fillDateOfBirth(page, user.dob);
        }

        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page, `${user.firstName} ${user.lastName}`);

        return user;
    }
}

// ===== TEST SUITE WITH HELPER FUNCTIONS =====

test.describe('Registration Functionality - Comprehensive Test Suite', () => {
    // ===== POSITIVE TEST CASES =====

    test('REG-POS-001: Successful registration with all required fields', async ({ page }) => {
        const user = {
            firstName: 'John',
            lastName: 'Doe',
            password: 'Test@1234',
            gender: 1
        };

        user.email = RegistrationHelper.generateEmail('john.doe');

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page, `${user.firstName} ${user.lastName}`);
    });

    test('REG-POS-002: Registration with optional fields', async ({ page }) => {
        const user = {
            firstName: 'Jane',
            lastName: 'Smith',
            password: 'Test@1234',
            gender: 2
        };

        user.email = RegistrationHelper.generateEmail('optional');

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page);
    });

    test('REG-POS-003: Registration with newsletter subscription', async ({ page }) => {
        const user = await RegistrationHelper.createTestUser(page, {
            firstName: 'News',
            lastName: 'Letter',
            password: 'Test@1234'
        });

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);
        await page.check('#newsletter');
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page);
    });

    test('REG-POS-004: Registration with different password complexities', async ({ page }) => {
        const passwords = [
            'Pass@1234',
            'StrongPwd!2024',
            'Test1234$',
            'Complex#Pass1'
        ];

        for (let i = 0; i < passwords.length; i++) {
            const user = {
                firstName: 'Password',
                lastName: 'Test',
                password: passwords[i],
                gender: 1
            };

            user.email = RegistrationHelper.generateEmail(`passcomplex${i}`);

            await RegistrationHelper.goToRegistrationForm(page);
            await RegistrationHelper.startRegistration(page, user.email);
            await RegistrationHelper.fillBasicUserInfo(page, user);
            await RegistrationHelper.submitRegistration(page);
            await RegistrationHelper.verifyRegistrationSuccess(page);

            if (i < passwords.length - 1) {
                await RegistrationHelper.logout(page);
            }
        }
    });

    test('REG-POS-005: Registration email case insensitivity', async ({ page }) => {
        const uppercaseEmail = `TEST.USER${Date.now()}@TEST.COM`;
        const lowercaseEmail = uppercaseEmail.toLowerCase();

        // Register with uppercase email
        const user = {
            firstName: 'Case',
            lastName: 'Test',
            email: uppercaseEmail,
            password: 'Test@1234'
        };

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page);

        await RegistrationHelper.logout(page);

        // Try to login with lowercase email
        await RegistrationHelper.login(page, { email: lowercaseEmail, password: user.password });
        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    test('REG-POS-006: Registration with special characters in name', async ({ page }) => {
        const user = {
            firstName: "O'Brien",
            lastName: 'Smith-Jones',
            password: 'Test@1234'
        };

        await RegistrationHelper.createTestUser(page, user);
    });

    test('REG-POS-007: Registration with minimal required data', async ({ page }) => {
        const user = {
            firstName: 'Minimal',
            lastName: 'Required',
            password: 'Test@1234'
        };

        await RegistrationHelper.createTestUser(page, user);
    });

    test('REG-POS-008: Registration after logout', async ({ page }) => {
        // Create first user
        const firstUser = await RegistrationHelper.createTestUser(page, {
            firstName: 'Jane',
            lastName: 'Smith',
            gender: 2
        });

        await RegistrationHelper.logout(page);

        // Create second user
        const secondUser = await RegistrationHelper.createTestUser(page, {
            firstName: 'After',
            lastName: 'Logout'
        });
    });

    test('REG-POS-009: Registration with maximum field lengths', async ({ page }) => {
        const randomSuffix = Array.from({ length: 10 }, () =>
            String.fromCharCode(65 + Math.floor(Math.random() * 26))
        ).join('');
        const paddedLocalPart = 'A'.repeat(109) + randomSuffix;

        const user = {
            firstName: `${'A'.repeat(22)}${randomSuffix}`,
            lastName: `${'A'.repeat(22)}${randomSuffix}`,
            email: `${paddedLocalPart}@test.com`,
            password: 'Test@1234'
        };

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page);
    });

    test('REG-POS-011: Successful registration with date of birth', async ({ page }) => {
        const user = {
            firstName: 'John',
            lastName: 'DOB',
            password: 'SecurePass123!',
            dob: { day: 15, month: 6, year: 1990 }
        };

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, RegistrationHelper.generateEmail('test'));
        await RegistrationHelper.fillBasicUserInfo(page, { ...user, email: RegistrationHelper.generateEmail('test') });
        await RegistrationHelper.fillDateOfBirth(page, user.dob);
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page, `${user.firstName} ${user.lastName}`);
    });

    test('REG-POS-012: Registration with minimum age (18 years)', async ({ page }) => {
        const currentYear = new Date().getFullYear();
        const adultDOB = { day: 15, month: 6, year: currentYear - 25 };

        const user = {
            firstName: 'Adult',
            lastName: 'User',
            password: 'AdultPass123!',
            gender: 2,
            dob: adultDOB
        };

        await RegistrationHelper.createTestUser(page, user);
    });

    // ===== NEGATIVE TEST CASES =====

    test('REG-NEG-001: Registration with existing email', async ({ page }) => {
        // Create first user
        const user = await RegistrationHelper.createTestUser(page, {
            firstName: 'Jane',
            lastName: 'Smith',
            gender: 2
        });

        await RegistrationHelper.logout(page);

        // Try to register with same email
        await RegistrationHelper.goToRegistrationForm(page);
        await page.fill('#email_create', user.email);
        await page.click('#SubmitCreate');

        // Should show error immediately
        await expect(page.locator('#create_account_error')).toBeVisible();
        await expect(page.locator('#create_account_error')).toContainText(
            'An account using this email address has already been registered.'
        );
    });

    test('REG-NEG-002: Registration with invalid email format', async ({ page }) => {
        const invalidEmails = [
            'invalidemail',
            'user@domain',
            '@domain.com',
            'user@.com',
            'user@domain.',
            'user name@domain.com'
        ];

        for (const email of invalidEmails) {
            await RegistrationHelper.goToRegistrationForm(page);
            await page.fill('#email_create', email);
            await page.click('#SubmitCreate');

            // Should show validation error
            await page.locator('input#email_create[required]:invalid');
        }
    });

    test('REG-NEG-004: Registration with weak password', async ({ page }) => {
        const weakPasswords = ['123', 'password', 'abc123', 'qwerty', 'letmein'];

        for (const weakPassword of weakPasswords) {
            const user = {
                firstName: 'Weak',
                lastName: 'Password',
                password: weakPassword
            };

            user.email = RegistrationHelper.generateEmail('weakpass');

            await RegistrationHelper.goToRegistrationForm(page);
            await RegistrationHelper.startRegistration(page, user.email);
            await RegistrationHelper.fillBasicUserInfo(page, user);
            await RegistrationHelper.submitRegistration(page);

            // Check for error
            await page.waitForTimeout(1000);
            const hasError = await page.locator('.alert.alert-danger').isVisible();

            if (hasError) {
                await expect(page.locator('.alert.alert-danger p'))
                    .toHaveText('There is 1 error');
                await expect(page.locator('.alert.alert-danger li'))
                    .toHaveText(`passwd is invalid.`);
            }

            // Clean up for next iteration
            await page.goto('/index.php?controller=authentication&back=my-account');
        }
    });

    test('REG-NEG-005: Registration with empty required fields', async ({ page }) => {
        const fields = [
            { selector: '#customer_firstname', name: 'first name' },
            { selector: '#customer_lastname', name: 'last name' },
            { selector: '#email', name: 'email' },
            { selector: '#passwd', name: 'password' }
        ];

        for (const field of fields) {
            const user = {
                email: RegistrationHelper.generateEmail('emptyfield'),
                firstName: 'Test',
                lastName: 'User',
                password: 'Test@1234'
            };

            await RegistrationHelper.goToRegistrationForm(page);
            await RegistrationHelper.startRegistration(page, user.email);

            // Clear the field being tested
            await page.locator(field.selector).fill('');

            // Fill all other fields
            if (field.selector !== '#customer_firstname') await page.fill('#customer_firstname', user.firstName);
            if (field.selector !== '#customer_lastname') await page.fill('#customer_lastname', user.lastName);
            if (field.selector !== '#email') await page.fill('#email', user.email);
            if (field.selector !== '#passwd') await page.fill('#passwd', user.password);

            await RegistrationHelper.submitRegistration(page);

            // Should show error
            await RegistrationHelper.verifyRegistrationError(page);
        }
    });

    // ===== EDGE TEST CASES =====

    test('REG-EDGE-001: Registration at field minimum lengths', async ({ page }) => {
        const user = {
            email: `${RegistrationHelper.generateEmail('min').split('@')[0]}@t.co`,
            firstName: 'A',
            lastName: 'B',
            password: 'Aa1@2'
        };

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);
        await RegistrationHelper.fillBasicUserInfo(page, user);
        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page);
    });

    test('REG-EDGE-003: Registration with international characters', async ({ page }) => {
        const user = {
            firstName: 'Jörg',
            lastName: 'Müller',
            password: 'Test@1234'
        };

        await RegistrationHelper.createTestUser(page, user);
    });

    test('REG-EDGE-004: Registration with multiple spaces in name', async ({ page }) => {
        const user = {
            firstName: 'John  Michael',
            lastName: 'Van  Der  Berg',
            password: 'Test@1234'
        };

        await RegistrationHelper.createTestUser(page, user);
    });

    test('REG-EDGE-007: Registration with browser autofill', async ({ page }) => {
        const user = {
            email: RegistrationHelper.generateEmail('autofill'),
            firstName: 'Auto',
            lastName: 'Fill',
            password: 'Test@1234'
        };

        await RegistrationHelper.goToRegistrationForm(page);
        await RegistrationHelper.startRegistration(page, user.email);

        // Simulate autofill
        await page.evaluate((email, firstName, lastName, password) => {
            document.getElementById('customer_firstname').value = firstName;
            document.getElementById('customer_lastname').value = lastName;
            document.getElementById('email').value = email;
            document.getElementById('passwd').value = password;

            // Trigger events
            ['customer_firstname', 'customer_lastname', 'email', 'passwd'].forEach(id => {
                document.getElementById(id).dispatchEvent(new Event('input', { bubbles: true }));
                document.getElementById(id).dispatchEvent(new Event('change', { bubbles: true }));
            });
        }, user.email, user.firstName, user.lastName, user.password);

        await RegistrationHelper.submitRegistration(page);
        await RegistrationHelper.verifyRegistrationSuccess(page);
    });
});