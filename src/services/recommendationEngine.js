/**
 * ==============================================================================
 * SCENTÉ — Deterministic Fragrance Recommendation Engine
 * ==============================================================================
 * Pure, deterministic service for matching customer preferences against
 * existing SCENTÉ perfumes based on structured fragrance_profile metadata.
 *
 * Scoring Weights (Total = 100 points):
 *  - Scent Family: 35 points
 *  - Intensity:    20 points
 *  - Mood / Vibe:  20 points
 *  - Occasion:     15 points
 *  - Season:       10 points
 *
 * Normalization:
 *  Unanswered criteria are not penalized. The matchScore is normalized
 *  against only the criteria the customer actively answered:
 *    matchScore = Math.round((earnedPoints / applicablePoints) * 100)
 */

export const RECOMMENDATION_WEIGHTS = {
  scentFamily: 35,
  intensity: 20,
  mood: 20,
  occasion: 15,
  season: 10,
};

/**
 * Validates if a product is eligible for customer recommendations.
 * Active, published products with available inventory are eligible.
 * Out-of-stock products are excluded by default unless includeOutOfStock option is true.
 */
export function isProductEligible(product, options = {}) {
  if (!product || typeof product !== "object") return false;

  // Exclude inactive or soft-deleted products
  if (
    product.isActive === false ||
    product.is_active === false ||
    product.status === "inactive"
  ) {
    return false;
  }

  // Filter out of stock products unless specifically included
  if (!options.includeOutOfStock) {
    if (product.isOutOfStock === true || product.status === "out_of_stock") {
      return false;
    }
    if (typeof product.stockQuantity === "number" && product.stockQuantity <= 0) {
      return false;
    }
    if (typeof product.stock_quantity === "number" && product.stock_quantity <= 0) {
      return false;
    }
  }

  return true;
}

/**
 * Safely extracts normalized fragrance profile fields from a product.
 * Supports both camelCase and snake_case representations without throwing.
 */
export function extractProductProfile(product) {
  const profile = product?.fragranceProfile || product?.fragrance_profile || {};
  return {
    scentFamilies: Array.isArray(profile.scentFamilies)
      ? profile.scentFamilies
      : (Array.isArray(profile.scent_families) ? profile.scent_families : []),
    intensity: typeof profile.intensity === "string" ? profile.intensity.toLowerCase().trim() : null,
    moods: Array.isArray(profile.moods)
      ? profile.moods
      : [],
    occasions: Array.isArray(profile.occasions)
      ? profile.occasions
      : [],
    seasons: Array.isArray(profile.seasons)
      ? profile.seasons
      : [],
  };
}

/**
 * Evaluates whether product seasons and user seasons are compatible.
 * Deterministic rule:
 *  - Direct intersection of seasons awards the points.
 *  - "all_year" is universal: if product is tagged "all_year", it is compatible
 *    with any seasonal preference; if the user selects "all_year", any seasonal
 *    product is compatible.
 */
export function checkSeasonMatch(productSeasons, userSeasons) {
  if (!Array.isArray(productSeasons) || productSeasons.length === 0) return false;
  if (!Array.isArray(userSeasons) || userSeasons.length === 0) return false;

  return productSeasons.some((prodSeason) => {
    if (userSeasons.includes(prodSeason)) return true;
    if (prodSeason === "all_year" || userSeasons.includes("all_year")) return true;
    return false;
  });
}

/**
 * Core Fragrance Recommendation Function
 *
 * @param {Array<Object>} products - List of normalized product objects from the catalog
 * @param {Object} preferences - Customer quiz preferences
 * @param {Object} [options] - Configuration options
 * @param {number} [options.limit=3] - Maximum number of recommendations to return
 * @param {boolean} [options.includeOutOfStock=false] - Whether to allow out-of-stock items
 * @param {number} [options.minScore=1] - Minimum matchScore required for inclusion
 * @returns {Array<Object>} Ranked products with recommendation metadata
 */
