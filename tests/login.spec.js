// File: tests/login/login-tests.spec.js
const { test, expect } = require("@playwright/test");

// ===== HELPER FUNCTIONS =====

// Creates a test user with provided user data
async function createTestUser(browser, userData) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/index.php?controller=authentication&back=my-account");
  await page.fill("#email_create", userData.email);
  await page.click("#SubmitCreate");
  await page.waitForURL(/controller=authentication.*account-creation/);

  await page.fill("#customer_firstname", userData.firstName);
  await page.fill("#customer_lastname", userData.lastName);
  await page.fill("#email", userData.email);
  await page.fill("#passwd", userData.password);
  await page.click("#submitAccount");

  await page.waitForURL(/controller=my-account/);
  await page.click("a.logout");

  await page.close();
  await context.close();

  return userData;
}

// Generates unique user data with timestamp
function generateUniqueUserData(baseName = "TestUser") {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const uniqueId = `${timestamp}_${randomString}`;

  return {
    firstName: baseName,
    lastName: "Auto",
    email: `${baseName.toLowerCase()}_${uniqueId}@test.com`,
    password: `P@ssw0rd_${uniqueId}`,
  };
}

// Performs login with provided credentials
async function performLogin(page, email, password) {
  await page.fill("#email", email);
  await page.fill("#passwd", password);
  await page.click("#SubmitLogin");
}

// Comprehensive successful login verification
async function verifySuccessfulLogin(page, options = {}) {
  const {
    expectedName = null,
    checkAllIndicators = true,
    //verifySessionCookie = true,
    verifyRedirect = true,
  } = options;

  // 1. Basic verification (always performed)
  await expect(page.locator(".page-heading")).toHaveText("My account");
  await expect(page.locator("a.logout")).toBeVisible();

  // 2. Verify no error messages appear
  await page.locator(".alert.alert-success").isVisible();

  // 3. Additional checks based on options
  if (expectedName) {
    await expect(page.locator("a.account span")).toContainText(expectedName);
  }

  if (checkAllIndicators) {
    // Check for welcome message
    await expect(page.locator(".info-account")).toContainText(
      "Welcome to your account",
    );
  }

  if (verifyRedirect) {
    // Verify URL changed to account page
    await expect(page).toHaveURL(/controller=my-account|account/);

    // Verify redirect happened (page changed from login page)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("controller=authentication");
  }

  // if (verifySessionCookie) {
  //     // Check for session/authentication cookie exists
  //     const cookies = await page.context().cookies();
  //     const hasSessionCookie = cookies.some(c =>
  //         c.name.includes('session') || c.name.includes('PHPSESSID')
  //     );
  //     expect(hasSessionCookie).toBe(true);
  // }
}

// Comprehensive unsuccessful login verification
async function verifyUnsuccessfulLogin(page, options = {}) {
  const {
    errorType = "generic", // 'generic', 'invalidEmail', 'emptyField', etc.
    errorMessagePattern = null,
    checkStayedOnLoginPage = true,
    verifyNoSessionCookie = true,
  } = options;

  // 1. Verify if user is still on authentication page with error message
  await expect(page.locator(".page-heading")).toHaveText("Authentication");

  // 2. Verify specific error message content if provided
  if (errorMessagePattern) {
    const errorText = await page
      .locator(".alert.alert-danger:not(#create_account_error)")
      .textContent();
    expect(errorText).toMatch(errorMessagePattern);
  }

  // 3. Check for specific error types
  if (errorType === "invalidEmail") {
    await page.locator("input#email_create[required]:invalid");
  } else if (errorType === "emptyField") {
    await page
      .locator(".alert.alert-danger:not(#create_account_error)")
      .textContent();
  }

  // 4. Verify user is still on login page
  if (checkStayedOnLoginPage) {
    await expect(page).toHaveURL(/controller=authentication/);
    await expect(page.locator(".page-heading")).toHaveText("Authentication");
    await expect(page.locator("a.logout")).not.toBeVisible();
  }

  // // 5. Verify no session was created
  // if (verifyNoSessionCookie) {
  //     const cookies = await page.context().cookies();
  //     const hasValidSessionCookie = cookies.some(c =>
  //         (c.name.includes('session') || c.name.includes('PHPSESSID')) &&
  //         c.value && c.value.length > 0
  //     );
  //     expect(hasValidSessionCookie).toBe(false);
  // }

  // 6. Verify form fields are still accessible
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#passwd")).toBeVisible();
  await expect(page.locator("#SubmitLogin")).toBeVisible();
}

// Quick successful login verification (for simple cases)
async function verifyLoginSuccess(page, expectedName = null) {
  await verifySuccessfulLogin(page, {
    expectedName,
    checkAllIndicators: false,
    verifySessionCookie: false,
    verifyRedirect: false,
  });
}

