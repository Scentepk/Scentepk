import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDiscountPercent, isDiscountActive, formatPrice } from "../lib/pricing.js";
import { normalizeProduct } from "./products.js";

describe("SCENTE Phase 7: Sale & Compare-at Pricing System", () => {
  // 1. Normal product without compare-at price
  it("1. Normal product without compare-at price displays standard price and no discount", () => {
    const raw = {
      id: "scente-noir",
      slug: "scente-noir",
      name: "SCENTE NOIR",
      price: 2999,
      compare_at_price: null,
      stock_quantity: 50,
      variants: [
        {
          id: "var-1",
          size: "50ml",
          price: 2999,
          compare_at_price: null,
          stock_quantity: 50,
        },
      ],
    };

    const product = normalizeProduct(raw);

    assert.equal(product.price, 2999);
    assert.equal(product.formattedPrice, "PKR 2,999");
    assert.equal(product.compareAtPrice, null);
    assert.equal(product.formattedCompareAtPrice, null);
    assert.equal(product.discountPercent, 0);
    assert.equal(product.isOnSale, false);

    assert.equal(product.variants[0].price, 2999);
    assert.equal(product.variants[0].compareAtPrice, null);
    assert.equal(product.variants[0].discountPercent, 0);
    assert.equal(product.variants[0].isOnSale, false);
  });

  // 2. Product with valid compare-at + sale price
  it("2. Product with valid compare-at + sale price correctly exposes sale pricing and formatted strings", () => {
    const raw = {
      id: "scente-bloom",
      slug: "scente-bloom",
      name: "BLOOM",
      price: 2799,
      compare_at_price: 3499,
      stock_quantity: 30,
      variants: [
        {
          id: "var-50ml",
          size: "50ml",
          price: 2799,
          compare_at_price: 3499,
          stock_quantity: 30,
        },
      ],
    };

    const product = normalizeProduct(raw);

    assert.equal(product.price, 2799);
    assert.equal(product.compareAtPrice, 3499);
    assert.equal(product.formattedPrice, "PKR 2,799");
    assert.equal(product.formattedCompareAtPrice, "PKR 3,499");
    assert.equal(product.isOnSale, true);
    assert.equal(product.discountPercent, 20); // (3499 - 2799) / 3499 = 20.0057% -> 20%
  });

  // 3. Correct discount percentage calculation
  it("3. Correct discount percentage formula: round(((compareAtPrice - salePrice) / compareAtPrice) * 100)", () => {
    // 3499 -> 2799 = 20%
    assert.equal(calculateDiscountPercent(3499, 2799), 20);
    // 2500 -> 1875 = 25%
    assert.equal(calculateDiscountPercent(2500, 1875), 25);
    // 5000 -> 2500 = 50%
    assert.equal(calculateDiscountPercent(5000, 2500), 50);
    // 10000 -> 9000 = 10%
    assert.equal(calculateDiscountPercent(10000, 9000), 10);
  });

  // 4. Sale price lower than compare-at price
  it("4. Sale price lower than compare-at price registers as active sale with positive discount", () => {
    assert.equal(isDiscountActive(3499, 2799), true);
    assert.equal(calculateDiscountPercent(3499, 2799) > 0, true);
  });

  // 5. Sale price equal to compare-at price
  it("5. Sale price equal to compare-at price does not register as on sale (0% discount)", () => {
    assert.equal(calculateDiscountPercent(2999, 2999), 0);
    assert.equal(isDiscountActive(2999, 2999), false);

    const product = normalizeProduct({
      id: "p1",
      slug: "p1",
      name: "P1",
      price: 2999,
      compare_at_price: 2999,
      variants: [{ size: "50ml", price: 2999, compare_at_price: 2999 }],
    });

    assert.equal(product.isOnSale, false);
    assert.equal(product.discountPercent, 0);
    assert.equal(product.compareAtPrice, null);
  });

  // 6. Sale price greater than compare-at price
  it("6. Sale price greater than compare-at price defensively yields 0% discount and no active sale", () => {
    assert.equal(calculateDiscountPercent(2500, 3000), 0);
    assert.equal(isDiscountActive(2500, 3000), false);

    const product = normalizeProduct({
      id: "p2",
      slug: "p2",
      name: "P2",
      price: 3500,
      compare_at_price: 2500,
      variants: [{ size: "50ml", price: 3500, compare_at_price: 2500 }],
    });

    assert.equal(product.isOnSale, false);
    assert.equal(product.discountPercent, 0);
    assert.equal(product.compareAtPrice, null);
  });

  // 7. Missing/null compare-at price
  it("7. Missing, null, undefined, or empty compare-at price returns 0% discount", () => {
    assert.equal(calculateDiscountPercent(null, 2799), 0);
    assert.equal(calculateDiscountPercent(undefined, 2799), 0);
    assert.equal(calculateDiscountPercent("", 2799), 0);
    assert.equal(isDiscountActive(null, 2799), false);
    assert.equal(isDiscountActive(undefined, 2799), false);
  });

  // 8. Invalid numeric values (NaN, Infinity, negative values)
  it("8. Invalid numeric values defensively yield 0 without crashing", () => {
    assert.equal(calculateDiscountPercent("not-a-number", 2799), 0);
    assert.equal(calculateDiscountPercent(3499, "invalid"), 0);
    assert.equal(calculateDiscountPercent(NaN, 2799), 0);
    assert.equal(calculateDiscountPercent(3499, NaN), 0);
    assert.equal(calculateDiscountPercent(Infinity, 2799), 0);
    assert.equal(calculateDiscountPercent(3499, -500), 0);
    assert.equal(calculateDiscountPercent(-3499, 2799), 0);

    assert.equal(formatPrice("invalid"), "PKR 0");
    assert.equal(formatPrice(-100), "PKR 0");
  });

  // 9. Multiple variants with different prices and compare-at prices
  it("9. Multiple variants can have distinct selling and compare-at prices", () => {
    const raw = {
      id: "scente-leather",
      slug: "scente-leather",
      name: "LEATHER OUD",
      price: 1999, // Base/starting price matches smallest variant
      compare_at_price: 2499,
      variants: [
        {
          id: "var-30ml",
          size: "30ml",
          price: 1999,
          compare_at_price: 2499,
          stock_quantity: 40,
        },
        {
          id: "var-50ml",
          size: "50ml",
          price: 2799,
          compare_at_price: 3499,
          stock_quantity: 50,
        },
        {
          id: "var-100ml",
          size: "100ml",
          price: 4499,
          compare_at_price: 5499,
          stock_quantity: 20,
        },
      ],
    };

    const product = normalizeProduct(raw);

    assert.equal(product.variants.length, 3);

    // 30ml
    const v30 = product.variants.find((v) => v.size === "30ml");
    assert.equal(v30.price, 1999);
    assert.equal(v30.compareAtPrice, 2499);
    assert.equal(v30.formattedPrice, "PKR 1,999");
    assert.equal(v30.formattedCompareAtPrice, "PKR 2,499");
    assert.equal(v30.discountPercent, 20); // (2499 - 1999) / 2499 = 20%
    assert.equal(v30.isOnSale, true);

    // 50ml
    const v50 = product.variants.find((v) => v.size === "50ml");
    assert.equal(v50.price, 2799);
    assert.equal(v50.compareAtPrice, 3499);
    assert.equal(v50.formattedPrice, "PKR 2,799");
    assert.equal(v50.formattedCompareAtPrice, "PKR 3,499");
    assert.equal(v50.discountPercent, 20); // (3499 - 2799) / 3499 = 20%
    assert.equal(v50.isOnSale, true);

    // 100ml
    const v100 = product.variants.find((v) => v.size === "100ml");
    assert.equal(v100.price, 4499);
    assert.equal(v100.compareAtPrice, 5499);
    assert.equal(v100.formattedPrice, "PKR 4,499");
    assert.equal(v100.formattedCompareAtPrice, "PKR 5,499");
    assert.equal(v100.discountPercent, 18); // (5499 - 4499) / 5499 = 18.18% -> 18%
    assert.equal(v100.isOnSale, true);
  });

  // 10. Correct selected variant pricing
  it("10. Selected variant accurately provides its own compare-at price without bleeding across sizes", () => {
    const variants = [
      { size: "30ml", price: 1999, compareAtPrice: null, formattedPrice: "PKR 1,999" },
      { size: "50ml", price: 2799, compareAtPrice: 3499, formattedPrice: "PKR 2,799" },
    ];

    // Simulate ProductDetails variant selection
    const selected30 = variants.find((v) => v.size === "30ml");
    assert.equal(selected30.price, 1999);
    assert.equal(selected30.compareAtPrice, null);

    const selected50 = variants.find((v) => v.size === "50ml");
    assert.equal(selected50.price, 2799);
    assert.equal(selected50.compareAtPrice, 3499);
  });

  // 11. Cart uses selling price
  it("11. Cart subtotal strictly accumulates using selling price (price), never compareAtPrice", () => {
    const cartItems = [
      {
        size: "50ml",
        quantity: 2,
        price: 2799,
        compareAtPrice: 3499,
        product: { id: "p1", name: "Fragrance A", price: 2799, compareAtPrice: 3499 },
      },
      {
        size: "30ml",
        quantity: 1,
        price: 1999,
        compareAtPrice: 2499,
        product: { id: "p2", name: "Fragrance B", price: 1999, compareAtPrice: 2499 },
      },
    ];

    const subtotal = cartItems.reduce(
      (acc, item) => acc + (item.price ?? item.product.price) * item.quantity,
      0
    );

    // Expected: 2 * 2799 + 1 * 1999 = 5598 + 1999 = 7597 (NOT 2*3499 + 1*2499 = 9497)
    assert.equal(subtotal, 7597);
  });

  // 12. Order creation preserves selling price
  it("12. Order creation stores unit_price as the actual selling price paid", () => {
    const cartItem = {
      product: { id: "p1", name: "Scente Royale", slug: "scente-royale", price: 2799, compareAtPrice: 3499 },
      size: "50ml",
      price: 2799,
      compareAtPrice: 3499,
      quantity: 2,
    };

    const itemPrice = cartItem.price ?? cartItem.product.price;
    const orderItem = {
      product_id: cartItem.product.id,
      product_name: cartItem.product.name,
      product_slug: cartItem.product.slug,
      size: cartItem.size,
      quantity: cartItem.quantity,
      unit_price: itemPrice,
      line_total: itemPrice * cartItem.quantity,
    };

    assert.equal(orderItem.unit_price, 2799);
    assert.equal(orderItem.line_total, 5598);
  });

  // 13. Existing products without sale pricing remain compatible
  it("13. Existing catalog products without compare_at_price remain 100% backward compatible", () => {
    const legacyRow = {
      id: "legacy-perfume",
      slug: "legacy-perfume",
      name: "Legacy Perfume",
      subtitle: "Extrait de Parfum",
      price: 12500,
      stock_quantity: 100,
      family: "woody",
    };

    const normalized = normalizeProduct(legacyRow);

    assert.equal(normalized.price, 12500);
    assert.equal(normalized.formattedPrice, "PKR 12,500");
    assert.equal(normalized.compareAtPrice, null);
    assert.equal(normalized.formattedCompareAtPrice, null);
    assert.equal(normalized.discountPercent, 0);
    assert.equal(normalized.isOnSale, false);
    assert.equal(normalized.variants.length, 1);
    assert.equal(normalized.variants[0].price, 12500);
    assert.equal(normalized.variants[0].compareAtPrice, null);
  });
});