export function getFragranceRecommendations(products, preferences, options = {}) {
  // Defensive input handling
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }
  if (!preferences || typeof preferences !== "object") {
    return [];
  }

  // 1. Sanitize & extract preferences (support camelCase and snake_case inputs)
  const userScentFamilies = Array.isArray(preferences.scentFamilies)
    ? preferences.scentFamilies
    : (Array.isArray(preferences.scent_families) ? preferences.scent_families : []);

  const userIntensity = typeof preferences.intensity === "string" && preferences.intensity.trim()
    ? preferences.intensity.toLowerCase().trim()
    : null;

  const userMoods = Array.isArray(preferences.moods)
    ? preferences.moods
    : [];

  const userOccasions = Array.isArray(preferences.occasions)
    ? preferences.occasions
    : [];

  const userSeasons = Array.isArray(preferences.seasons)
    ? preferences.seasons
    : [];

  // 2. Identify which criteria were actually answered
  const hasScentFamilyPref = userScentFamilies.length > 0;
  const hasIntensityPref = Boolean(userIntensity);
  const hasMoodPref = userMoods.length > 0;
  const hasOccasionPref = userOccasions.length > 0;
  const hasSeasonPref = userSeasons.length > 0;

  // If no criteria were answered, return empty array
  if (!hasScentFamilyPref && !hasIntensityPref && !hasMoodPref && !hasOccasionPref && !hasSeasonPref) {
    return [];
  }

  // 3. Compute applicable points (unanswered questions are not penalized)
  let applicablePoints = 0;
  if (hasScentFamilyPref) applicablePoints += RECOMMENDATION_WEIGHTS.scentFamily;
  if (hasIntensityPref) applicablePoints += RECOMMENDATION_WEIGHTS.intensity;
  if (hasMoodPref) applicablePoints += RECOMMENDATION_WEIGHTS.mood;
  if (hasOccasionPref) applicablePoints += RECOMMENDATION_WEIGHTS.occasion;
  if (hasSeasonPref) applicablePoints += RECOMMENDATION_WEIGHTS.season;

  if (applicablePoints === 0) {
    return [];
  }

  const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 3;
  const minScore = typeof options.minScore === "number" ? options.minScore : 1;

  // 4. Score each eligible product
  const rankedCandidates = [];

  for (const product of products) {
    if (!isProductEligible(product, options)) {
      continue;
    }

    const profile = extractProductProfile(product);

    let earnedPoints = 0;
    const matchedCriteria = [];
    const scoreBreakdown = {};

    // Scent Family Matching (35 pts)
    if (hasScentFamilyPref) {
      const match = profile.scentFamilies.some((f) => userScentFamilies.includes(f));
      const score = match ? RECOMMENDATION_WEIGHTS.scentFamily : 0;
      scoreBreakdown.scentFamily = score;
      earnedPoints += score;
      if (match) matchedCriteria.push("scentFamily");
    }

    // Intensity Matching (20 pts - exact match)
    if (hasIntensityPref) {
      const match = Boolean(profile.intensity && profile.intensity === userIntensity);
      const score = match ? RECOMMENDATION_WEIGHTS.intensity : 0;
      scoreBreakdown.intensity = score;
      earnedPoints += score;
      if (match) matchedCriteria.push("intensity");
    }

    // Mood Matching (20 pts)
    if (hasMoodPref) {
      const match = profile.moods.some((m) => userMoods.includes(m));
      const score = match ? RECOMMENDATION_WEIGHTS.mood : 0;
      scoreBreakdown.mood = score;
      earnedPoints += score;
      if (match) matchedCriteria.push("mood");
    }

    // Occasion Matching (15 pts)
    if (hasOccasionPref) {
      const match = profile.occasions.some((o) => userOccasions.includes(o));
      const score = match ? RECOMMENDATION_WEIGHTS.occasion : 0;
      scoreBreakdown.occasion = score;
      earnedPoints += score;
      if (match) matchedCriteria.push("occasion");
    }

    // Season Matching (10 pts with all_year compatibility)
    if (hasSeasonPref) {
      const match = checkSeasonMatch(profile.seasons, userSeasons);
      const score = match ? RECOMMENDATION_WEIGHTS.season : 0;
      scoreBreakdown.season = score;
      earnedPoints += score;
      if (match) matchedCriteria.push("season");
    }

    // Calculate normalized score (0 to 100)
    const matchScore = Math.round((earnedPoints / applicablePoints) * 100);

    // Only include products that meet minScore threshold
    if (matchScore >= minScore) {
      rankedCandidates.push({
        ...product,
        recommendation: {
          matchScore,
          matchedCriteria,
          scoreBreakdown,
        },
      });
    }
  }

  // 5. Deterministic sorting:
  //    Primary: Highest matchScore descending
  //    Secondary: Most matchedCriteria descending
  //    Tertiary: Stable localeCompare on name or id
  rankedCandidates.sort((a, b) => {
    if (b.recommendation.matchScore !== a.recommendation.matchScore) {
      return b.recommendation.matchScore - a.recommendation.matchScore;
    }
    if (b.recommendation.matchedCriteria.length !== a.recommendation.matchedCriteria.length) {
      return b.recommendation.matchedCriteria.length - a.recommendation.matchedCriteria.length;
    }
    const nameA = String(a.name || a.id || "");
    const nameB = String(b.name || b.id || "");
    return nameA.localeCompare(nameB);
  });

  // 6. Return top results within requested limit
  return rankedCandidates.slice(0, limit);
}
