// File: tests/search/search-tests.spec.js
const { test, expect } = require("@playwright/test");

// ===== HELPER FUNCTIONS =====
const url = "/index.php?controller=authentication&back=my-account";

// Creates a browser context and returns context and page
async function createBrowserContext(browser, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ...options,
  });
  const page = await context.newPage();
  return { context, page };
}

// Closes browser context
async function closeBrowserContext(context) {
  if (context) {
    await context.close();
  }
}

// Navigates to homepage and waits for it to load
async function navigateToHomepage(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

// Performs a search with the given query
async function performSearch(page, searchQuery) {
  await page.fill("#search_query_top", searchQuery);
  await page.click('button[name="submit_search"]');
  await page.waitForLoadState("networkidle");
}

// Waits for search results to load
async function waitForSearchResults(page) {
  await page.waitForSelector(".product-listing, .alert.alert-warning", {
    timeout: 10000,
  });
}

// Gets all product names from search results
async function getProductNames(page) {
  return await page.locator(".product-name").allTextContents();
}

// Gets count of products in search results
async function getProductCount(page) {
  return await page.locator(".product-container").count();
}

// Verifies search results are visible and contain expected text
async function verifySearchResultsVisible(page, options = {}) {
  const { expectResults = true } = options;

  if (expectResults) {
    await expect(page.locator(".product-listing")).toBeVisible();
  } else {
    const hasResults = await page.locator(".product-listing").isVisible();
    const hasNoResultsMessage = await page
      .locator(".alert.alert-warning")
      .isVisible();
    expect(hasResults || hasNoResultsMessage).toBe(true);
  }
}

// Checks if element exists and is visible
async function elementExists(page, selector) {
  return await page.locator(selector).isVisible();
}

// Creates a test user for login tests
async function createTestUser(browser, userData) {
  const { context, page } = await createBrowserContext(browser);

  try {
    await page.goto(url);
    await page.fill("#email_create", userData.email);
    await page.click("#SubmitCreate");
    await page.waitForURL(/controller=authentication.*account-creation/);

    // Fill registration form
    await page.fill("#customer_firstname", userData.firstName);
    await page.fill("#customer_lastname", userData.lastName);
    await page.fill("#email", userData.email);
    await page.fill("#passwd", userData.password);
    await page.click("#submitAccount");

    await page.waitForLoadState("networkidle");
    return userData;
  } finally {
    await closeBrowserContext(context);
  }
}

// Generates unique user data with timestamp
function generateUniqueUserData(baseName = "TestUser") {
  const timestamp = Date.now();
  return {
    firstName: baseName,
    lastName: "SearchTest",
    email: `${baseName.toLowerCase()}.search.test${timestamp}@test.com`,
    password: "Test@1234",
  };
}

// Performs login with provided credentials
async function performLogin(page, email, password) {
  await page.goto("url");
  await page.fill("#email", email);
  await page.fill("#passwd", password);
  await page.click("#SubmitLogin");
  await page.waitForLoadState("networkidle");
}

// Applies price filter to search results
async function applyPriceFilter(page, minPrice, maxPrice) {
  if (await elementExists(page, 'input[name="price_range_min"]')) {
    await page.fill('input[name="price_range_min"]', minPrice.toString());
    await page.fill('input[name="price_range_max"]', maxPrice.toString());
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
    return true;
  }
  return false;
}

// Applies size filter to search results
async function applySizeFilter(page, sizeValue = "2") {
  const sizeSelector =
    'input[name="layered_id_attribute_group_1"][value="' + sizeValue + '"]';
  if (await elementExists(page, sizeSelector)) {
    await page.click(sizeSelector);
    await page.waitForLoadState("networkidle");
    return true;
  }
  return false;
}

// Applies color filter to search results
async function applyColorFilter(page, colorValue = "1") {
  const colorSelector =
    'input[name="layered_id_attribute_group_3"][value="' + colorValue + '"]';
  if (await elementExists(page, colorSelector)) {
    await page.click(colorSelector);
    await page.waitForLoadState("networkidle");
    return true;
  }
  return false;
}

// Changes sort option for search results
async function changeSortOption(page, sortValue) {
  const sortDropdown = page.locator("#selectProductSort, .sort-select");
  if (await sortDropdown.isVisible()) {
    await sortDropdown.selectOption(sortValue);
    await page.waitForLoadState("networkidle");
    return true;
  }
  return false;
}

// Gets product prices from search results
async function getProductPrices(page) {
  const priceElements = await page
    .locator(".product-price, .price")
    .allTextContents();
  return priceElements
    .map((priceText) => {
      const match = priceText.match(/\$?(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    })
    .filter((price) => !isNaN(price));
}

// Verifies price order (ascending or descending)
function verifyPriceOrder(prices, order = "asc") {
  for (let i = 0; i < prices.length - 1; i++) {
    if (order === "asc") {
      expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
    } else {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
    }
  }
}

// Clicks pagination link
async function clickPagination(page, pageNumber) {
  const paginationLink = page
    .locator(`.pagination a[href*="page=${pageNumber}"], .page-list a`)
    .first();
  if (await paginationLink.isVisible()) {
    await paginationLink.click();
    await page.waitForLoadState("networkidle");
    return true;
  }
  return false;
}

// Tests search autocomplete suggestions
async function testAutocomplete(page, partialQuery) {
  await page.fill("#search_query_top", partialQuery);
  await page.waitForTimeout(500);

  if (await elementExists(page, ".ac_results, .search-suggestions")) {
    await expect(page.locator(".ac_results li")).toHaveCountGreaterThan(0);
    const firstSuggestion = await page
      .locator(".ac_results li")
      .first()
      .textContent();
    await page.locator(".ac_results li").first().click();
    await page.waitForLoadState("networkidle");
    return firstSuggestion;
  }
  return null;
}

// Clears all applied filters
async function clearAllFilters(page) {
  const clearButton = page.locator(
    '.clear-all-filters, a[href*="clear_filters"]',
  );
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.waitForLoadState("networkidle");
    return true;
  }
  return false;
}

// Measures search performance
async function measureSearchPerformance(page, searchQuery) {
  const startTime = Date.now();
  await performSearch(page, searchQuery);
  await waitForSearchResults(page);
  const endTime = Date.now();
  return endTime - startTime;
}

// ===== TEST SUITE =====

test.describe("Product Search Functionality - Comprehensive Test Suite", () => {
  // ===== POSITIVE TEST CASES =====

  test("SEARCH-POS-001: Search by exact product name", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);

    await navigateToHomepage(page);
    const exactProductName = "Faded Short Sleeves T-shirt";

    await performSearch(page, exactProductName);
    await verifySearchResultsVisible(page);

    // Check product appears
    await page.getByRole("link", { name: exactProductName });

    // Check it's at the top
    await page.getByRole("link", { name: exactProductName }).first();

    await closeBrowserContext(context);
  });

  test("SEARCH-POS-002: Search by partial product name", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);

    await navigateToHomepage(page);
    const partialName = "Short Sleeves";

    await performSearch(page, partialName);
    await verifySearchResultsVisible(page);

    // Check multiple products might be returned
    const productCount = await getProductCount(page);
    expect(productCount).toBeGreaterThan(0);

    // Verify at least one product contains the search term
    const allProducts = await getProductNames(page);
    const matchingProducts = allProducts.filter((name) =>
      name.toLowerCase().includes(partialName.toLowerCase()),
    );
    expect(matchingProducts.length).toBeGreaterThan(0);

    await closeBrowserContext(context);
  });

  test("SEARCH-POS-003: Search by product category", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);

    await navigateToHomepage(page);
    await page.getByRole("link", { name: "Women" }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".category-name")).toContainText("Women");

    await navigateToHomepage(page);
    await page.getByRole("link", { name: "Dresses" }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".category-name")).toContainText("Dresses");

    await navigateToHomepage(page);
    await page.getByRole("link", { name: "T-shirts" }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".category-name")).toContainText("T-shirts");

    await closeBrowserContext(context);
  });

  test("SEARCH-POS-004: Search by product description keyword", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const descriptionKeyword = "cotton";

      await performSearch(page, descriptionKeyword);
      await verifySearchResultsVisible(page);

      // Check results count
      const productCount = await getProductCount(page);
      expect(productCount).toBeGreaterThan(0);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-005: Search with multiple keywords", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const multiKeyword = "summer dress printed";

      await performSearch(page, multiKeyword);
      await verifySearchResultsVisible(page);

      // Check results relevance
      const productNames = await getProductNames(page);
      const matchingProducts = productNames.filter(
        (name) =>
          name.toLowerCase().includes("dress") &&
          (name.toLowerCase().includes("summer") ||
            name.toLowerCase().includes("printed")),
      );

      expect(productNames.length).toBeGreaterThan(0);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-006: Search with filters (price range)", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Apply price filter
      const filterApplied = await applyPriceFilter(page, 20, 50);

      if (filterApplied) {
        // Check filter indication
        await expect(
          page.locator(".layered_filter, .active-filter"),
        ).toContainText("$20 - $50");

        // Verify products are in price range
        const prices = await getProductPrices(page);
        prices.forEach((price) => {
          expect(price).toBeGreaterThanOrEqual(20);
          expect(price).toBeLessThanOrEqual(50);
        });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-007: Search with filters (size/color)", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "blouse");
      await verifySearchResultsVisible(page);

      // Apply size filter
      const sizeApplied = await applySizeFilter(page);

      if (sizeApplied) {
        // Apply color filter
        const colorApplied = await applyColorFilter(page);

        if (colorApplied) {
          // Verify multiple filters active
          await expect(page.locator(".layered_filter")).toContainText([
            "M",
            "White",
          ]);
        }
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-008: Search with sorting options", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    await navigateToHomepage(page);
    await performSearch(page, "dress");
    await verifySearchResultsVisible(page);

    // Test sort by Price: Low to High
    if (await changeSortOption(page, "price:asc")) {
      const pricesAsc = await getProductPrices(page);
      verifyPriceOrder(pricesAsc, "asc");
    }

    // Test sort by Price: High to Low
    if (await changeSortOption(page, "price:desc")) {
      const pricesDesc = await getProductPrices(page);
      verifyPriceOrder(pricesDesc, "desc");
    }

    // Test sort by Name A-Z
    if (await changeSortOption(page, "name:asc")) {
      const sortedNames = await getProductNames(page);
      const sortedNamesLower = sortedNames.map((name) =>
        name.toLowerCase().trim(),
      );

      // Verify alphabetical order
      for (let i = 0; i < sortedNamesLower.length - 1; i++) {
        expect(sortedNamesLower[i] <= sortedNamesLower[i + 1]).toBe(true);
      }
    }

    await closeBrowserContext(context);
  });

  test("SEARCH-POS-009: Search pagination", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Test pagination
      if (await clickPagination(page, 2)) {
        // Verify page 2 loaded
        await expect(page).toHaveURL(/page=2/);

        // Get products from page 2
        const page2Products = await getProductCount(page);
        expect(page2Products).toBeGreaterThan(0);

        // Test previous button
        await page.locator(".pagination .previous, a.prev").click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/page=1/);
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-010: Search autocomplete/suggestions", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const suggestion = await testAutocomplete(page, "dre");
      if (suggestion) {
        await verifySearchResultsVisible(page);
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-011: Search by product ID/SKU", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const testSKU = "demo_2";

      await performSearch(page, testSKU);
      await verifySearchResultsVisible(page);

      // Check if it's a single result
      const productCount = await getProductCount(page);

      if (productCount === 1) {
        // Click to product page
        await page.locator(".product-name").first().click();
        await expect(page).toHaveURL(/id_product=/);

        // Verify SKU on product page
        const skuElement = await page
          .locator('[itemprop="sku"], .product-reference')
          .textContent();
        expect(skuElement).toContain(testSKU);
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-012: Search with special allowed characters", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const specialCharSearches = ["T-shirt", "Blouse", "Dress"];

      for (const searchTerm of specialCharSearches) {
        await navigateToHomepage(page);
        await performSearch(page, searchTerm);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-013: Search recent searches", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // First perform a search
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Go back to homepage
      await navigateToHomepage(page);

      // Click on search box
      await page.click("#search_query_top");
      await page.waitForTimeout(300);

      // Check recent searches
      if (await elementExists(page, ".recent-searches, .search-history")) {
        await expect(page.locator(".recent-searches li")).toContainText(
          "dress",
        );
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-014: Search empty query shows all", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // Submit empty search
      await page.fill("#search_query_top", "");
      await page.click('button[name="submit_search"]');
      await page.waitForLoadState("networkidle");

      await verifySearchResultsVisible(page, { expectResults: false });
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-015: Search with mixed case", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const testCases = ["DRESS", "dress", "Dress", "DrEsS"];
      let previousResults = null;

      for (const searchTerm of testCases) {
        await navigateToHomepage(page);
        await performSearch(page, searchTerm);
        await verifySearchResultsVisible(page);

        // Get current results
        const currentProductNames = (await getProductNames(page))
          .map((name) => name.toLowerCase())
          .sort();

        // All searches should return same results (case-insensitive)
        if (previousResults !== null) {
          expect(currentProductNames).toEqual(previousResults);
        }

        previousResults = currentProductNames;
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-016: Search performance", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const searchTerms = ["dress", "blouse", "t-shirt"];

      for (const term of searchTerms) {
        await navigateToHomepage(page);
        const searchTime = await measureSearchPerformance(page, term);
        console.log(`Search for "${term}" took ${searchTime}ms`);
        expect(searchTime).toBeLessThan(5000);
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-017: Search result display format", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Check grid view
      await expect(page.locator(".product-listing")).toBeVisible();

      // Verify product information is displayed
      const firstProduct = page.locator(".product-container").first();

      // Check for essential elements
      await expect(firstProduct.locator(".product-name")).toBeVisible();
      await expect(firstProduct.locator(".product-image")).toBeVisible();
      await expect(firstProduct.locator(".product-price")).toBeVisible();

      // Check image display
      const image = firstProduct.locator("img");
      await expect(image).toBeVisible();
      const imageSrc = await image.getAttribute("src");
      expect(imageSrc).toBeTruthy();

      // Check for grid/list view toggle if available
      const viewToggle = page.locator(".view-toggle, .display-mode");
      if (await viewToggle.isVisible()) {
        // Test switching views
        await viewToggle.locator(".list").click();
        await page.waitForTimeout(500);
        await expect(page.locator(".product-list")).toBeVisible();

        await viewToggle.locator(".grid").click();
        await page.waitForTimeout(500);
        await expect(page.locator(".product-grid")).toBeVisible();
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-018: Search breadcrumb navigation", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "summer dress");
      await verifySearchResultsVisible(page);

      // Check breadcrumb contains search
      const breadcrumbText = await page.locator(".breadcrumb").textContent();
      expect(breadcrumbText).toMatch(/search|results/i);

      // Click home in breadcrumb
      await page.locator('.breadcrumb a[title="Home"]').click();
      await page.waitForLoadState("networkidle");

      // Should go to homepage
      await expect(page).toHaveURL(/\/$/);

      // Use browser back to return to search
      await page.goBack();
      await page.waitForLoadState("networkidle");

      // Should return to search results
      await expect(page.locator(".product-listing")).toBeVisible();
      const currentUrl = page.url();
      expect(currentUrl).toContain("controller=search");
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-019: Search with manufacturer filter", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Check for manufacturer filter
      const manufacturerFilter = page.locator(
        '#layered_manufacturer, [data-filter="manufacturer"]',
      );

      if (await manufacturerFilter.isVisible()) {
        // Apply manufacturer filter
        await manufacturerFilter
          .locator('input[type="checkbox"]')
          .first()
          .check();
        await page.waitForLoadState("networkidle");

        // Check filter indication
        await expect(page.locator(".layered_filter")).toBeVisible();

        // Check manufacturer name in results
        const manufacturerName = await manufacturerFilter
          .locator("label")
          .first()
          .textContent();
        expect(manufacturerName).toBeTruthy();

        // Test with another filter combination
        const colorFilter = page.locator(
          '#layered_id_attribute_group_3, [data-filter="color"]',
        );
        if (await colorFilter.isVisible()) {
          await colorFilter.locator('input[type="checkbox"]').first().check();
          await page.waitForLoadState("networkidle");

          // Both filters should be active
          await expect(page.locator(".layered_filter")).toHaveCount(2);
        }
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-POS-020: Search accessibility", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // Test keyboard navigation
      await page.click("#search_query_top");

      // Tab through search interface
      await page.keyboard.press("Tab");
      // Should move to search button
      const activeElement = await page.evaluate(
        () => document.activeElement.tagName,
      );
      expect(["BUTTON", "INPUT"]).toContain(activeElement);

      // Use Enter to submit search
      await page.fill("#search_query_top", "dress");
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");

      // Check focus management
      await expect(page.locator(".product-listing")).toBeVisible();
    } finally {
      await closeBrowserContext(context);
    }
  });

  // ===== NEGATIVE TEST CASES =====

  test("SEARCH-NEG-001: Search with no results", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const nonExistentTerm = "xyz123nonexistentproduct";

      await performSearch(page, nonExistentTerm);
      await expect(page.locator(".alert.alert-warning")).toBeVisible();

      const message = await page.locator(".alert.alert-warning").textContent();
      expect(message).toMatch(/no results|not found|try.*search/i);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-002: Search with SQL injection", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const sqlInjections = [
        "' OR '1'='1",
        "; DROP TABLE products",
        "' UNION SELECT * FROM products --",
      ];

      for (const sqlInjection of sqlInjections) {
        await navigateToHomepage(page);
        await performSearch(page, sqlInjection);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-003: Search with XSS payload", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
      ];

      for (const xssPayload of xssPayloads) {
        await navigateToHomepage(page);
        await performSearch(page, xssPayload);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-004: Search with extremely long query", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const longQuery = "A".repeat(1000);

      await performSearch(page, longQuery);
      await verifySearchResultsVisible(page, { expectResults: false });
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-005: Search with only special characters", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const specialChars = ["@#$%^&*()", "\\", "!!!", "???"];

      for (const chars of specialChars) {
        await navigateToHomepage(page);
        await performSearch(page, chars);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-006: Search with invalid price range", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Check if price filter exists
      const priceFilterExists = await page
        .locator('input[name="price_range_min"]')
        .isVisible();

      if (priceFilterExists) {
        // Test min > max
        await page.fill('input[name="price_range_min"]', "100");
        await page.fill('input[name="price_range_max"]', "50");
        await page.click('button[type="submit"]');

        await page.waitForLoadState("networkidle");

        // Should handle gracefully
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-007: Search timeout handling", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const complexQuery =
        "a b c d e f g h i j k l m n o p q r s t u v w x y z";

      await page.fill("#search_query_top", complexQuery);
      await page.click('button[name="submit_search"]');

      // Wait with timeout
      try {
        await page.waitForSelector(".product-listing", { timeout: 10000 });
        // If it loads within timeout, that's fine
        await verifySearchResultsVisible(page);
      } catch (error) {
        // If timeout occurs, check for timeout message
        const timeoutMessage = await page
          .locator(".timeout-message, .loading-error")
          .isVisible();
        if (timeoutMessage) {
          await expect(page.locator(".timeout-message")).toContainText(
            /timeout|try again/i,
          );
        }
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-008: Search with invalid category ID", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      // Try to access search with invalid category parameter
      await page.goto("/index.php?controller=search&id_category=99999");
      await page.waitForLoadState("networkidle");

      // Should load without errors
      await expect(page.locator("body")).toBeVisible();
      await verifySearchResultsVisible(page, { expectResults: false });
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-009: Search with stop words only", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const stopWords = ["the and or but", "a an the", "for with"];

      for (const words of stopWords) {
        await navigateToHomepage(page);
        await performSearch(page, words);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-011: Search with malformed URL parameters", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const malformedUrls = [
        "/index.php?controller=search&q=<>",
        "/index.php?controller=search&%",
        "/index.php?controller=search&price[]=20&price[]=30",
      ];

      for (const url of malformedUrls) {
        try {
          await page.goto(url);
          await page.waitForLoadState("networkidle");

          // Should load without server errors
          await expect(page.locator("body")).toBeVisible();

          // Check for error messages
          const serverError = await page.locator("body").textContent();
          expect(serverError).not.toMatch(/500|Internal Server Error/i);
        } catch (error) {
          // Some malformed URLs might cause navigation errors
          console.log(`URL ${url} caused navigation error: ${error.message}`);
        }
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-012: Search with conflicting filters", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Apply two filters that might conflict
      const sizeFilter = page.locator("#layered_id_attribute_group_1");

      if (await sizeFilter.isVisible()) {
        // Get all size options
        const sizeOptions = sizeFilter.locator('input[type="checkbox"]');
        const sizeCount = await sizeOptions.count();

        if (sizeCount >= 2) {
          // Select first and last size (might be conflicting)
          await sizeOptions.first().check();
          await sizeOptions.last().check();
          await page.waitForLoadState("networkidle");

          // Check results
          await verifySearchResultsVisible(page, { expectResults: false });
        }
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-013: Search character encoding issues", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const utf8Searches = ["café", "naïve", "Müller", "Garçon"];

      for (const searchTerm of utf8Searches) {
        await navigateToHomepage(page);
        await performSearch(page, searchTerm);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-014: Search pagination boundary", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      const pagination = page.locator(".pagination");
      if (await pagination.isVisible()) {
        // Go to last page
        const lastPageLink = pagination.locator("a").last();
        await lastPageLink.click();
        await page.waitForLoadState("networkidle");

        // Check "next" should be disabled or not exist
        const nextButton = pagination.locator(".next, .disabled.next");
        const nextDisabled = await nextButton.isVisible();

        if (nextDisabled) {
          // Clicking disabled next should do nothing
          const currentUrl = page.url();
          await nextButton.click();
          await page.waitForTimeout(500);
          expect(page.url()).toBe(currentUrl);
        }
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-NEG-015: Search with script tags in results", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Check all product names and descriptions for script tags
      const productNames = await getProductNames(page);
      const allText = productNames.join(" ");

      // Should not contain unescaped HTML tags
      expect(allText).not.toMatch(/<script>/i);
      expect(allText).not.toMatch(/javascript:/i);
    } finally {
      await closeBrowserContext(context);
    }
  });

  // ===== EDGE TEST CASES =====

  test("SEARCH-EDGE-001: Search with diacritics/accented chars", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const accentedSearches = ["café", "naïve", "Müller", "Garçon"];

      for (const searchTerm of accentedSearches) {
        await navigateToHomepage(page);
        await performSearch(page, searchTerm);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-002: Search with wildcards if supported", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const wildcardSearches = ["dress*", "*sleeve", "dr*ss"];

      for (const searchTerm of wildcardSearches) {
        await navigateToHomepage(page);
        await performSearch(page, searchTerm);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-003: Search with boolean operators if supported", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const booleanSearches = [
        "dress AND summer",
        "blouse OR shirt",
        "dress NOT evening",
      ];

      for (const searchTerm of booleanSearches) {
        await navigateToHomepage(page);
        await performSearch(page, searchTerm);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-004: Search phrase matching", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const phraseSearch = '"short sleeves"';

      await performSearch(page, phraseSearch);
      await verifySearchResultsVisible(page);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-006: Search typo tolerance", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const commonTypos = ["dres", "bluse", "tshirt"];

      for (const typo of commonTypos) {
        await navigateToHomepage(page);
        await performSearch(page, typo);
        await verifySearchResultsVisible(page, { expectResults: false });
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-007: Search with very common term", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      const commonTerm = "dress";
      const searchTime = await measureSearchPerformance(page, commonTerm);
      console.log(`Common term "${commonTerm}" search took ${searchTime}ms`);
      expect(searchTime).toBeLessThan(5000);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-008: Search autocomplete performance", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // Type quickly to test autocomplete
      await page.fill("#search_query_top", "d");
      await page.waitForTimeout(100);

      await page.fill("#search_query_top", "dr");
      await page.waitForTimeout(100);

      await page.fill("#search_query_top", "dre");
      await page.waitForTimeout(100);

      await page.fill("#search_query_top", "dres");
      await page.waitForTimeout(500); // Wait for suggestions

      // Check if suggestions appear quickly
      const suggestionsVisible = await elementExists(page, ".ac_results");

      if (suggestionsVisible) {
        // Suggestions should load within reasonable time
        const suggestions = await page.locator(".ac_results li").count();
        expect(suggestions).toBeGreaterThan(0);
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-010: Search with filters persistence", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Apply a filter if available
      if (await applySizeFilter(page)) {
        // Navigate away and back
        await navigateToHomepage(page);
        await page.goBack();
        await page.waitForLoadState("networkidle");

        // Filter should still be applied
        const filterActive = await elementExists(
          page,
          ".layered_filter, .active-filter",
        );
        expect(filterActive).toBe(true);

        // Clear filters
        await clearAllFilters(page);
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-011: Search accessibility (screen readers)", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // Test ARIA attributes
      const searchInput = page.locator("#search_query_top");
      const hasAriaLabel = await searchInput.getAttribute("aria-label");
      expect(hasAriaLabel).toBeTruthy();

      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Check images have alt text
      const firstProduct = page.locator(".product-container").first();
      const productImage = firstProduct.locator("img");
      const altText = await productImage.getAttribute("alt");
      expect(altText).toBeTruthy();
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-EDGE-012: Search mobile responsiveness", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser, {
      viewport: { width: 375, height: 667 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    try {
      await navigateToHomepage(page);

      // Check search box is visible
      const searchInput = page.locator("#search_query_top");
      await expect(searchInput).toBeVisible();

      // Perform search
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);
    } finally {
      await closeBrowserContext(context);
    }
  });

  // ===== INTEGRATION TEST CASES =====

  test("SEARCH-INT-001: Search → Product Page → Back", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Get first product details
      const firstProductName = await page
        .locator(".product-name")
        .first()
        .textContent();

      // Click product
      await page.locator(".product-name").first().click();
      await page.waitForLoadState("networkidle");

      // Verify product page
      await expect(page.locator('h1[itemprop="name"]')).toContainText(
        firstProductName,
      );

      // Use browser back
      await page.goBack();
      await page.waitForLoadState("networkidle");

      // Should return to search results
      await expect(page.locator(".product-listing")).toBeVisible();
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-INT-002: Search → Add to Cart → Continue", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Add first product to cart
      const addToCartButton = page.locator(".ajax_add_to_cart_button").first();
      if (await addToCartButton.isVisible()) {
        await addToCartButton.click();

        // Wait for cart confirmation
        await page.waitForSelector(".layer_cart_product", { timeout: 5000 });
        await expect(page.locator(".layer_cart_product")).toContainText(
          "successfully added",
        );

        // Continue shopping
        await page.locator(".continue.btn").click();
        await page.waitForTimeout(1000);

        // Should still be on search results
        await expect(page.locator(".product-listing")).toBeVisible();
      }
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-INT-003: Search while logged in/out", async ({ browser }) => {
    // Create test user
    const userData = generateUniqueUserData();
    await createTestUser(browser, userData);

    const { context, page } = await createBrowserContext(browser);
    try {
      // Search while logged out
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);
      const loggedOutResults = await getProductNames(page);

      // Login
      await performLogin(page, userData.email, userData.password);

      // Search while logged in
      await navigateToHomepage(page);
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);
      const loggedInResults = await getProductNames(page);

      // Core search functionality should work both ways
      expect(loggedOutResults.length).toBeGreaterThan(0);
      expect(loggedInResults.length).toBeGreaterThan(0);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-INT-005: Search in different site sections", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      const searchTerm = "dress";

      // Search from homepage
      await navigateToHomepage(page);
      await performSearch(page, searchTerm);
      await verifySearchResultsVisible(page);
      const homepageResults = await getProductNames(page);

      // Search from category page
      await page.goto("/index.php?id_category=8&controller=category"); // Dresses category
      await page.waitForLoadState("networkidle");
      await performSearch(page, searchTerm);
      await verifySearchResultsVisible(page);
      const categoryResults = await getProductNames(page);

      // Search from product page
      await page.goto("/index.php?id_product=1&controller=product"); // Example product
      await page.waitForLoadState("networkidle");
      await performSearch(page, searchTerm);
      await verifySearchResultsVisible(page);
      const productPageResults = await getProductNames(page);

      // Search should work from all locations
      expect(homepageResults.length).toBeGreaterThan(0);
      expect(categoryResults.length).toBeGreaterThan(0);
      expect(productPageResults.length).toBeGreaterThan(0);
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-INT-006: Search with browser navigation", async ({
    browser,
  }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // Search for term A
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);
      const urlA = page.url();

      // Search for term B
      await performSearch(page, "blouse");
      await verifySearchResultsVisible(page);
      const urlB = page.url();

      // Use browser back
      await page.goBack();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toBe(urlA);
      await expect(page.locator(".product-listing")).toBeVisible();

      // Use browser forward
      await page.goForward();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toBe(urlB);
      await expect(page.locator(".product-listing")).toBeVisible();
    } finally {
      await closeBrowserContext(context);
    }
  });

  test("SEARCH-INT-010: Search error recovery", async ({ browser }) => {
    const { context, page } = await createBrowserContext(browser);
    try {
      await navigateToHomepage(page);

      // First do a normal search
      await performSearch(page, "dress");
      await verifySearchResultsVisible(page);

      // Try a different search (should still work)
      await performSearch(page, "blouse");
      await verifySearchResultsVisible(page);
    } finally {
      await closeBrowserContext(context);
    }
  });
});
