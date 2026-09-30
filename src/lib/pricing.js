/**
 * SCENTÉ Luxury E-Commerce — Phase 7: Sale & Compare-at Pricing Utilities
 *
 * Provides defensive, mathematically robust pricing and discount computations
 * across the storefront, cart, product cards, and admin dashboard.
 */

/**
 * Calculates the discount percentage between compare-at price and sale price.
 * Formula: round(((compareAtPrice - salePrice) / compareAtPrice) * 100)
 *
 * @param {number|string|null|undefined} compareAtPrice Original price
 * @param {number|string|null|undefined} salePrice Actual selling price
 * @returns {number} Integer discount percentage (e.g. 20 for 20% OFF), or 0 if no valid discount
 */
export function calculateDiscountPercent(compareAtPrice, salePrice) {
  if (compareAtPrice === null || compareAtPrice === undefined || compareAtPrice === "") {
    return 0;
  }
  if (salePrice === null || salePrice === undefined || salePrice === "") {
    return 0;
  }

  const comp = Number(compareAtPrice);
  const sale = Number(salePrice);

  if (isNaN(comp) || !isFinite(comp) || comp <= 0) {
    return 0;
  }
  if (isNaN(sale) || !isFinite(sale) || sale < 0) {
    return 0;
  }

  if (sale >= comp) {
    return 0;
  }

  const percent = Math.round(((comp - sale) / comp) * 100);
  return Math.max(0, Math.min(100, percent));
}

/**
 * Determines whether a product or variant has an active discount / sale price.
 *
 * @param {number|string|null|undefined} compareAtPrice
 * @param {number|string|null|undefined} salePrice
 * @returns {boolean}
 */
export function isDiscountActive(compareAtPrice, salePrice) {
  return calculateDiscountPercent(compareAtPrice, salePrice) > 0;
}

/**
 * Formats a numeric price into the standard SCENTÉ PKR currency string.
 *
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. "PKR 2,799"
 */
export function formatPrice(amount) {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return "PKR 0";
  }
  return `PKR ${Math.round(num).toLocaleString("en-PK")}`;
}
