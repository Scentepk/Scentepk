import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getFragranceRecommendations,
  RECOMMENDATION_WEIGHTS,
  isProductEligible,
  checkSeasonMatch,
  extractProductProfile,
} from "./recommendationEngine.js";

describe("SCENTÉ Fragrance Recommendation Engine", () => {
  // Mock products fixture
  const sampleProducts = [
    {
      id: "prod-noir",
      slug: "scente-noir",
      name: "SCENTÉ NOIR",
      price: 12500,
      stockQuantity: 50,
      status: "active",
      isActive: true,
      fragranceProfile: {
        scentFamilies: ["woody", "leather_smoky"],
        intensity: "intense",
        moods: ["mysterious", "regal"],
        occasions: ["evening_date", "special_event"],
        seasons: ["fall_winter"],
      },
    },
    {
      id: "prod-soleil",
      slug: "scente-soleil",
      name: "SCENTÉ SOLEIL",
      price: 13000,
      stockQuantity: 40,
      status: "active",
      isActive: true,
      fragranceProfile: {
        scentFamilies: ["fresh_citrus", "oriental_amber"],
        intensity: "moderate",
        moods: ["luminous_fresh"],
        occasions: ["daily_office", "signature_all_day"],
        seasons: ["spring_summer", "all_year"],
      },
    },
    {
      id: "prod-musk",
      slug: "scente-musk",
      name: "SCENTÉ MUSK",
      price: 13500,
      stockQuantity: 30,
      status: "active",
      isActive: true,
      fragranceProfile: {
        scentFamilies: ["clean_musk", "woody"],
        intensity: "subtle",
        moods: ["clean_timeless"],
        occasions: ["daily_office"],
        seasons: ["all_year"],
      },
    },
    {
      id: "prod-inactive",
      slug: "scente-archived",
      name: "SCENTÉ ARCHIVED",
      price: 11000,
      stockQuantity: 20,
      status: "inactive",
      isActive: false,
      fragranceProfile: {
        scentFamilies: ["woody"],
        intensity: "intense",
        moods: ["mysterious"],
        occasions: ["evening_date"],
        seasons: ["fall_winter"],
      },
    },
    {
      id: "prod-soldout",
      slug: "scente-soldout",
      name: "SCENTÉ SOLD OUT",
      price: 14000,
      stockQuantity: 0,
      isOutOfStock: true,
      status: "out_of_stock",
      isActive: true,
      fragranceProfile: {
        scentFamilies: ["woody"],
        intensity: "intense",
        moods: ["mysterious"],
        occasions: ["evening_date"],
        seasons: ["fall_winter"],
      },
    },
    {
      id: "prod-empty-profile",
      slug: "scente-unprofiled",
      name: "SCENTÉ UNPROFILED",
      price: 12000,
      stockQuantity: 25,
      status: "active",
      isActive: true,
      fragranceProfile: null,
    },
  ];

  test("1. Exact scent-family match awards 35 points", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      scentFamilies: ["fresh_citrus"],
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, "prod-soleil");
    assert.equal(results[0].recommendation.matchScore, 100);
    assert.equal(results[0].recommendation.scoreBreakdown.scentFamily, 35);
    assert.deepEqual(results[0].recommendation.matchedCriteria, ["scentFamily"]);
  });

  test("2. Exact intensity match awards 20 points", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      intensity: "subtle",
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, "prod-musk");
    assert.equal(results[0].recommendation.matchScore, 100);
    assert.equal(results[0].recommendation.scoreBreakdown.intensity, 20);
    assert.deepEqual(results[0].recommendation.matchedCriteria, ["intensity"]);
  });

  test("3. Multiple mood matching awards 20 points if at least one matches", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      moods: ["romantic", "mysterious"], // "mysterious" matches SCENTÉ NOIR
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, "prod-noir");
    assert.equal(results[0].recommendation.scoreBreakdown.mood, 20);
    assert.deepEqual(results[0].recommendation.matchedCriteria, ["mood"]);
  });

  test("4. Multiple occasion matching awards 15 points if at least one matches", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      occasions: ["signature_all_day"],
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, "prod-soleil");
    assert.equal(results[0].recommendation.scoreBreakdown.occasion, 15);
  });

  test("5. Season direct matching awards 10 points", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      seasons: ["fall_winter"],
    });

    // prod-noir has "fall_winter", prod-musk and prod-soleil have "all_year" which is compatible
    const noir = results.find((p) => p.id === "prod-noir");
    assert.ok(noir);
    assert.equal(noir.recommendation.scoreBreakdown.season, 10);
  });

  test("6. all_year compatibility works both ways", () => {
    // When user specifies spring_summer, product with all_year matches
    assert.equal(checkSeasonMatch(["all_year"], ["spring_summer"]), true);
    // When user specifies all_year, product with fall_winter matches
    assert.equal(checkSeasonMatch(["fall_winter"], ["all_year"]), true);
    // When neither matches and neither is all_year, returns false
    assert.equal(checkSeasonMatch(["fall_winter"], ["spring_summer"]), false);
  });

  test("7. Multiple criteria combined calculate accurately (100% full match)", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      scentFamilies: ["woody"],
      intensity: "intense",
      moods: ["mysterious"],
      occasions: ["evening_date"],
      seasons: ["fall_winter"],
    });

    assert.ok(results.length >= 1);
    const top = results[0];
    assert.equal(top.id, "prod-noir");
    assert.equal(top.recommendation.matchScore, 100);
    assert.deepEqual(top.recommendation.matchedCriteria, [
      "scentFamily",
      "intensity",
      "mood",
      "occasion",
      "season",
    ]);
    assert.equal(top.recommendation.scoreBreakdown.scentFamily, 35);
    assert.equal(top.recommendation.scoreBreakdown.intensity, 20);
    assert.equal(top.recommendation.scoreBreakdown.mood, 20);
    assert.equal(top.recommendation.scoreBreakdown.occasion, 15);
    assert.equal(top.recommendation.scoreBreakdown.season, 10);
  });

  test("8. Score normalization when only some quiz criteria are answered", () => {
    // User answers ONLY scentFamily (35) and intensity (20). Total applicable = 55.
    // prod-noir matches both -> 55 / 55 = 100% match.
    // prod-musk matches woody (35) but not intensity (0) -> 35 / 55 = 64% match.
    const results = getFragranceRecommendations(sampleProducts, {
      scentFamilies: ["woody"],
      intensity: "intense",
    });

    const noir = results.find((p) => p.id === "prod-noir");
    const musk = results.find((p) => p.id === "prod-musk");

    assert.ok(noir);
    assert.equal(noir.recommendation.matchScore, 100);

    assert.ok(musk);
    assert.equal(musk.recommendation.matchScore, Math.round((35 / 55) * 100)); // 64%
  });

  test("9. Empty / missing preferences safely return empty array", () => {
    assert.deepEqual(getFragranceRecommendations(sampleProducts, null), []);
    assert.deepEqual(getFragranceRecommendations(sampleProducts, undefined), []);
    assert.deepEqual(getFragranceRecommendations(sampleProducts, {}), []);
    assert.deepEqual(getFragranceRecommendations(sampleProducts, { scentFamilies: [] }), []);
    assert.deepEqual(getFragranceRecommendations([], { scentFamilies: ["woody"] }), []);
  });

  test("10. Null or incomplete fragrance profile does not crash", () => {
    const withBroken = [
      { id: "p1", name: "P1", status: "active", isActive: true, fragranceProfile: null },
      { id: "p2", name: "P2", status: "active", isActive: true, fragranceProfile: undefined },
      { id: "p3", name: "P3", status: "active", isActive: true, fragranceProfile: { scentFamilies: [] } },
    ];

    const results = getFragranceRecommendations(withBroken, { scentFamilies: ["woody"] });
    assert.deepEqual(results, []);
  });

  test("11. Inactive products are strictly excluded", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      scentFamilies: ["woody"],
      intensity: "intense",
    });

    const hasInactive = results.some((p) => p.id === "prod-inactive");
    assert.equal(hasInactive, false);
  });

  test("12. Out of stock products are excluded by default", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      scentFamilies: ["woody"],
      intensity: "intense",
    });

    const hasSoldOut = results.some((p) => p.id === "prod-soldout");
    assert.equal(hasSoldOut, false);
  });

  test("13. Ranking order places highest score first", () => {
    const results = getFragranceRecommendations(sampleProducts, {
      scentFamilies: ["woody"],
      intensity: "intense",
    });

    for (let i = 0; i < results.length - 1; i++) {
      assert.ok(results[i].recommendation.matchScore >= results[i + 1].recommendation.matchScore);
    }
  });

  test("14. Limit option restricts number of returned items (default 3)", () => {
    const manyProducts = Array.from({ length: 10 }, (_, i) => ({
      id: `p-${i}`,
      name: `Product ${i}`,
      status: "active",
      isActive: true,
      fragranceProfile: {
        scentFamilies: ["woody"],
        intensity: "intense",
      },
    }));

    const defaultLimit = getFragranceRecommendations(manyProducts, { scentFamilies: ["woody"] });
    assert.equal(defaultLimit.length, 3);

    const customLimit = getFragranceRecommendations(manyProducts, { scentFamilies: ["woody"] }, { limit: 2 });
    assert.equal(customLimit.length, 2);
  });

  test("15. Deterministic tie-breaking on identical scores", () => {
    const tiedProducts = [
      { id: "b-perfume", name: "B Perfume", status: "active", isActive: true, fragranceProfile: { scentFamilies: ["woody"] } },
      { id: "a-perfume", name: "A Perfume", status: "active", isActive: true, fragranceProfile: { scentFamilies: ["woody"] } },
    ];

    const results1 = getFragranceRecommendations(tiedProducts, { scentFamilies: ["woody"] });
    const results2 = getFragranceRecommendations(tiedProducts, { scentFamilies: ["woody"] });

    // Should consistently sort A Perfume before B Perfume
    assert.equal(results1[0].id, "a-perfume");
    assert.equal(results1[1].id, "b-perfume");
    assert.deepEqual(results1, results2);
  });

  test("16. Does not mutate the original product objects", () => {
    const original = {
      id: "orig-1",
      name: "Original",
      status: "active",
      isActive: true,
      fragranceProfile: { scentFamilies: ["woody"] },
    };

    getFragranceRecommendations([original], { scentFamilies: ["woody"] });
    assert.equal(original.recommendation, undefined);
  });
});
