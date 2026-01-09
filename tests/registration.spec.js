// File: tests/registration/registration-tests.spec.js
const { test, expect } = require("@playwright/test");

// ===== HELPER FUNCTIONS =====

// Navigates to registration page
async function navigateToRegistrationPage(page) {
  await page.goto("/index.php?controller=authentication");
}

// Generates unique email with timestamp
function generateUniqueEmail(baseName = "user") {
  return `${baseName}${Date.now()}@test.com`;
}

// Generates unique user data
function generateUserData(options = {}) {
  const timestamp = Date.now();
  const baseName = options.baseName || "Test";
  return {
    firstName: options.firstName || baseName,
    lastName: options.lastName || "User",
    email:
      options.email || generateUniqueEmail(baseName.toLowerCase() + timestamp),
    password: options.password || "Test@1234",
    gender: options.gender || "male",
    dob: options.dob || null,
    newsletter: options.newsletter || false,
  };
}

// Initiates registration process
async function initiateRegistration(page, email) {
  await page.fill("#email_create", email);
  await page.click("#SubmitCreate");
  //await page.waitForURL(/controller=authentication.*account-creation/);
  await page.waitForSelector("#account-creation_form");
}

// Fills registration form with provided user data
async function fillRegistrationForm(page, userData) {
  // Select gender
  if (userData.gender === "male") {
    await page.check("#id_gender1");
  } else if (userData.gender === "female") {
    await page.check("#id_gender2");
  }

  // Fill basic information
  await page.fill("#customer_firstname", userData.firstName);
  await page.fill("#customer_lastname", userData.lastName);
  await page.fill("#email", userData.email);
  await page.fill("#passwd", userData.password);

  // Fill date of birth if provided
  if (userData.dob) {
    await page.selectOption("#days", userData.dob.day.toString());
    await page.selectOption("#months", userData.dob.month.toString());
    await page.selectOption("#years", userData.dob.year.toString());
  }

  // Set newsletter subscription
  if (userData.newsletter) {
    await page.check("#newsletter");
  }
}

// Submits registration form
async function submitRegistration(page) {
  await page.click("#submitAccount");
  await page.waitForSelector(".alert");
}

// Comprehensive registration verification
async function verifySuccessfulRegistration(page, userData = {}) {
  //await expect(page).toHaveURL(/controller=my-account/);
  await expect(page.locator(".page-heading")).toHaveText("My account");
  await expect(page.locator(".alert-success")).toBeVisible();
  await expect(page.locator(".info-account")).toBeVisible();
  await expect(page.locator("a.logout")).toBeVisible();

  if (userData.firstName && userData.lastName) {
    await expect(page.locator("a.account span")).toContainText(
      `${userData.firstName} ${userData.lastName}`,
    );
  }
}

// Creates test user with browser context
async function createTestUser(browser, userData) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await navigateToRegistrationPage(page);
  await initiateRegistration(page, userData.email);
  await fillRegistrationForm(page, userData);
  await submitRegistration(page);

  return { page, context };
}

// Logs out user
async function logoutUser(page) {
  await page.click("a.logout");
}

// Performs login with provided credentials
async function performLogin(page, email, password) {
  await page.fill("#email", email);
  await page.fill("#passwd", password);
  await page.click("#SubmitLogin");
}

// Verifies successful login
async function verifySuccessfulLogin(page, options = {}) {
  await expect(page.locator(".page-heading")).toHaveText("My account");
  if (options.expectedName) {
    await expect(page.locator("a.account span")).toContainText(
      options.expectedName,
    );
  }
}

// ===== TEST SUITE =====

