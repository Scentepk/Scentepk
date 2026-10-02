import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReview,
  getReviewsVisibleCount,
  calculateCarouselMaxIndex,
  shouldShowCarouselNavigation,
} from "./reviews.js";

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

describe("SCENTÉ Patron Impressions Carousel Logic", () => {
  it("1. Responsive visible count: mobile (<768) = 1, tablet (768-1023) = 2, desktop (>=1024) = 3", () => {
    assert.equal(getReviewsVisibleCount(375), 1);
    assert.equal(getReviewsVisibleCount(640), 1);
    assert.equal(getReviewsVisibleCount(767), 1);
    assert.equal(getReviewsVisibleCount(768), 2);
    assert.equal(getReviewsVisibleCount(900), 2);
    assert.equal(getReviewsVisibleCount(1023), 2);
    assert.equal(getReviewsVisibleCount(1024), 3);
    assert.equal(getReviewsVisibleCount(1440), 3);
  });

  it("2. Edge cases (0, 1, 2, 3 reviews) correctly calculate maxIndex and navigation need", () => {
    // 0 reviews
    assert.equal(calculateCarouselMaxIndex(0, 3), 0);
    assert.equal(shouldShowCarouselNavigation(0, 3), false);

    // 1 review: desktop, tablet, mobile all have maxIndex=0 and navigation=false
    assert.equal(calculateCarouselMaxIndex(1, 3), 0);
    assert.equal(shouldShowCarouselNavigation(1, 3), false);
    assert.equal(calculateCarouselMaxIndex(1, 1), 0);
    assert.equal(shouldShowCarouselNavigation(1, 1), false);

    // 2 reviews:
    // desktop (visible 3) -> maxIndex=0, navigation=false (no awkward empty space, no navigation)
    assert.equal(calculateCarouselMaxIndex(2, 3), 0);
    assert.equal(shouldShowCarouselNavigation(2, 3), false);
    // tablet (visible 2) -> maxIndex=0, navigation=false
    assert.equal(calculateCarouselMaxIndex(2, 2), 0);
    assert.equal(shouldShowCarouselNavigation(2, 2), false);
    // mobile (visible 1) -> maxIndex=1, navigation=true (moves 1 review at a time)
    assert.equal(calculateCarouselMaxIndex(2, 1), 1);
    assert.equal(shouldShowCarouselNavigation(2, 1), true);

    // 3 reviews:
    // desktop (visible 3) -> maxIndex=0, navigation=false (shows all 3, no unnecessary arrows)
    assert.equal(calculateCarouselMaxIndex(3, 3), 0);
    assert.equal(shouldShowCarouselNavigation(3, 3), false);
    // tablet (visible 2) -> maxIndex=1, navigation=true
    assert.equal(calculateCarouselMaxIndex(3, 2), 1);
    assert.equal(shouldShowCarouselNavigation(3, 2), true);
    // mobile (visible 1) -> maxIndex=2, navigation=true
    assert.equal(calculateCarouselMaxIndex(3, 1), 2);
    assert.equal(shouldShowCarouselNavigation(3, 1), true);
  });

  it("3. 4+ and 6+ reviews enable carousel across desktop, tablet, and mobile moving 1 review at a time", () => {
    // 4 reviews:
    // desktop (visible 3) -> maxIndex=1 (Slide 0: [1,2,3], Slide 1: [2,3,4])
    assert.equal(calculateCarouselMaxIndex(4, 3), 1);
    assert.equal(shouldShowCarouselNavigation(4, 3), true);
    // tablet (visible 2) -> maxIndex=2
    assert.equal(calculateCarouselMaxIndex(4, 2), 2);
    assert.equal(shouldShowCarouselNavigation(4, 2), true);
    // mobile (visible 1) -> maxIndex=3
    assert.equal(calculateCarouselMaxIndex(4, 1), 3);
    assert.equal(shouldShowCarouselNavigation(4, 1), true);

    // 6 reviews:
    // desktop (visible 3) -> maxIndex=3 (Slides 0, 1, 2, 3)
    assert.equal(calculateCarouselMaxIndex(6, 3), 3);
    assert.equal(shouldShowCarouselNavigation(6, 3), true);
    // tablet (visible 2) -> maxIndex=4
    assert.equal(calculateCarouselMaxIndex(6, 2), 4);
    assert.equal(shouldShowCarouselNavigation(6, 2), true);
    // mobile (visible 1) -> maxIndex=5
    assert.equal(calculateCarouselMaxIndex(6, 1), 5);
    assert.equal(shouldShowCarouselNavigation(6, 1), true);
  });
});

