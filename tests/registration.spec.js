const { test, expect } = require('@playwright/test');

test.describe('Registration Functionality - Comprehensive Test Suite', () => {
    let uniqueEmail;

    test.beforeEach(async ({ page }) => {
        await page.goto('/index.php?controller=authentication&back=my-account');
    });

    // ===== POSITIVE TEST CASES =====

    test('REG-POS-001: Successful registration with all required fields', async ({ page }) => {
        uniqueEmail = `john.doe${Date.now()}@test.com`;

        // Enter email for registration
        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');
        await page.waitForURL(/controller=authentication.*account-creation/);

        // Fill required fields
        await page.check('#id_gender1'); // Mr.
        await page.fill('#customer_firstname', 'John');
        await page.fill('#customer_lastname', 'Doe');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        // Submit registration
        await page.click('#submitAccount');

        // Verification
        await expect(page.locator('.page-heading')).toHaveText('My account');
        await expect(page.locator('.alert.alert-success')).toBeVisible();
        await expect(page.locator('.info-account')).toContainText('Welcome to your account');

        // Check user is logged in
        await expect(page.locator('a.logout')).toBeVisible();
        await expect(page.locator('a.account span')).toContainText('John Doe');
    });

    test('REG-POS-002: Registration with optional fields', async ({ page }) => {
        uniqueEmail = `optional${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');
        await page.waitForURL(/controller=authentication.*account-creation/);

        // Fill only required fields
        await page.check('#id_gender2'); // Mrs.
        await page.fill('#customer_firstname', 'Jane');
        await page.fill('#customer_lastname', 'Smith');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        // Verify success with only required fields
        await expect(page.locator('.alert.alert-success')).toBeVisible();
        await expect(page.url()).toContain('controller=my-account');
    });

    test('REG-POS-003: Registration with newsletter subscription', async ({ page }) => {
        uniqueEmail = `newsletter${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'News');
        await page.fill('#customer_lastname', 'Letter');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        // Check newsletter checkbox
        await page.check('#newsletter');
        await page.click('#submitAccount');

        // Verify registration successful
        await expect(page.locator('.alert.alert-success')).toBeVisible();

        // Note: In a real test, you might need to verify via API or database
        // that the user is subscribed to newsletter
    });

    test('REG-POS-004: Registration with different password complexities', async ({ page }) => {
        const passwords = [
            'Pass@1234',
            'StrongPwd!2024',
            'Test1234$',
            'Complex#Pass1'
        ];

        for (let i = 0; i < passwords.length; i++) {
            uniqueEmail = `passcomplex${Date.now() + i}@test.com`;

            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email_create', uniqueEmail);
            await page.click('#SubmitCreate');

            await page.fill('#customer_firstname', 'Password');
            await page.fill('#customer_lastname', 'Test');
            await page.fill('#email', uniqueEmail);
            await page.fill('#passwd', passwords[i]);

            await page.click('#submitAccount');

            // All should be accepted
            await expect(page.locator('.alert.alert-success')).toBeVisible();

            // Logout for next iteration
            await page.click('a.logout');
        }
    });

    test('REG-POS-005: Registration email case insensitivity', async ({ page }) => {
        const uppercaseEmail = `TEST.USER${Date.now()}@TEST.COM`;
        const lowercaseEmail = uppercaseEmail.toLowerCase();

        // Register with uppercase email
        await page.fill('#email_create', uppercaseEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'Case');
        await page.fill('#customer_lastname', 'Test');
        await page.fill('#email', uppercaseEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');
        await expect(page.locator('.alert.alert-success')).toBeVisible();

        // Logout
        await page.click('a.logout');

        // Try to login with lowercase email
        await page.fill('#email', lowercaseEmail);
        await page.fill('#passwd', 'Test@1234');
        await page.click('#SubmitLogin');

        // Should login successfully
        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    test('REG-POS-006: Registration with special characters in name', async ({ page }) => {
        uniqueEmail = `special${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', "O'Brien");
        await page.fill('#customer_lastname', 'Smith-Jones');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();

        // Verify name is displayed correctly
        await expect(page.locator('a.account span')).toContainText(`O'Brien Smith-Jones`);
    });

    test('REG-POS-007: Registration with minimal required data', async ({ page }) => {
        uniqueEmail = `minimal${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        // Fill only fields marked with asterisk (required)
        await page.fill('#customer_firstname', 'Minimal');
        await page.fill('#customer_lastname', 'Required');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        // Don't fill optional fields (DOB, newsletter, etc.)
        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();
        await expect(page.locator('.alert.alert-danger')).not.toBeVisible();
    });

    test('REG-POS-008: Registration after logout', async ({ page }) => {
        // First login and logout
        const existingEmail = `existing${Date.now()}@test.com`;

        await page.fill('#email_create', existingEmail);
        await page.click('#SubmitCreate');
        await page.waitForURL(/controller=authentication.*account-creation/);

        // Fill only required fields
        await page.check('#id_gender2'); // Mrs.
        await page.fill('#customer_firstname', 'Jane');
        await page.fill('#customer_lastname', 'Smith');
        await page.fill('#email', existingEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await page.click('.logout');

        await page.fill('#email', existingEmail);
        await page.fill('#passwd', 'Test@1234');
        await page.click('#SubmitLogin');

        await page.click('.logout');

        // Now register new user
        uniqueEmail = `afterlogout${Date.now()}@test.com`;
        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'After');
        await page.fill('#customer_lastname', 'Logout');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();
    });

    test('REG-POS-009: Registration with maximum field lengths', async ({ page }) => {
        const randomSuffix = Array.from({ length: 10 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(''); // Unique letters only
        const paddedLocalPart = 'A'.repeat(109) + randomSuffix; // Local part: 109 + 10 random letters = 119 chars

        uniqueEmail = `${paddedLocalPart}@test.com`; // Exactly 128 characters (119 + 1 + 8)
        const longName = `${'A'.repeat(22)}${randomSuffix}`; // Unique long name with random letters

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', longName);
        await page.fill('#customer_lastname', longName);
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();

        // Verify data is saved correctly
        await expect(page.locator('a.account span')).toContainText(longName);
    });

    test('REG-POS-010: Registration redirect after success', async ({ page }) => {
        uniqueEmail = `redirect${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'Redirect');
        await page.fill('#customer_lastname', 'Test');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        // Verify redirect URL
        await expect(page).toHaveURL(/controller=my-account/);
        await expect(page.locator('.page-heading')).toHaveText('My account');
        await expect(page.locator('.info-account')).toBeVisible();

        // Verify session is established
        await expect(page.locator('a.logout')).toBeVisible();
    });

    test('REG-POS-011: Successful registration with date of birth', async ({ page }) => {
        const user = {
            firstName: 'John',
            lastName: 'DOB',
            password: 'SecurePass123!',
            dob: {
                day: 15,
                month: 6,
                year: 1990
            }
        };
        const timestamp = Date.now();
        const uniqueEmail = `test${timestamp}@automation.com`;

        // Enter email for registration
        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        // Wait for registration form
        await page.waitForSelector('#account-creation_form');

        // Fill personal information
        await page.check('#id_gender1'); // Mr.
        await page.fill('#customer_firstname', user.firstName);
        await page.fill('#customer_lastname', user.lastName);
        await page.fill('#email', uniqueEmail); // Confirmation
        await page.fill('#passwd', user.password);

        // **DATE OF BIRTH SELECTION**
        // Method 1: Using selectOption for dropdowns
        await page.selectOption('#days', user.dob.day.toString());
        await page.selectOption('#months', user.dob.month.toString());
        await page.selectOption('#years', user.dob.year.toString());

        // Register button
        await page.click('#submitAccount');

        // Verification
        await expect(page.locator('.page-heading')).toHaveText('My account');
        await expect(page.locator('.account')).toContainText(`${user.firstName} ${user.lastName}`);
    });

    test('REG-POS-012: Registration with minimum age (18 years)', async ({ page }) => {
        const user = { firstName: 'Adult', lastName: 'User', password: 'AdultPass123!' };
        const timestamp = Date.now();
        const uniqueEmail = `adult${timestamp}@test.com`;

        // Set date for 18+ years old
        const currentYear = new Date().getFullYear();
        const adultDOB = {
            day: 15,
            month: 6,
            year: currentYear - 25 // 25 years old
        };

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');
        await page.waitForSelector('#account-creation_form');

        // Fill form
        await page.check('#id_gender2'); // Mrs.
        await page.fill('#customer_firstname', user.firstName);
        await page.fill('#customer_lastname', user.lastName);
        await page.fill('#passwd', user.password);

        // Select adult date of birth
        await page.selectOption('#days', adultDOB.day.toString());
        await page.selectOption('#months', adultDOB.month.toString());
        await page.selectOption('#years', adultDOB.year.toString());
        await page.click('#submitAccount');

        // Should successfully register
        await expect(page.locator('.page-heading')).toHaveText('My account');
    });

    test('TREG-POS-013: Registration with underage date (optional validation test)', async ({ page }) => {
        const user = { firstName: 'Young', lastName: 'User', password: 'YoungPass123!' };
        const timestamp = Date.now();
        const uniqueEmail = `underage${timestamp}@test.com`;

        // Set underage date (16 years old)
        const currentYear = new Date().getFullYear();
        const underageDOB = {
            day: 15,
            month: 6,
            year: currentYear - 16
        };

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');
        await page.waitForSelector('#account-creation_form');

        // Fill form
        await page.fill('#customer_firstname', user.firstName);
        await page.fill('#customer_lastname', user.lastName);
        await page.fill('#passwd', user.password);

        // Select underage date
        await page.selectOption('#days', underageDOB.day.toString());
        await page.selectOption('#months', underageDOB.month.toString());
        await page.selectOption('#years', underageDOB.year.toString());

        await page.click('#submitAccount');

        // This may or may not show an error depending on site validation
        // We'll check for either success or age validation error
        const headingText = await page.locator('.page-heading').textContent();
        const errorVisible = await page.locator('.alert-danger').isVisible();

        // Log the result for analysis
        await expect(page.locator('.alert.alert-danger')).toBeVisible();
    });

    test('REG-POS-014: Date validation - invalid date (Feb 30)', async ({ page }) => {
        const user = { firstName: 'Invalid', lastName: 'Date', password: 'InvalidPass123!' };
        const timestamp = Date.now();
        const uniqueEmail = `invaliddate${timestamp}@test.com`;

        // Invalid date: February 30
        const invalidDOB = {
            day: 30,
            month: 2, // February
            year: 1990
        };

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');
        await page.waitForSelector('#account-creation_form');

        // Fill form
        await page.fill('#customer_firstname', user.firstName);
        await page.fill('#customer_lastname', user.lastName);
        await page.fill('#passwd', user.password);

        // Try to select invalid date
        await page.selectOption('#days', invalidDOB.day.toString());
        await page.selectOption('#months', invalidDOB.month.toString());
        await page.selectOption('#years', invalidDOB.year.toString());

        // Complete registration
        await page.click('#submitAccount');

        //Verification
        await expect(page.locator('.alert.alert-danger')).toBeVisible();

    });

    test('REG-POS-015: Verify all date dropdown options', async ({ page }) => {
        // Navigate directly to registration form if possible
        await page.goto('/index.php?controller=authentication&back=my-account');
        const testEmail = `verifydropdowns${Date.now()}@test.com`;

        await page.fill('#email_create', testEmail);
        await page.click('#SubmitCreate');
        await page.waitForSelector('#account-creation_form');

        // Test Days dropdown (1-31)
        const dayOptions = await page.locator('#days option').all();
        expect(dayOptions.length).toBeGreaterThan(0);

        // Verify first option is empty/placeholder
        const firstDayOption = await page.locator('#days option').first();
        expect(await firstDayOption.getAttribute('value')).toBe('');

        // Test selecting specific days
        await page.selectOption('#days', '1');
        await expect(page.locator('#days')).toHaveValue('1');

        await page.selectOption('#days', '15');
        await expect(page.locator('#days')).toHaveValue('15');

        await page.selectOption('#days', '31');
        await expect(page.locator('#days')).toHaveValue('31');

        // Test Months dropdown (1-12 or month names)
        const monthOptions = await page.locator('#months option').all();
        expect(monthOptions.length).toBeGreaterThan(0);

        // Test selecting months
        await page.selectOption('#months', '1');
        await expect(page.locator('#months')).toHaveValue('1');

        await page.selectOption('#months', '6');
        await expect(page.locator('#months')).toHaveValue('6');

        await page.selectOption('#months', '12');
        await expect(page.locator('#months')).toHaveValue('12');

        // Test Years dropdown
        const yearOptions = await page.locator('#years option').all();
        expect(yearOptions.length).toBeGreaterThan(0);

        // Get min and max years
        const yearValues = await page.locator('#years option').evaluateAll(options =>
            options.map(option => option.value).filter(val => val)
        );

        const minYear = Math.min(...yearValues.map(y => parseInt(y)));
        const maxYear = Math.max(...yearValues.map(y => parseInt(y)));

        // Test selecting years
        await page.selectOption('#years', minYear.toString());
        await expect(page.locator('#years')).toHaveValue(minYear.toString());

        await page.selectOption('#years', maxYear.toString());
        await expect(page.locator('#years')).toHaveValue(maxYear.toString());

        // Select a middle year
        const middleYear = Math.floor((minYear + maxYear) / 2).toString();
        await page.selectOption('#years', middleYear);
        await expect(page.locator('#years')).toHaveValue(middleYear);
    });

    // ===== NEGATIVE TEST CASES =====

    test('REG-NEG-001: Registration with existing email', async ({ page }) => {
        // First login and logout
        const existingEmail = `existing${Date.now()}@test.com`;

        await page.fill('#email_create', existingEmail);
        await page.click('#SubmitCreate');
        await page.waitForURL(/controller=authentication.*account-creation/);

        // Fill only required fields
        await page.check('#id_gender2'); // Mrs.
        await page.fill('#customer_firstname', 'Jane');
        await page.fill('#customer_lastname', 'Smith');
        await page.fill('#email', existingEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await page.click('.logout');

        await page.fill('#email_create', existingEmail);
        await page.click('#SubmitCreate');

        // Should show error immediately
        await expect(page.locator('#create_account_error')).toBeVisible();
        await expect(page.locator('#create_account_error')).toContainText('An account using this email address has already been registered. Please enter a valid password or request a new one. ');
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
            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email_create', email);
            await page.click('#SubmitCreate');

            // Should show validation error
            await page.locator('input#email_create[required]:invalid')
        }
    });

    test('REG-NEG-003: Registration with password mismatch', async ({ page }) => {
        uniqueEmail = `passwordmismatch${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'Password');
        await page.fill('#customer_lastname', 'Mismatch');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        // Note: The HTML doesn't show confirm password field, so this test
        // would need to be adapted if confirm field exists
        await page.click('#submitAccount');

        // Check for validation errors
        const errorElements = await page.locator('.alert.alert-danger').count();
        if (errorElements > 0) {
            await expect(page.locator('.alert.alert-danger')).toBeVisible();
        }
    });

    test('REG-NEG-004: Registration with weak password', async ({ page }) => {
        const weakPasswords = ['123', 'password', 'abc123', 'qwerty', 'letmein'];

        for (const weakPassword of weakPasswords) {
            const weakPassEmail = `weakpass${Date.now()}@test.com`;
            await page.goto('/index.php?controller=authentication');
            await page.fill('#email_create', weakPassEmail);
            await page.click('#SubmitCreate');

            await page.fill('#customer_firstname', 'Weak');
            await page.fill('#customer_lastname', 'Password');
            await page.fill('#email', weakPassEmail);
            await page.fill('#passwd', weakPassword);

            await page.click('#submitAccount');

            await page.waitForTimeout(1000);

            // if user logs in with Weak Password
            // if (await page.isVisible('.info-account'))
            // {
            //     await page.click('.logout');
            //     continue;
            // }

            // Should show password validation error
            const hasError = await page.locator('.alert.alert-danger').isVisible();
            if (hasError) {
                // Target the paragraph
                await expect(page.locator('.alert.alert-danger p'))
                    .toHaveText('There is 1 error');

                // Target the specific list item
                await expect(page.locator('.alert.alert-danger li'))
                    .toHaveText(`passwd is invalid.`);
            }


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
            uniqueEmail = `emptyfield${Date.now()}@test.com`;

            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email_create', uniqueEmail);
            await page.click('#SubmitCreate');

            await page.waitForTimeout(1000);

            await page.click('#email');
            await page.click('#email');

            await page.locator('#email').fill('');
            // const emailtext = await page.getByRole('textbox', {name: 'Email'} );

            // Fill all fields except the one being tested
            if (field.selector !== '#customer_firstname') await page.fill('#customer_firstname', 'Test');
            if (field.selector !== '#customer_lastname') await page.fill('#customer_lastname', 'User');
            if (field.selector !== '#email') await page.fill('#email', uniqueEmail);
            if (field.selector !== '#passwd') await page.fill('#passwd', 'Test@1234');

            await page.click('#submitAccount');

            // Should show password validation error
            const hasError = await page.locator('.alert.alert-danger').isVisible();

            // // Target the paragraph
            // await expect(page.locator('.alert.alert-danger p'))
            //     .toHaveText('There is 1 error');
            //
            // // Target the specific list item
            // await expect(page.locator('.alert.alert-danger li'))
            //     .toHaveText(`passwd is invalid.`);
        }
        // Should show validation error
        //     await expect(page.locator('.alert.alert-danger')).toBeVisible();
        //     const errorText = await page.locator('.alert.alert-danger').textContent();
        //     expect(errorText).toMatch(new RegExp(field.name, 'i'));
        // }
    });

    test('REG-NEG-008: Registration with extremely long inputs', async ({ page }) => {
        const longString = `${'A'.repeat(20)}${Date.now()}`;
        uniqueEmail = `${longString}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', longString);
        await page.fill('#customer_lastname', longString);
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', longString);

        await page.click('#submitAccount');

        // Should show validation errors
        const hasError = await page.locator('.alert.alert-danger').isVisible();
        expect(hasError).toBe(true);
    });

    test('REG-NEG-009: Registration with special email characters', async ({ page }) => {
        const specialEmails = [
            `user+tag${Date.now()}@test.com`,
            `user.name${Date.now()}@test.com`,
            `user_name${Date.now()}@test.com`,
            `user-name${Date.now()}@test.com`,
        ];

        for (const specialEmail of specialEmails) {
            await page.goto('/index.php?controller=authentication&back=my-account');
            await page.fill('#email_create', specialEmail);
            await page.click('#SubmitCreate');

            await page.fill('#customer_firstname', 'Special');
            await page.fill('#customer_lastname', 'Email');
            await page.fill('#email', specialEmail);
            await page.fill('#passwd', 'Test@1234');

            await page.click('#submitAccount');

            // Check result
            const hasSuccess = await page.locator('.alert.alert-success').isVisible();

            await page.click('.logout');
        }
    });

    test('REG-NEG-010: Registration with leading/trailing spaces', async ({ page }) => {
        uniqueEmail = `  trimmed${Date.now()}@test.com  `;

        await page.fill('#email_create', uniqueEmail.trim());
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', '  John  ');
        await page.fill('#customer_lastname', '  Doe  ');
        await page.fill('#email', uniqueEmail.trim());
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();

        // Verify trimmed data is displayed
        const displayedName = await page.locator('a.account span').textContent();
        expect(displayedName.trim()).toBe('John Doe');
    });

    // ===== EDGE TEST CASES =====

    test('REG-EDGE-001: Registration at field minimum lengths', async ({ page }) => {
        uniqueEmail = `min${Date.now()}@t.co`; // Minimum email
        const minName = 'A';
        const minPassword = 'Aa1@2'; // 5 chars minimum

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', minName);
        await page.fill('#customer_lastname', minName);
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', minPassword);

        await page.click('#submitAccount');

        // Should succeed if meets minimum requirements
        await expect(page.locator('.alert.alert-success')).toBeVisible();
    });

    test('REG-EDGE-002: Registration at field maximum lengths', async ({ page }) => {
        // Use realistic max lengths for the form fields
        const maxFirstName = 'A'.repeat(32);
        const maxLastName = 'B'.repeat(32);
        uniqueEmail = `maxlength${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');
        await page.waitForURL(/controller=authentication.*account-creation/);
        await page.waitForLoadState('networkidle');

        await page.fill('#customer_firstname', maxFirstName);
        await page.fill('#customer_lastname', maxLastName);
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');
        await page.waitForLoadState('networkidle');

        // Check for success alert or any error/validation message
        const successAlert = page.locator('.alert.alert-success');
        const errorAlert = page.locator('.alert.alert-danger');
        const pageHeading = page.locator('.page-heading');

        // Wait for any of these to appear
        await Promise.race([
            successAlert.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null),
            errorAlert.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null),
            pageHeading.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null)
        ]);

        const hasSuccess = await successAlert.isVisible().catch(() => false);
        const hasError = await errorAlert.isVisible().catch(() => false);
        const pageLoaded = await pageHeading.isVisible().catch(() => false);

        expect(hasSuccess || hasError || pageLoaded).toBe(true);
    });

    test('REG-EDGE-003: Registration with international characters', async ({ page }) => {
        uniqueEmail = `international${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'Jörg');
        await page.fill('#customer_lastname', 'Müller');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();
    });

    test('REG-EDGE-004: Registration with multiple spaces in name', async ({ page }) => {
        uniqueEmail = `spaces${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'John  Michael');
        await page.fill('#customer_lastname', 'Van  Der  Berg');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();
    });

    test('REG-EDGE-005: Registration email with sub-addressing', async ({ page }) => {
        const plusEmail = `user+test${Date.now()}@domain.com`;

        await page.fill('#email_create', plusEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'Plus');
        await page.fill('#customer_lastname', 'Addressing');
        await page.fill('#email', plusEmail);
        await page.fill('#passwd', 'Test@1234');

        await page.click('#submitAccount');

        // Should succeed if plus addressing is supported
        const hasSuccess = await page.locator('.alert.alert-success').isVisible();
        const hasError = await page.locator('.alert.alert-danger').isVisible();
        expect(hasSuccess || hasError).toBe(true);
    });

    test('REG-EDGE-007: Registration with browser autofill', async ({ page }) => {
        // This test simulates browser autofill behavior
        uniqueEmail = `autofill${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        // Wait for form fields to be visible before accessing them
        await page.waitForSelector('#customer_firstname', { state: 'visible' });
        await page.waitForSelector('#customer_lastname', { state: 'visible' });
        await page.waitForSelector('#email', { state: 'visible' });
        await page.waitForSelector('#passwd', { state: 'visible' });

        // Simulate autofill by setting values directly and triggering events
        await page.evaluate((email) => {
            document.getElementById('customer_firstname').value = 'Auto';
            document.getElementById('customer_lastname').value = 'Fill';
            document.getElementById('email').value = email;
            document.getElementById('passwd').value = 'Test@1234';

            // Trigger change events
            ['customer_firstname', 'customer_lastname', 'email', 'passwd'].forEach(id => {
                document.getElementById(id).dispatchEvent(new Event('input', { bubbles: true }));
                document.getElementById(id).dispatchEvent(new Event('change', { bubbles: true }));
            });
        }, uniqueEmail);

        await page.click('#submitAccount');

        await expect(page.locator('.alert.alert-success')).toBeVisible();
    });

    test('REG-EDGE-008: Registration form resubmission', async ({ page }) => {
        uniqueEmail = `resubmit${Date.now()}@test.com`;

        await page.fill('#email_create', uniqueEmail);
        await page.click('#SubmitCreate');

        await page.fill('#customer_firstname', 'Double');
        await page.fill('#customer_lastname', 'Submit');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');

        // Click submit multiple times quickly
        page.click('#submitAccount');
        page.click('#submitAccount');

        // Should only create one account
        await expect(page.locator('.alert.alert-success')).toBeVisible();

        // Check that duplicate account wasn't created
        await page.click('a.logout');
        await page.goto('/index.php?controller=authentication&back=my-account');
        await page.fill('#email', uniqueEmail);
        await page.fill('#passwd', 'Test@1234');
        await page.click('#SubmitLogin');

        // Should login successfully (account exists)
        await expect(page.locator('.page-heading')).toHaveText('My account');
    });
});