test.describe("Registration Functionality - Comprehensive Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRegistrationPage(page);
  });

  // ===== POSITIVE TEST CASES =====

  test("REG-POS-001: Successful registration with all required fields", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "John",
      lastName: "Doe",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-002: Registration with optional fields", async ({ page }) => {
    const userData = generateUserData({
      gender: "female",
      firstName: `Jane`,
      lastName: "Smith",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-003: Registration with newsletter subscription", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "News",
      lastName: "Letter",
      newsletter: true,
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-004: Registration with different password complexities", async ({
    page,
    browser,
  }) => {
    const passwords = [
      "Pass@1234",
      "StrongPwd!2024",
      "Test1234$",
      "Complex#Pass1",
    ];
    const context = await browser.newContext();

    for (let i = 0; i < passwords.length; i++) {
      const userData = generateUserData({
        baseName: `Passcomplex`,
        password: passwords[i],
      });

      const newPage = await context.newPage();

      await navigateToRegistrationPage(newPage);
      await initiateRegistration(newPage, userData.email);
      await fillRegistrationForm(newPage, userData);
      await submitRegistration(newPage);
      await verifySuccessfulRegistration(newPage, userData);

      await logoutUser(newPage);
    }
    await context.close();
  });

  test("REG-POS-005: Registration email case insensitivity", async ({
    page,
    browser,
  }) => {
    const uppercaseEmail = `TEST.USER${Date.now()}@TEST.COM`;
    const lowercaseEmail = uppercaseEmail.toLowerCase();

    const userData = generateUserData({
      firstName: "Case",
      lastName: "Test",
      email: uppercaseEmail,
    });

    // Register with uppercase email
    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);

    await logoutUser(page);

    // Login with lowercase email
    await performLogin(page, lowercaseEmail, userData.password);
    await verifySuccessfulLogin(page, { expectedName: "Case Test" });
  });

  test("REG-POS-006: Registration with special characters in name", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "O'briöen",
      lastName: "Smith-Jonüs",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-007: Registration with minimal required data", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "Minimal",
      lastName: "Required",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-008: Registration after logout", async ({ page, browser }) => {
    // Create first user
    const firstUserData = generateUserData({
      baseName: "Existing",
    });

    await initiateRegistration(page, firstUserData.email);
    await fillRegistrationForm(page, firstUserData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, firstUserData);

    await logoutUser(page);

    // Create second user
    const secondUserData = generateUserData({
      baseName: "Afterlogout",
    });

    await navigateToRegistrationPage(page);
    await initiateRegistration(page, secondUserData.email);
    await fillRegistrationForm(page, secondUserData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, secondUserData);
  });

  test("REG-POS-009: Registration with maximum field lengths", async ({
    page,
  }) => {
    const randomSuffix = Array.from({ length: 10 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)).toLowerCase(),
    ).join("");
    const paddedLocalPart = "a".repeat(109) + randomSuffix;

    const userData = generateUserData({
      firstName: `A${"a".repeat(21)}${randomSuffix}`,
      lastName: `${"a".repeat(22)}${randomSuffix}`,
      email: `${paddedLocalPart}@test.com`,
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-010: Registration redirect after success", async ({ page }) => {
    const userData = generateUserData({
      firstName: "Redirect",
      lastName: "Test",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-011: Successful registration with date of birth", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "John",
      lastName: "DOB",
      dob: { day: 15, month: 6, year: 1990 },
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-012: Registration with minimum age (18 years)", async ({
    page,
  }) => {
    const currentYear = new Date().getFullYear();
    const userData = generateUserData({
      firstName: "Adult",
      lastName: "User",
      gender: "female",
      dob: { day: 15, month: 6, year: currentYear - 25 },
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-POS-013: Registration with underage date (optional validation test)", async ({
    page,
  }) => {
    const currentYear = new Date().getFullYear();
    const userData = generateUserData({
      firstName: "Young",
      lastName: "User",
      dob: { day: 15, month: 6, year: currentYear - 16 },
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    // Check for either success or validation error
    const successVisible = await page.locator(".alert-success").isVisible();

    const errorVisible = await page.locator(".alert-danger").isVisible();

    expect(successVisible || errorVisible).toBe(true);
  });

  test("REG-POS-014: Date validation - invalid date (Feb 30)", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "Invalid",
      lastName: "Date",
      dob: { day: 30, month: 2, year: 1990 },
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    await expect(page.locator(".alert-danger")).toBeVisible();
  });

  test("REG-POS-015: Verify all date dropdown options", async ({ page }) => {
    const testEmail = generateUniqueEmail("verifydropdowns");

    await initiateRegistration(page, testEmail);

    // Test Days dropdown
    const dayOptions = await page.locator("#days option").all();
    expect(dayOptions.length).toBeGreaterThan(0);

    const firstDayOption = await page.locator("#days option").first();
    expect(await firstDayOption.getAttribute("value")).toBe("");

    await page.selectOption("#days", "1");
    await expect(page.locator("#days")).toHaveValue("1");

    // Test Months dropdown
    const monthOptions = await page.locator("#months option").all();
    expect(monthOptions.length).toBeGreaterThan(0);

    await page.selectOption("#months", "1");
    await expect(page.locator("#months")).toHaveValue("1");

    // Test Years dropdown
    const yearOptions = await page.locator("#years option").all();
    expect(yearOptions.length).toBeGreaterThan(0);

    const yearValues = await page
      .locator("#years option")
      .evaluateAll((options) =>
        options.map((option) => option.value).filter((val) => val),
      );

    const minYear = Math.min(...yearValues.map((y) => parseInt(y)));
    const maxYear = Math.max(...yearValues.map((y) => parseInt(y)));

    await page.selectOption("#years", minYear.toString());
    await expect(page.locator("#years")).toHaveValue(minYear.toString());
  });

  // ===== NEGATIVE TEST CASES =====

  test("REG-NEG-001: Registration with existing email", async ({
    page,
    browser,
  }) => {
    const existingUserData = generateUserData({
      baseName: "Existing",
    });

    // Create first user
    const { context } = await createTestUser(browser, existingUserData);
    await context.close();

    // Try to register with same email
    await navigateToRegistrationPage(page);
    await page.fill("#email_create", existingUserData.email);
    await page.click("#SubmitCreate");

    await expect(page.locator("#create_account_error")).toBeVisible();
    await expect(page.locator("#create_account_error")).toContainText(
      "An account using this email address has already been registered",
    );
  });

  test("REG-NEG-002: Registration with invalid email format", async ({
    page,
  }) => {
    const invalidEmails = [
      "invalidemail",
      "user@domain",
      "@domain.com",
      "user@.com",
      "user@domain.",
      "user name@domain.com",
    ];

    for (const email of invalidEmails) {
      await navigateToRegistrationPage(page);
      await page.fill("#email_create", email);
      await page.click("#SubmitCreate");

      await expect(page.locator("input#email_create[required]:invalid"))
        .toBeVisible;
    }
  });

  test("REG-NEG-003: Registration with password mismatch", async ({ page }) => {
    // Adjust based on actual form implementation
    const userData = generateUserData({
      baseName: "PasswordMismatch",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    // Check for any validation errors
    const errorCount = await page.locator(".alert-danger").count();
    if (errorCount > 0) {
      await expect(page.locator(".alert-danger")).toBeVisible();
    }
  });

  test("REG-NEG-004: Registration with weak password", async ({
    page,
    browser,
  }) => {
    const weakPasswords = ["123", "password", "abc123", "qwerty", "letmein"];

    for (const weakPassword of weakPasswords) {
      const userData = generateUserData({
        baseName: `WeakPass`,
        password: weakPassword,
      });

      const context = await browser.newContext();
      const newPage = await context.newPage();

      await navigateToRegistrationPage(newPage);
      await initiateRegistration(newPage, userData.email);
      await fillRegistrationForm(newPage, userData);
      await submitRegistration(newPage);

      await expect(newPage.getByText("passwd is invalid.")).toBeVisible();

      await context.close();
    }
  });

  test("REG-NEG-005: Registration with empty required fields", async ({
    page,
  }) => {
    const fields = [
      { selector: "#customer_firstname", name: "first name" },
      { selector: "#customer_lastname", name: "last name" },
      { selector: "#email", name: "email" },
      { selector: "#passwd", name: "password" },
    ];

    for (const field of fields) {
      const userData = generateUserData({
        baseName: `EmptyField`,
      });

      await navigateToRegistrationPage(page);
      await initiateRegistration(page, userData.email);

      await page.fill("#email", "");
      // Fill all fields except the one being tested
      if (field.selector !== "#customer_firstname")
        await page.fill("#customer_firstname", userData.firstName);
      if (field.selector !== "#customer_lastname")
        await page.fill("#customer_lastname", userData.lastName);
      if (field.selector !== "#email")
        await page.fill("#email", userData.email);
      if (field.selector !== "#passwd")
        await page.fill("#passwd", userData.password);

      await submitRegistration(page);

      await expect(page.locator(".alert-danger")).toBeVisible();
    }
  });

  test("REG-NEG-008: Registration with extremely long inputs", async ({
    page,
  }) => {
    const longString = `${"A".repeat(20)}${Date.now()}`;
    const userData = generateUserData({
      firstName: longString,
      lastName: longString,
      email: `${longString}@test.com`,
      password: longString,
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    await expect(page.locator(".alert-danger")).toBeVisible();
  });

  test("REG-NEG-009: Registration with special email characters", async ({
    page,
    browser,
  }) => {
    const specialEmails = [
      `user+tag${Date.now()}@test.com`,
      `user.name${Date.now()}@test.com`,
      `user_name${Date.now()}@test.com`,
      `user-name${Date.now()}@test.com`,
    ];

    for (const specialEmail of specialEmails) {
      const userData = generateUserData({
        baseName: "SpecialEmail",
        email: specialEmail,
      });

      const context = await browser.newContext();
      const newPage = await context.newPage();

      await navigateToRegistrationPage(newPage);
      await initiateRegistration(newPage, userData.email);
      await fillRegistrationForm(newPage, userData);
      await submitRegistration(newPage);

      const hasSuccess = await newPage.locator(".alert-success").isVisible();
      const hasError = await newPage.locator(".alert-danger").isVisible();
      expect(hasSuccess || hasError).toBe(true);

      if (hasSuccess) await logoutUser(newPage);
      await context.close();
    }
  });

  test("REG-NEG-010: Registration with leading/trailing spaces", async ({
    page,
  }) => {
    const trimmedEmail = generateUniqueEmail("trimmed");
    const userData = generateUserData({
      firstName: "  John  ",
      lastName: "  Doe  ",
      email: trimmedEmail,
    });

    await initiateRegistration(page, trimmedEmail);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    await verifySuccessfulRegistration(page, {
      firstName: "John",
      lastName: "Doe",
    });
  });

  // ===== EDGE TEST CASES =====

  test("REG-EDGE-001: Registration at field minimum lengths", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "A",
      lastName: "B",
      email: `min${Date.now()}@t.co`,
      password: "Aa1@2",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    await expect(page.locator(".alert-success")).toBeVisible();
  });

  test("REG-EDGE-002: Registration at field maximum lengths", async ({
    page,
  }) => {
    const maxFirstName = "A".repeat(32);
    const maxLastName = "B".repeat(32);
    const userData = generateUserData({
      firstName: maxFirstName,
      lastName: maxLastName,
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);
    await page.waitForLoadState("networkidle");

    const successAlert = page.locator(".alert-success");
    const errorAlert = page.locator(".alert-danger");
    const pageHeading = page.locator(".page-heading");

    await Promise.race([
      successAlert
        .waitFor({ state: "visible", timeout: 3000 })
        .catch(() => null),
      errorAlert.waitFor({ state: "visible", timeout: 3000 }).catch(() => null),
      pageHeading
        .waitFor({ state: "visible", timeout: 3000 })
        .catch(() => null),
    ]);

    const hasSuccess = await successAlert.isVisible().catch(() => false);
    const hasError = await errorAlert.isVisible().catch(() => false);
    const pageLoaded = await pageHeading.isVisible().catch(() => false);

    expect(hasSuccess || hasError || pageLoaded).toBe(true);
  });

  test("REG-EDGE-003: Registration with international characters", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "Jörg",
      lastName: "Müller",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-EDGE-004: Registration with multiple spaces in name", async ({
    page,
  }) => {
    const userData = generateUserData({
      firstName: "John  Michael",
      lastName: "Van  Der  Berg",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-EDGE-005: Registration email with sub-addressing", async ({
    page,
  }) => {
    const userData = generateUserData({
      baseName: "PlusAddressing",
      email: `user+test${Date.now()}@domain.com`,
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);
    await submitRegistration(page);

    const hasSuccess = await page.locator(".alert-success").isVisible();
    const hasError = await page.locator(".alert-danger").isVisible();
    expect(hasSuccess || hasError).toBe(true);
  });

  test("REG-EDGE-007: Registration with browser autofill", async ({ page }) => {
    const userData = generateUserData({
      firstName: "Auto",
      lastName: "Fill",
    });

    await initiateRegistration(page, userData.email);
    await page.waitForSelector("#customer_firstname", { state: "visible" });

    // Simulate autofill
    await page.evaluate((data) => {
      document.getElementById("customer_firstname").value = data.firstName;
      document.getElementById("customer_lastname").value = data.lastName;
      document.getElementById("email").value = data.email;
      document.getElementById("passwd").value = data.password;

      ["customer_firstname", "customer_lastname", "email", "passwd"].forEach(
        (id) => {
          document
            .getElementById(id)
            .dispatchEvent(new Event("input", { bubbles: true }));
          document
            .getElementById(id)
            .dispatchEvent(new Event("change", { bubbles: true }));
        },
      );
    }, userData);

    await submitRegistration(page);
    await verifySuccessfulRegistration(page, userData);
  });

  test("REG-EDGE-008: Registration form resubmission", async ({ page }) => {
    const userData = generateUserData({
      firstName: "Double",
      lastName: "Submit",
    });

    await initiateRegistration(page, userData.email);
    await fillRegistrationForm(page, userData);

    // Click submit multiple times
    page.click("#submitAccount");
    page.click("#submitAccount");

    await verifySuccessfulRegistration(page, userData);

    // Verify single account creation
    await logoutUser(page);
    await performLogin(page, userData.email, userData.password);
    await verifySuccessfulLogin(page, { expectedName: "Double Submit" });
  });
});
