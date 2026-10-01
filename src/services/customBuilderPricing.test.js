import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCustomPerfumePrice,
  validateBuilderSelections,
  buildCustomConfigurationSnapshot,
} from "./customBuilderPricing.js";

describe("SCENTÉ Phase 2: Custom Perfume Builder Pricing & Validation Engine", () => {
  // ============================================================================
  // 1. PRICING CALCULATION TESTS
  // ============================================================================
  describe("Pricing Calculation (calculateCustomPerfumePrice)", () => {
    it("1. Returns base price when no options are selected", () => {
      const price = calculateCustomPerfumePrice(1200, []);
      assert.equal(price, 1200);
    });

    it("2. Correctly adds single option adjustment to base price", () => {
      const options = [{ id: "opt-1", name: "Woody", price_adjustment: 350 }];
      const price = calculateCustomPerfumePrice(1500, options);
      assert.equal(price, 1850);
    });

    it("3. Correctly adds multiple option adjustments to base price", () => {
      const options = [
        { id: "opt-1", name: "30ml", price_adjustment: 400 },
        { id: "opt-2", name: "Woody", price_adjustment: 150 },
        { id: "opt-3", name: "Oud", price_adjustment: 300 },
        { id: "opt-4", name: "Intense", price_adjustment: 200 },
      ];
      const price = calculateCustomPerfumePrice(1200, options);
      // 1200 + 400 + 150 + 300 + 200 = 2250
      assert.equal(price, 2250);
    });

    it("4. Handles options with zero price adjustment seamlessly", () => {
      const options = [
        { id: "opt-1", name: "10ml", price_adjustment: 0 },
        { id: "opt-2", name: "Fresh", price_adjustment: 0 },
        { id: "opt-3", name: "Soft", price_adjustment: 0 },
      ];
      const price = calculateCustomPerfumePrice(1200, options);
      assert.equal(price, 1200);
    });

    it("5. Coerces string and floating values to safe integer PKR", () => {
      const options = [
        { id: "opt-1", name: "Oud", price_adjustment: "300.75" },
        { id: "opt-2", name: "Amber", price_adjustment: 150 },
      ];
      const price = calculateCustomPerfumePrice("1200.40", options);
      // 1200 + 301 + 150 = 1651
      assert.equal(price, 1651);
    });

    it("6. Defensively handles null, undefined, negative, or corrupt option objects", () => {
      const options = [
        null,
        undefined,
        { id: "opt-1", price_adjustment: -100 }, // Clamped to 0
        { id: "opt-2" }, // missing price_adjustment defaults to 0
        { id: "opt-3", price_adjustment: "invalid" },
      ];
      const price = calculateCustomPerfumePrice(null, options);
      assert.equal(price, 0);
    });

    it("7. Supports camelCase priceAdjustment key as well as snake_case", () => {
      const options = [
        { id: "opt-1", priceAdjustment: 250 },
        { id: "opt-2", price_adjustment: 100 },
      ];
      const price = calculateCustomPerfumePrice(1000, options);
      assert.equal(price, 1350);
    });
  });

  // ============================================================================
  // 2. SELECTION VALIDATION TESTS
  // ============================================================================
  describe("Selection Validation (validateBuilderSelections)", () => {
    const mockGroups = [
      {
        id: "grp-size",
        slug: "size",
        name: "Size",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        options: [
          { id: "opt-10ml", name: "10ml", slug: "10ml", price_adjustment: 0, is_active: true },
          { id: "opt-50ml", name: "50ml", slug: "50ml", price_adjustment: 500, is_active: true },
        ],
      },
      {
        id: "grp-profile",
        slug: "profile",
        name: "Fragrance Profile",
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        options: [
          { id: "opt-woody", name: "Woody", slug: "woody", price_adjustment: 150, is_active: true },
          { id: "opt-floral", name: "Floral", slug: "floral", price_adjustment: 100, is_active: true },
        ],
      },
      {
        id: "grp-notes",
        slug: "notes",
        name: "Fragrance Notes",
        selection_type: "multiple",
        is_required: true,
        min_selections: 1,
        max_selections: 3,
        options: [
          { id: "opt-vanilla", name: "Vanilla", slug: "vanilla", price_adjustment: 100, is_active: true },
          { id: "opt-oud", name: "Oud", slug: "oud", price_adjustment: 300, is_active: true },
          { id: "opt-rose", name: "Rose", slug: "rose", price_adjustment: 80, is_active: true },
          { id: "opt-amber", name: "Amber", slug: "amber", price_adjustment: 120, is_active: true },
          { id: "opt-discontinued", name: "Discontinued", slug: "disc", price_adjustment: 50, is_active: false },
        ],
      },
      {
        id: "grp-addon",
        slug: "addon",
        name: "Optional Addon",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        options: [
          { id: "opt-box", name: "Luxury Gift Box", slug: "box", price_adjustment: 400, is_active: true },
        ],
      },
    ];

    it("1. Passes with completely valid selections across all groups", () => {
      const selections = {
        size: { id: "opt-50ml", name: "50ml" },
        profile: { id: "opt-woody", name: "Woody" },
        notes: [
          { id: "opt-vanilla", name: "Vanilla" },
          { id: "opt-oud", name: "Oud" },
        ],
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, true);
      assert.equal(Object.keys(result.errors).length, 0);
      assert.equal(result.flattenedSelectedOptions.length, 4);
    });

    it("2. Fails when a required group has no selection", () => {
      const selections = {
        size: { id: "opt-50ml" },
        // profile is missing
        notes: [{ id: "opt-vanilla" }],
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.profile);
      assert.match(result.errors.profile, /Please make a selection for "Fragrance Profile"/);
    });

    it("3. Fails when single-select group receives multiple options", () => {
      const selections = {
        size: [{ id: "opt-10ml" }, { id: "opt-50ml" }], // Invalid multiple
        profile: { id: "opt-woody" },
        notes: [{ id: "opt-vanilla" }],
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.size);
      assert.match(result.errors.size, /only allows a single selection/);
    });

    it("4. Fails when selections exceed max_selections on a multiple group", () => {
      const selections = {
        size: { id: "opt-50ml" },
        profile: { id: "opt-woody" },
        notes: [
          { id: "opt-vanilla" },
          { id: "opt-oud" },
          { id: "opt-rose" },
          { id: "opt-amber" }, // 4 selected, max is 3
        ],
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.notes);
      assert.match(result.errors.notes, /at most 3 options/);
    });

    it("5. Rejects inactive options even if passed in selections", () => {
      const selections = {
        size: { id: "opt-50ml" },
        profile: { id: "opt-woody" },
        notes: [
          { id: "opt-discontinued" }, // is_active = false
        ],
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.notes);
      assert.match(result.errors.notes, /currently unavailable/);
    });

    it("6. Rejects foreign or unknown option IDs that do not belong to group", () => {
      const selections = {
        size: { id: "opt-nonexistent" },
        profile: { id: "opt-woody" },
        notes: [{ id: "opt-vanilla" }],
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.size);
      assert.match(result.errors.size, /not available in "Size"/);
    });

    it("7. Allows optional group to have zero selections", () => {
      const selections = {
        size: { id: "opt-50ml" },
        profile: { id: "opt-woody" },
        notes: [{ id: "opt-vanilla" }],
        addon: null, // Optional group left empty
      };

      const result = validateBuilderSelections(mockGroups, selections);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.addon, undefined);
    });
  });

  // ============================================================================
  // 3. IMMUTABLE SNAPSHOT TESTS
  // ============================================================================
  describe("Snapshot Generator (buildCustomConfigurationSnapshot)", () => {
    it("Generates a structured, immutable historical order snapshot", () => {
      const settings = { base_price: 1200, currency: "PKR" };
      const groups = [
        { id: "g1", slug: "size", name: "Size" },
        { id: "g2", slug: "notes", name: "Notes" },
      ];
      const selections = {
        size: { id: "o1", name: "50ml", slug: "50ml", price_adjustment: 500 },
        notes: [
          { id: "o2", name: "Oud", slug: "oud", category: "Base Notes", price_adjustment: 300 },
          { id: "o3", name: "Vanilla", slug: "vanilla", category: "Base Notes", price_adjustment: 100 },
        ],
      };

      const snapshot = buildCustomConfigurationSnapshot(settings, groups, selections, 2100);

      assert.equal(snapshot.base_price, 1200);
      assert.equal(snapshot.total_price, 2100);
      assert.equal(snapshot.formatted_total_price, "PKR 2,100");
      assert.equal(snapshot.summary, "50ml · Oud, Vanilla");
      assert.equal(snapshot.groups.length, 2);
      assert.equal(snapshot.groups[0].selected_options[0].name, "50ml");
      assert.equal(snapshot.groups[1].selected_options.length, 2);
      assert.ok(snapshot.created_at);
    });
  });

  // ============================================================================
  // 4. PHASE 5: CART + CHECKOUT + ORDER INTEGRATION TESTS
  // ============================================================================
  describe("Phase 5: Custom Perfume Cart & Order Integration", () => {
    it("1. Custom perfume cart item line total scales accurately with quantity", () => {
      const basePrice = 2500;
      const selectedOptions = [
        { id: "o1", name: "Amber", price_adjustment: 300 },
        { id: "o2", name: "Woody", price_adjustment: 500 },
      ];
      const verifiedUnitPrice = calculateCustomPerfumePrice(basePrice, selectedOptions);
      assert.equal(verifiedUnitPrice, 3300);

      const quantity = 3;
      const lineTotal = verifiedUnitPrice * quantity;
      assert.equal(lineTotal, 9900);
    });

    it("2. Cart subtotal correctly combines both standard products and custom perfumes", () => {
      const standardItem = {
        isCustom: false,
        price: 4500,
        quantity: 2, // 9000
      };
      const customItem = {
        isCustom: true,
        price: 3300,
        quantity: 1, // 3300
      };

      const cartItems = [standardItem, customItem];
      const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      assert.equal(subtotal, 12300);
    });

    it("3. Stale cart detection identifies mismatch when option prices or base prices change", () => {
      // Customer added to cart when unit price was 3300
      const cartItem = {
        isCustom: true,
        price: 3300,
        selectedOptionIds: ["opt-woody", "opt-amber"],
      };

      // Admin later adjusted base price or option delta in database
      const newBasePrice = 2800; // was 2500
      const currentOptions = [
        { id: "opt-woody", price_adjustment: 500 },
        { id: "opt-amber", price_adjustment: 300 },
      ];
      const newlyCalculatedPrice = calculateCustomPerfumePrice(newBasePrice, currentOptions);
      assert.equal(newlyCalculatedPrice, 3600);

      const isStale = cartItem.price !== newlyCalculatedPrice;
      assert.equal(isStale, true);
    });

    it("4. Inactive option renders custom formulation invalid during checkout validation", () => {
      const groups = [
        {
          id: "g1",
          slug: "notes",
          name: "Notes",
          selection_type: "single",
          is_required: true,
          options: [
            { id: "opt-active", name: "Bergamot", is_active: true, price_adjustment: 0 },
            { id: "opt-archived", name: "Rare Oud", is_active: false, price_adjustment: 800 },
          ],
        },
      ];

      const staleSelections = {
        notes: { id: "opt-archived", name: "Rare Oud" },
      };

      const result = validateBuilderSelections(groups, staleSelections);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.notes);
      assert.match(result.errors.notes, /currently unavailable/);
    });
  });

  // ============================================================================
  // 5. PHASE 6: POST-PURCHASE HISTORICAL ORDERS, TRACKING & FORMULATION DISPLAY
  // ============================================================================
  describe("Phase 6: Post-Purchase Formulation, Historical Immutability & Tracking", () => {
    it("1. Historical snapshot remains immutable even if future builder options change prices", () => {
      // Order placed historically: Base 2500, Vanilla +300 -> Total 2800
      const historicalOrder = {
        id: "ord-hist-1",
        reference: "SC-789012",
        order_items: [
          {
            id: "item-hist-1",
            is_custom: true,
            unit_price: 2800,
            quantity: 1,
            line_total: 2800,
            custom_configuration: {
              base_price: 2500,
              total_price: 2800,
              formatted_total_price: "PKR 2,800",
              summary: "Bourbon Vanilla",
              groups: [
                {
                  group_name: "Base Accord",
                  selected_options: [
                    { id: "opt-vanilla", name: "Bourbon Vanilla", price_adjustment: 300 },
                  ],
                },
              ],
            },
          },
        ],
      };

      // Later, admin alters live builder settings: Base 3000, Vanilla +700
      const liveBuilderSetting = { base_price: 3000 };
      const liveOption = { id: "opt-vanilla", price_adjustment: 700 };
      const liveCalculatedPrice = calculateCustomPerfumePrice(liveBuilderSetting.base_price, [liveOption]);
      assert.equal(liveCalculatedPrice, 3700);

      // Verify historical order still displays stored snapshot prices: 300 adjustment, 2800 total
      const histItem = historicalOrder.order_items[0];
      assert.equal(histItem.unit_price, 2800);
      assert.equal(histItem.custom_configuration.base_price, 2500);
      assert.equal(histItem.custom_configuration.total_price, 2800);
      assert.equal(histItem.custom_configuration.groups[0].selected_options[0].price_adjustment, 300);
      assert.notEqual(histItem.custom_configuration.total_price, liveCalculatedPrice);
    });

    it("2. Mixed order correctly aggregates standard and custom line totals", () => {
      const order = {
        reference: "SC-MIXED-1",
        order_items: [
          {
            is_custom: false,
            product_name: "SCENTÉ NOIR",
            unit_price: 12500,
            quantity: 2,
            line_total: 25000,
          },
          {
            is_custom: true,
            product_name: "Custom SCENTÉ",
            unit_price: 3300,
            quantity: 1,
            line_total: 3300,
            custom_configuration: {
              base_price: 2500,
              total_price: 3300,
              summary: "50ml · Woody · Amber",
            },
          },
        ],
      };

      const calculatedSubtotal = order.order_items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );
      assert.equal(calculatedSubtotal, 28300);
      assert.equal(order.order_items[0].is_custom, false);
      assert.equal(order.order_items[1].is_custom, true);
    });

    it("3. Null-safe rendering gracefully falls back when custom_configuration is null", () => {
      const legacyItem = {
        is_custom: true,
        product_name: "Custom SCENTÉ",
        size: "50ml",
        unit_price: 3000,
        quantity: 1,
        line_total: 3000,
        custom_configuration: null, // Legacy or malformed
      };

      // Safely access fields without crashing
      const summary = legacyItem.custom_configuration?.summary || "Custom SCENTÉ";
      const groups = legacyItem.custom_configuration?.groups || [];
      const basePrice = legacyItem.custom_configuration?.base_price ?? legacyItem.unit_price;

      assert.equal(summary, "Custom SCENTÉ");
      assert.equal(groups.length, 0);
      assert.equal(basePrice, 3000);
    });
  });

  // ============================================================================
  // 4. SERVER-SIDE RPC PRICE AUTHORITY & TAMPER RESISTANCE SIMULATION
  // ============================================================================
  describe("Server-Side Price Authority & Tamper Resistance Rules", () => {
    // Canonical database records simulation
    const dbSettings = { base_price: 2000, is_active: true };
    const dbGroups = [
      { id: "grp-size", slug: "size", name: "Size", is_required: true, min_selections: 1, max_selections: 1, selection_type: "single", is_active: true },
      { id: "grp-notes", slug: "notes", name: "Notes", is_required: true, min_selections: 1, max_selections: 3, selection_type: "multiple", is_active: true },
    ];
    const dbOptions = [
      { id: "opt-50ml", group_id: "grp-size", name: "50ml", price_adjustment: 0, is_active: true },
      { id: "opt-woody", group_id: "grp-notes", name: "Woody", price_adjustment: 400, is_active: true },
      { id: "opt-vanilla", group_id: "grp-notes", name: "Vanilla", price_adjustment: 300, is_active: true },
      { id: "opt-discontinued", group_id: "grp-notes", name: "Discontinued Note", price_adjustment: 200, is_active: false },
    ];

    /**
     * Pure function mimicking the PostgreSQL Migration 022 server-side calculation & validation logic
     */
    function simulateServerCodRpcValidation(clientItem, builderSettings = dbSettings, groups = dbGroups, options = dbOptions) {
      if (!builderSettings.is_active) {
        throw new Error("The Custom Perfume Builder is currently inactive. Please review your bag.");
      }

      const customConfig = clientItem.custom_configuration;
      if (!customConfig || typeof customConfig !== "object") {
        throw new Error("Custom perfume configuration is missing or malformed.");
      }

      let optionAdjustmentsSum = 0;

      for (const group of groups.filter((g) => g.is_active)) {
        let groupSelCount = 0;
        const configGroups = customConfig.groups || [];
        const grpMatch = configGroups.find((g) => g.group_id === group.id || g.group_slug === group.slug);
        const selectedOpts = grpMatch?.selected_options || [];

        // Deduplicate selected IDs
        const distinctOptIds = [...new Set(selectedOpts.map((o) => o?.id).filter(Boolean))];

        for (const optId of distinctOptIds) {
          const optRecord = options.find((o) => o.id === optId);
          if (!optRecord) {
            throw new Error(`Option does not exist for group "${group.name}"`);
          }
          if (!optRecord.is_active) {
            throw new Error(`Option "${optRecord.name}" is currently unavailable`);
          }
          if (optRecord.group_id !== group.id) {
            throw new Error(`Option "${optRecord.name}" does not belong to group "${group.name}"`);
          }

          groupSelCount++;
          optionAdjustmentsSum += Math.max(0, optRecord.price_adjustment);
        }

        if (group.is_required && groupSelCount === 0) {
          throw new Error(`Please make a selection for "${group.name}"`);
        }
        if (groupSelCount > 0 && groupSelCount < group.min_selections) {
          throw new Error(`Please select at least ${group.min_selections} option(s) for "${group.name}"`);
        }
        if (groupSelCount > group.max_selections) {
          throw new Error(`You can select at most ${group.max_selections} option(s) for "${group.name}"`);
        }
        if (group.selection_type === "single" && groupSelCount > 1) {
          throw new Error(`Group "${group.name}" only permits a single selection`);
        }
      }

      // Server calculates authoritative unit price (completely ignoring clientItem.unit_price)
      const serverUnitPrice = Math.max(0, builderSettings.base_price + optionAdjustmentsSum);
      const qty = Math.max(1, clientItem.quantity || 1);
      const serverLineTotal = serverUnitPrice * qty;

      return {
        authoritativeUnitPrice: serverUnitPrice,
        authoritativeLineTotal: serverLineTotal,
      };
    }

    const validPayload = {
      is_custom: true,
      quantity: 1,
      custom_configuration: {
        groups: [
          { group_id: "grp-size", group_slug: "size", selected_options: [{ id: "opt-50ml" }] },
          {
            group_id: "grp-notes",
            group_slug: "notes",
            selected_options: [{ id: "opt-woody" }, { id: "opt-vanilla" }],
          },
        ],
      },
    };

    it("Test A: Correct price - base 2000 + adjustments 700 = 2700", () => {
      const payload = { ...validPayload, unit_price: 2700 };
      const res = simulateServerCodRpcValidation(payload);
      assert.equal(res.authoritativeUnitPrice, 2700);
      assert.equal(res.authoritativeLineTotal, 2700);
    });

    it("Test B: Manipulated low price (unit_price = 1) is ignored and evaluated to authoritative 2700", () => {
      const payload = { ...validPayload, unit_price: 1 };
      const res = simulateServerCodRpcValidation(payload);
      assert.equal(res.authoritativeUnitPrice, 2700);
      assert.notEqual(res.authoritativeUnitPrice, 1);
    });

    it("Test C: Manipulated high price (unit_price = 999999) is ignored and evaluated to authoritative 2700", () => {
      const payload = { ...validPayload, unit_price: 999999 };
      const res = simulateServerCodRpcValidation(payload);
      assert.equal(res.authoritativeUnitPrice, 2700);
      assert.notEqual(res.authoritativeUnitPrice, 999999);
    });

    it("Test D: Missing client unit_price is safely evaluated to authoritative 2700", () => {
      const payload = { ...validPayload };
      delete payload.unit_price;
      const res = simulateServerCodRpcValidation(payload);
      assert.equal(res.authoritativeUnitPrice, 2700);
    });

    it("Test E: Invalid / nonexistent option causes server RPC to reject order", () => {
      const payload = {
        is_custom: true,
        quantity: 1,
        custom_configuration: {
          groups: [
            { group_id: "grp-size", selected_options: [{ id: "opt-50ml" }] },
            { group_id: "grp-notes", selected_options: [{ id: "opt-fake-uuid" }] },
          ],
        },
      };
      assert.throws(() => simulateServerCodRpcValidation(payload), /Option does not exist/);
    });

    it("Test F: Inactive option causes server RPC to reject order", () => {
      const payload = {
        is_custom: true,
        quantity: 1,
        custom_configuration: {
          groups: [
            { group_id: "grp-size", selected_options: [{ id: "opt-50ml" }] },
            { group_id: "grp-notes", selected_options: [{ id: "opt-discontinued" }] },
          ],
        },
      };
      assert.throws(() => simulateServerCodRpcValidation(payload), /currently unavailable/);
    });

    it("Test G: Option submitted under wrong group causes server RPC to reject order", () => {
      const payload = {
        is_custom: true,
        quantity: 1,
        custom_configuration: {
          groups: [
            { group_id: "grp-size", selected_options: [{ id: "opt-woody" }] }, // Woody belongs to notes, not size
            { group_id: "grp-notes", selected_options: [{ id: "opt-vanilla" }] },
          ],
        },
      };
      assert.throws(() => simulateServerCodRpcValidation(payload), /does not belong to group/);
    });

    it("Test H: Invalid selection count (exceeding max or below min) causes server RPC to reject order", () => {
      const payload = {
        is_custom: true,
        quantity: 1,
        custom_configuration: {
          groups: [
            {
              group_id: "grp-size",
              selected_options: [{ id: "opt-50ml" }, { id: "opt-100ml" }], // single selection exceeded
            },
          ],
        },
      };
      assert.throws(() => simulateServerCodRpcValidation(payload));
    });

    it("Test I: Inactive builder causes server RPC to reject order", () => {
      const inactiveSettings = { base_price: 2000, is_active: false };
      assert.throws(
        () => simulateServerCodRpcValidation(validPayload, inactiveSettings),
        /Custom Perfume Builder is currently inactive/
      );
    });
  });

  // ============================================================================
  // 6. SEQUENTIAL STEP SELECTION & LIVE RUNNING TOTAL RECALCULATION
  // ============================================================================
  describe("Sequential Step Selection & Immediate Recalculation", () => {
    const basePrice = 2000;
    const optFresh = { id: "opt-fresh", name: "Fresh", price_adjustment: 0 };
    const optOud = { id: "opt-oud", name: "Oud", price_adjustment: 500 };
    const optVanilla = { id: "opt-vanilla", name: "Vanilla", price_adjustment: 200 };
    const opt50ml = { id: "opt-50ml", name: "50ml", price_adjustment: 400 };

    it("1. Sequential additions update running total immediately at each step", () => {
      // Step 1: Base + Fresh (0) = 2000
      let selections = [optFresh];
      assert.equal(calculateCustomPerfumePrice(basePrice, selections), 2000);

      // Step 2: + Oud (500) = 2500
      selections.push(optOud);
      assert.equal(calculateCustomPerfumePrice(basePrice, selections), 2500);

      // Step 3: + 50ml (400) = 2900
      selections.push(opt50ml);
      assert.equal(calculateCustomPerfumePrice(basePrice, selections), 2900);
    });

    it("2. Modifying a previous step immediately updates running total", () => {
      // Starting from 2900 (Fresh 0 + Oud 500 + 50ml 400)
      let selectionsMap = {
        family: optFresh,
        notes: optOud,
        size: opt50ml,
      };

      const getPrice = (map) =>
        calculateCustomPerfumePrice(basePrice, Object.values(map));

      assert.equal(getPrice(selectionsMap), 2900);

      // User goes back to Step 2 and replaces Oud (+500) with Vanilla (+200)
      selectionsMap.notes = optVanilla;
      assert.equal(getPrice(selectionsMap), 2600); // 2000 + 0 + 200 + 400 = 2600
    });

    it("3. Required step without selection blocks continuation", () => {
      const isStepSatisfied = (group, selectedList) => {
        const isRequired = group.is_required !== false;
        const count = selectedList.length;
        const isSingle = group.selection_type === "single";

        if (isRequired && count === 0) return false;
        if (count === 0 && !isRequired) return true;

        const min = Number(group.min_selections ?? (isRequired ? 1 : 0));
        if (count < min) return false;

        const max = Number(group.max_selections ?? (isSingle ? 1 : 99));
        if (count > max) return false;

        return true;
      };

      const reqSingleGroup = { is_required: true, selection_type: "single" };
      assert.equal(isStepSatisfied(reqSingleGroup, []), false);
      assert.equal(isStepSatisfied(reqSingleGroup, [optFresh]), true);

      const optionalGroup = { is_required: false, selection_type: "single" };
      assert.equal(isStepSatisfied(optionalGroup, []), true);
      assert.equal(isStepSatisfied(optionalGroup, [optFresh]), true);

      const reqMultiGroup = { is_required: true, selection_type: "multiple", min_selections: 2, max_selections: 3 };
      assert.equal(isStepSatisfied(reqMultiGroup, []), false);
      assert.equal(isStepSatisfied(reqMultiGroup, [optFresh]), false);
      assert.equal(isStepSatisfied(reqMultiGroup, [optFresh, optOud]), true);
      assert.equal(isStepSatisfied(reqMultiGroup, [optFresh, optOud, optVanilla]), true);
      assert.equal(isStepSatisfied(reqMultiGroup, [optFresh, optOud, optVanilla, opt50ml]), false); // exceeds max
    });
  });
});