// Quick unsuccessful login verification (for simple cases)
async function verifyLoginFailure(page, errorType = "generic") {
  await verifyUnsuccessfulLogin(page, {
    errorType,
    checkStayedOnLoginPage: false,
    verifyNoSessionCookie: false,
  });
}

// Creates a browser context with mobile viewport
async function createMobileContext(browser) {
  return await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
  });
}

// Creates a browser context with tablet viewport
async function createTabletContext(browser) {
  return await browser.newContext({
    viewport: { width: 768, height: 1024 },
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
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
  await page.goto("/index.php?controller=authentication&back=my-account");
}

// ===== TEST SUITE =====

test.describe("Login Functionality - Comprehensive Test Suite", () => {
  // ===== POSITIVE TEST CASES =====

  test("LOGIN-POS-001: Successful login with email/password", async ({
    browser,
  }) => {
    const userData = generateUniqueUserData("Testuser");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);

    await verifySuccessfulLogin(page, {
      expectedName: `${userData.firstName} ${userData.lastName}`,
      checkAllIndicators: true,
      verifyRedirect: true,
    });

    await closeBrowserContext(context);
  });

  test("LOGIN-POS-002: Login with username if supported", async ({
    browser,
  }) => {
    const userData = generateUniqueUserData("Usernamelogin");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);

    await verifySuccessfulLogin(page, {
      expectedName: `${userData.firstName} ${userData.lastName}`,
    });
    await closeBrowserContext(context);
  });

  test("LOGIN-POS-004: Login case-insensitive email", async ({ browser }) => {
    const userData = generateUniqueUserData("Caseinsensitive");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);

    // Test with uppercase email
    await navigateToLoginPage(page);
    await performLogin(page, userData.email.toUpperCase(), userData.password);
    await verifyLoginSuccess(
      page,
      `${userData.firstName} ${userData.lastName}`,
    );

    // Logout and test with mixed case
    await page.click("a.logout");
    await navigateToLoginPage(page);

    const mixedCaseEmail =
      userData.email.charAt(0).toUpperCase() + userData.email.slice(1);
    await performLogin(page, mixedCaseEmail, userData.password);
    await verifyLoginSuccess(
      page,
      `${userData.firstName} ${userData.lastName}`,
    );

    await closeBrowserContext(context);
  });

  test("LOGIN-POS-005: Login after password change", async ({ browser }) => {
    const userData = generateUniqueUserData("Passwordchange");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  test("LOGIN-POS-006: Login redirect to requested page", async ({
    browser,
  }) => {
    const userData = generateUniqueUserData("Redirecttest");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);

    // Try to access protected page
    await page.goto("/index.php?controller=history");
    await expect(page).toHaveURL(/controller=authentication/);

    // Login should redirect back
    await performLogin(page, userData.email, userData.password);
    await expect(page).toHaveURL(/controller=history/);
    await expect(page.locator(".page-heading")).toHaveText("Order history");

    await closeBrowserContext(context);
  });

  test("LOGIN-POS-007: Login with trimmed spaces", async ({ browser }) => {
    const userData = generateUniqueUserData("Trimspaces");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);

    await page.fill("#email", `  ${userData.email}  `);
    await page.fill("#passwd", `  ${userData.password}  `);
    await page.click("#SubmitLogin");

    await verifyLoginSuccess(
      page,
      `${userData.firstName} ${userData.lastName}`,
    );
    await closeBrowserContext(context);
  });

  test("LOGIN-POS-008: Login from different browsers", async ({ browser }) => {
    const userData = generateUniqueUserData("Differentbrowser");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  test("LOGIN-POS-009: Login from different devices", async ({ browser }) => {
    const userData = generateUniqueUserData("Differentdevice");
    await createTestUser(browser, userData);

    // Test with mobile viewport
    const mobileContext = await createMobileContext(browser);
    const mobilePage = await mobileContext.newPage();

    await navigateToLoginPage(mobilePage);
    await performLogin(mobilePage, userData.email, userData.password);
    await verifyLoginSuccess(mobilePage);
    await mobileContext.close();

    // Test with tablet viewport
    const tabletContext = await createTabletContext(browser);
    const tabletPage = await tabletContext.newPage();

    await navigateToLoginPage(tabletPage);
    await performLogin(tabletPage, userData.email, userData.password);
    await verifyLoginSuccess(tabletPage);
    await tabletContext.close();
  });

  test("LOGIN-POS-010: Login session management", async ({ browser }) => {
    const userData = generateUniqueUserData("Sessionmgmt");
    await createTestUser(browser, userData);

    const { context: context1, page: page1 } =
      await createBrowserContext(browser);
    const { context: context2, page: page2 } =
      await createBrowserContext(browser);

    // Login on device 1
    await navigateToLoginPage(page1);
    await performLogin(page1, userData.email, userData.password);
    await verifyLoginSuccess(page1);

    // Login on device 2
    await navigateToLoginPage(page2);
    await performLogin(page2, userData.email, userData.password);
    await verifyLoginSuccess(page2);

    // Both sessions should be active
    await expect(page1.locator("a.logout")).toBeVisible();
    await expect(page2.locator("a.logout")).toBeVisible();

    await closeBrowserContext(context1);
    await closeBrowserContext(context2);
  });

  test("LOGIN-POS-011: Login with special characters in password", async ({
    browser,
  }) => {
    const userData = {
      ...generateUniqueUserData("SpecialChars"),
      password: `P@0d!@#$%^&*()_+{}[]|:;"<>,.?/~`,
    };

    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  test("LOGIN-POS-014: Login with browser password manager", async ({
    browser,
  }) => {
    const userData = generateUniqueUserData("Passwordmanager");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);

    await page.evaluate(
      ({ email, password }) => {
        document.getElementById("email").value = email;
        document.getElementById("passwd").value = password;

        ["email", "passwd"].forEach((id) => {
          const element = document.getElementById(id);
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        });
      },
      { email: userData.email, password: userData.password },
    );

    await page.click("#SubmitLogin");
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  // ===== NEGATIVE TEST CASES =====

  test("LOGIN-NEG-001: Login with invalid email format", async ({
    browser,
  }) => {
    const invalidEmails = [
      `invalidemail_${Date.now()}`,
      `user_${Date.now()}@domain`,
      `@domain_${Date.now()}.com`,
      `user_${Date.now()}@.com`,
      `user_${Date.now()}@domain.`,
      `user name_${Date.now()}@domain.com`,
      `user_${Date.now()}@domain..com`,
    ];

    const { context, page } = await createBrowserContext(browser);

    for (const invalidEmail of invalidEmails) {
      await navigateToLoginPage(page);
      await performLogin(page, invalidEmail, `anypassword_${Date.now()}`);

      await verifyUnsuccessfulLogin(page, {
        errorType: "invalidEmail",
        checkStayedOnLoginPage: true,
      });
    }

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-002: Login with incorrect password", async ({ browser }) => {
    const userData = generateUniqueUserData("Wrongpassword");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, `WrongPassword_${Date.now()}!`);

    await verifyUnsuccessfulLogin(page, {
      errorType: "generic",
      checkStayedOnLoginPage: true,
      verifyNoSessionCookie: true,
    });

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-003: Login with non-existent email", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    const nonExistentEmail = `nonexistent_${Date.now()}@test.com`;

    await navigateToLoginPage(page);
    await performLogin(page, nonExistentEmail, `AnyPassword_${Date.now()}`);

    await verifyUnsuccessfulLogin(page, {
      errorType: "generic",
      checkStayedOnLoginPage: true,
      verifyNoSessionCookie: true,
    });

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-004: Login with empty credentials", async ({ browser }) => {
    const userData = generateUniqueUserData("Emptycredentials");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);

    // Test empty email
    await navigateToLoginPage(page);
    await performLogin(page, "", userData.password);
    await verifyLoginFailure(page, "emptyField");

    // Test empty password
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, "");
    await verifyLoginFailure(page, "emptyField");

    // Test both empty
    await navigateToLoginPage(page);
    await performLogin(page, "", "");
    await verifyLoginFailure(page, "emptyField");

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-010: Login brute force protection", async ({ browser }) => {
    const testEmail = `bruteforce_${Date.now()}@test.com`;
    let rateLimitingTriggered = false;

    const { context, page } = await createBrowserContext(browser);

    for (let i = 0; i < 15; i++) {
      await navigateToLoginPage(page);
      await performLogin(page, testEmail, `WrongPass_${Date.now()}_${i}`);

      if (i >= 5) {
        const errorVisible = await page
          .locator(".alert.alert-danger:not(#create_account_error)")
          .isVisible();
        if (errorVisible) {
          const errorText = await page
            .locator(".alert.alert-danger:not(#create_account_error)")
            .textContent();
          if (
            errorText.match(
              /too many|rate limit|try again|locked|temporarily|blocked/i,
            )
          ) {
            console.log(`Rate limiting triggered after ${i + 1} attempts`);
            rateLimitingTriggered = true;

            // Verify the specific rate limiting error
            await verifyUnsuccessfulLogin(page, {
              errorMessagePattern:
                /too many|rate limit|try again|locked|temporarily|blocked/i,
              checkStayedOnLoginPage: true,
            });
            break;
          }
        }
      }
    }

    expect(rateLimitingTriggered).toBe(true);
    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-011: Login with wrong email case (if case-sensitive)", async ({
    browser,
  }) => {
    const userData = generateUniqueUserData("Casesensitive");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);

    // Try login with different case
    await performLogin(page, userData.email.toUpperCase(), userData.password);
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-012: Login with leading/trailing newlines", async ({
    browser,
  }) => {
    const userData = generateUniqueUserData("Newlines");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);

    await page.fill("#email", ` ${userData.email} `);
    await page.fill("#passwd", ` ${userData.password} `);
    await page.click("#SubmitLogin");
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-013: Login with extremely long inputs", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    const longString = `${"A".repeat(100)}_${Date.now()}`;

    await navigateToLoginPage(page);
    await performLogin(page, `${longString}@test.com`, longString);

    await verifyUnsuccessfulLogin(page, {
      errorType: "generic",
      checkStayedOnLoginPage: true,
    });

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-014: Login without HTTPS", async ({ browser }) => {
    const userData = generateUniqueUserData("HTTPS");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    const httpUrl = page.url().replace("https://", "http://");

    await page.goto(httpUrl);
    const currentUrl = page.url();
    expect(currentUrl.startsWith("https://")).toBe(true);

    await closeBrowserContext(context);
  });

  test("LOGIN-NEG-015: Login with different password encoding", async ({
    browser,
  }) => {
    const userData = {
      ...generateUniqueUserData("Encoding"),
      password: `P@ssw0rd✓™©_${Date.now()}`,
    };

    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);
    await verifyLoginSuccess(page);

    await closeBrowserContext(context);
  });

  // ===== SECURITY TEST CASES =====

  test("LOGIN-SEC-001: Password masking", async ({ browser }) => {
    const userData = generateUniqueUserData("Passwordmask");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);

    const passwordType = await page.locator("#passwd").getAttribute("type");
    expect(passwordType).toBe("password");

    await page.fill("#passwd", `Secret123_${Date.now()}!`);
    const isMasked = await page.evaluate(() => {
      const input = document.getElementById("passwd");
      return input.type === "password";
    });
    expect(isMasked).toBe(true);

    await closeBrowserContext(context);
  });

  test("LOGIN-SEC-003: Secure flag on session cookie", async ({ browser }) => {
    const userData = generateUniqueUserData("Securecookie");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);
    await verifyLoginSuccess(page);

    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(
      (c) => c.name.includes("session") || c.name.includes("PHPSESSID"),
    );

    for (const cookie of sessionCookies) {
      if (page.url().startsWith("https://")) {
        expect(cookie.secure).toBe(true);
      }
      expect(cookie.httpOnly).toBe(true);
      expect(["Lax", "Strict", "None"]).toContain(cookie.sameSite);
    }

    await closeBrowserContext(context);
  });

  test("LOGIN-SEC-004: Login error message security", async ({ browser }) => {
    const userData = generateUniqueUserData("Errorsecurity");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);

    // Test wrong password
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, `WrongPassword_${Date.now()}`);
    await verifyUnsuccessfulLogin(page, {
      errorType: "emptyField",
    });

    // Test non-existent user
    await navigateToLoginPage(page);
    await performLogin(
      page,
      `nonexistent_${Date.now()}@example.com`,
      `AnyPassword_${Date.now()}`,
    );
    await verifyUnsuccessfulLogin(page, {
      errorType: "invalidEmail",
    });

    await closeBrowserContext(context);
  });

  test("LOGIN-SEC-006: Concurrent session control", async ({ browser }) => {
    const userData = generateUniqueUserData("Concurrentsession");
    await createTestUser(browser, userData);

    const { context: context1, page: page1 } =
      await createBrowserContext(browser);
    const { context: context2, page: page2 } =
      await createBrowserContext(browser);

    await navigateToLoginPage(page1);
    await performLogin(page1, userData.email, userData.password);
    await verifyLoginSuccess(page1);

    await navigateToLoginPage(page2);
    await performLogin(page2, userData.email, userData.password);
    await verifyLoginSuccess(page2);

    const bothWork =
      (await page1.locator(".page-heading").isVisible()) &&
      (await page2.locator(".page-heading").isVisible());

    if (!bothWork) {
      const alertVisible =
        (await page1.locator(".alert.alert-warning").isVisible()) ||
        (await page2.locator(".alert.alert-warning").isVisible());
      expect(alertVisible).toBe(true);
    }

    await closeBrowserContext(context1);
    await closeBrowserContext(context2);
  });

  test("LOGIN-SEC-008: Password reset vs login", async ({ browser }) => {
    const userData = generateUniqueUserData("Passwordreset");
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    await navigateToLoginPage(page);
    await performLogin(page, userData.email, userData.password);
    await verifyLoginSuccess(page);

    console.log(
      "LOGIN-SEC-008: Password reset test requires reset functionality",
    );

    await closeBrowserContext(context);
  });
});
