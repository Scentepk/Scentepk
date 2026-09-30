import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeReview } from "./reviews.js";

describe("SCENTÉ Reviews Service & Normalization", () => {
  it("1. Normalizes database row to frontend camelCase representation", () => {
    const dbRow = {
      id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      customer_name: "Tariq J.",
      review_text: "Exceptional sillage and luxurious presentation.",
      rating: 5,
      location: "Lahore",
      product_id: "scente-noir",
      is_published: true,
      display_order: 1,
      created_at: "2026-09-30T12:00:00Z",
      updated_at: "2026-09-30T12:00:00Z",
      product: {
        id: "scente-noir",
        name: "SCENTÉ NOIR",
        slug: "scente-noir",
      },
    };

    const review = normalizeReview(dbRow);

    assert.equal(review.id, "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d");
    assert.equal(review.customerName, "Tariq J.");
    assert.equal(review.reviewText, "Exceptional sillage and luxurious presentation.");
    assert.equal(review.rating, 5);
    assert.equal(review.location, "Lahore");
    assert.equal(review.productId, "scente-noir");
    assert.equal(review.productName, "SCENTÉ NOIR");
    assert.equal(review.productSlug, "scente-noir");
    assert.equal(review.isPublished, true);
    assert.equal(review.displayOrder, 1);
  });

  it("2. Safely handles null product and general reviews", () => {
    const dbRow = {
      id: "general-rev-1",
      customer_name: "Fatima S.",
      review_text: "The atelier packaging is pristine and delivery was prompt.",
      rating: 4,
      location: "Karachi",
      product_id: null,
      is_published: false,
      display_order: 0,
    };

    const review = normalizeReview(dbRow);

    assert.equal(review.id, "general-rev-1");
    assert.equal(review.customerName, "Fatima S.");
    assert.equal(review.productId, null);
    assert.equal(review.productName, null);
    assert.equal(review.product, null);
    assert.equal(review.isPublished, false);
    assert.equal(review.rating, 4);
  });

  it("3. Handles missing or null database row defensively", () => {
    assert.equal(normalizeReview(null), null);
    assert.equal(normalizeReview(undefined), null);
  });

  it("4. Enforces numeric fallback for rating and display order", () => {
    const dbRow = {
      id: "rev-fallback",
      customer_name: "Omar A.",
      review_text: "Pure quiet luxury.",
      rating: "5",
      display_order: "2",
    };

    const review = normalizeReview(dbRow);
    assert.equal(typeof review.rating, "number");
    assert.equal(review.rating, 5);
    assert.equal(typeof review.displayOrder, "number");
    assert.equal(review.displayOrder, 2);
  });
});
