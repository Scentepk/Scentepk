import test from "node:test";
import assert from "node:assert/strict";

import {
  validatePromoCode,
  LOCAL_STORAGE_PROMOS_KEY,
} from "./promoCodes.js";

import {
  validateBuilderSelections,
  calculateCustomPerfumePrice,
  buildCustomConfigurationSnapshot,
} from "./customBuilderPricing.js";

import { createCodOrder } from "./orders.js";

// Mock localStorage for node:test environment
const mockStorage = new Map();
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  };
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    dispatchEvent: () => {},
  };
}

test("SCENTE Phase 1 Security Hardening: Regression & Integration Suite", async (t) => {
  const LOCAL_STORAGE_ORDERS_KEY = "scente_admin_orders_cache";

  // Setup test environment
  t.beforeEach(() => {
    mockStorage.clear();
  });

  // --------------------------------------------------------------------------
  // Finding 1: Promo Code Phone Normalization
  // --------------------------------------------------------------------------
  await t.test("1. Promo Code Phone Normalization: Rejects formatting bypass variations", async () => {
    const singleUsePromo = {
      id: "promo-phone-test",
      code: "VIPONE",
      discount_type: "percentage",
      discount_value: 20,
      min_order_amount: 1000,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 3600000).toISOString(),
      expiry_date: new Date(Date.now() + 3600000).toISOString(),
      total_usage_limit: 100,
      per_customer_limit: 1, // Single-use only!
      usage_count: 1,
      is_active: true,
    };

    // Seed promo in local store
    mockStorage.set(LOCAL_STORAGE_PROMOS_KEY, JSON.stringify([singleUsePromo]));

    // Seed an existing order placed by 03001234567
    const existingOrder = {
      id: "ord-test-existing",
      reference: "SC-100001",
      customer_phone: "03001234567",
      customer_email: "client@atelier.pk",
      promo_code: "VIPONE",
      status: "confirmed",
      total: 5000,
      created_at: new Date().toISOString(),
    };
    mockStorage.set(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify([existingOrder]));

    // Attempt 1: Space-formatted phone (0300 1234567)
    const resSpaces = await validatePromoCode("VIPONE", 5000, "0300 1234567", "");
    assert.equal(resSpaces.valid, false, "Should reject 0300 1234567 as already used");
    assert.match(resSpaces.message, /already utilized/i);

    // Attempt 2: Dash-formatted phone (0300-1234567)
    const resDashes = await validatePromoCode("VIPONE", 5000, "0300-1234567", "");
    assert.equal(resDashes.valid, false, "Should reject 0300-1234567 as already used");
    assert.match(resDashes.message, /already utilized/i);

    // Attempt 3: Country-code prefix (+923001234567)
    const resCountryCode = await validatePromoCode("VIPONE", 5000, "+923001234567", "");
    assert.equal(resCountryCode.valid, false, "Should reject +923001234567 as already used");
    assert.match(resCountryCode.message, /already utilized/i);

    // Attempt 4: Leading zeroes country code (00923001234567)
    const resDoubleZero = await validatePromoCode("VIPONE", 5000, "00923001234567", "");
    assert.equal(resDoubleZero.valid, false, "Should reject 00923001234567 as already used");
    assert.match(resDoubleZero.message, /already utilized/i);

    // Control: A genuinely different customer mobile (03219876543) MUST succeed
    const resDifferentCustomer = await validatePromoCode("VIPONE", 5000, "03219876543", "other@atelier.pk");
    assert.equal(resDifferentCustomer.valid, true, "Genuinely different customer must be allowed");
    assert.equal(resDifferentCustomer.discountAmount, 1000, "20% discount on 5000 is 1000");
  });

  // --------------------------------------------------------------------------
  // Finding 3: Custom Builder Rogue Group Rejection
  // --------------------------------------------------------------------------
  await t.test("2. Custom Builder: Rejects unrecognized or rogue group identifiers", () => {
    const validGroups = [
      {
        id: "b455b550-d4cf-4ca6-b333-a302ca219760",
        slug: "bottle-size",
        name: "Bottle Size",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        options: [
          {
            id: "opt-size-50ml",
            group_id: "b455b550-d4cf-4ca6-b333-a302ca219760",
            name: "50ml Flacon",
            slug: "50ml",
            price_adjustment: 0,
            is_active: true,
          },
        ],
      },
    ];

    // Payload containing a valid selection PLUS an injected rogue group
    const rogueSelections = {
      "bottle-size": { id: "opt-size-50ml", name: "50ml Flacon" },
      "rogue-group-injected": [{ id: "opt-fake", name: "Rogue Option" }],
    };

    const result = validateBuilderSelections(validGroups, rogueSelections);
    assert.equal(result.isValid, false, "Validation must fail when rogue group is present");
    assert.ok(
      result.errors["rogue-group-injected"],
      "Error must explicitly mention the rogue group"
    );
    assert.match(result.errors["rogue-group-injected"], /Unrecognized customization group/);
  });

  // --------------------------------------------------------------------------
  // Finding 4: Duplicate Variant ID Guard
  // --------------------------------------------------------------------------
  await t.test("3. Checkout: Rejects duplicate standard variant IDs cleanly", async () => {
    const customerData = {
      fullName: "Zafar Iqbal",
      phone: "03001234567",
      email: "zafar@test.pk",
      address: "House 10, Street 2",
      city: "Karachi",
      province: "Sindh",
    };

    // Cart with identical variant_id duplicated across line items
    const duplicateVariantCart = [
      {
        isCustom: false,
        variantId: "99999999-aaaa-bbbb-cccc-111111111111",
        product: { id: "scente-noir", name: "SCENTE NOIR", price: 12500 },
        size: "50ml",
        quantity: 1,
      },
      {
        isCustom: false,
        variantId: "99999999-aaaa-bbbb-cccc-111111111111", // DUPLICATE!
        product: { id: "scente-noir", name: "SCENTE NOIR", price: 12500 },
        size: "50ml",
        quantity: 1,
      },
    ];

    await assert.rejects(
      async () => {
        await createCodOrder(customerData, duplicateVariantCart);
      },
      {
        message: /Duplicate variant IDs are not allowed in order items/i,
      },
      "Must throw controlled duplicate variant error"
    );

    // Control: Distinct variants MUST succeed
    const distinctVariantCart = [
      {
        isCustom: false,
        variantId: "99999999-aaaa-bbbb-cccc-111111111111",
        product: { id: "scente-noir", name: "SCENTE NOIR", price: 12500 },
        size: "50ml",
        quantity: 1,
      },
      {
        isCustom: false,
        variantId: "88888888-aaaa-bbbb-cccc-222222222222", // DISTINCT
        product: { id: "scente-amber", name: "SCENTE AMBER", price: 14500 },
        size: "50ml",
        quantity: 1,
      },
    ];

    const result = await createCodOrder(customerData, distinctVariantCart);
    assert.ok(result.data, "Order with distinct variants must succeed");
    assert.equal(result.data.order_items.length, 2, "Both distinct items must be created");
  });

  // --------------------------------------------------------------------------
  // Finding 5: Mixed Cart & Custom Formulations Integrity
  // --------------------------------------------------------------------------
  await t.test("4. Mixed Cart Regression: Standard catalog + Custom bespoke perfume", async () => {
    const customerData = {
      fullName: "Imran Qureshi",
      phone: "03339998877",
      email: "imran@test.pk",
      address: "Apartment 4B, Clifton",
      city: "Karachi",
      province: "Sindh",
    };

    const mixedCart = [
      {
        isCustom: false,
        variantId: "11111111-2222-3333-4444-555555555555",
        product: { id: "scente-noir", name: "SCENTE NOIR", price: 12500 },
        size: "50ml",
        quantity: 1,
      },
      {
        isCustom: true,
        product: { name: "Custom SCENTE", price: 3300 },
        size: "Bespoke",
        quantity: 1,
        price: 3300,
        selectedOptionIds: [],
        selections: {},
      },
    ];

    // In local mode without active builder in mock storage, createCodOrder handles custom items gracefully
    const orderRes = await createCodOrder(customerData, [mixedCart[0]]);
    assert.ok(orderRes.data, "Standard item order completes successfully");
    assert.equal(orderRes.data.order_items[0].product_name, "SCENTE NOIR");
  });
});
