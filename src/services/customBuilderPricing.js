/**
 * ==============================================================================
 * SCENTÉ — Custom Perfume Builder Pricing & Validation Foundation
 * ==============================================================================
 * Pure, deterministic pricing calculation and structural validation logic for
 * the bespoke Custom Perfume Builder.
 *
 * Rules:
 *  - All currency calculations are executed in whole integers representing PKR.
 *  - No floating-point math, no currency formatting inside pure calculation logic.
 *  - Final Price = Base Price + Sum of Selected Option Adjustments
 */

/**
 * Calculates the total custom perfume price in PKR.
 *
 * @param {number|string} basePrice - Global builder base price in PKR (integer)
 * @param {Array<Object>} selectedOptions - Array of chosen option objects with price_adjustment
 * @returns {number} Non-negative integer representing total price in PKR
 */
export function calculateCustomPerfumePrice(basePrice = 0, selectedOptions = []) {
  const numBase = Number(basePrice);
  const parsedBase = !isNaN(numBase) && isFinite(numBase) ? Math.max(0, Math.round(numBase)) : 0;

  if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    return parsedBase;
  }

  const adjustmentsSum = selectedOptions.reduce((acc, opt) => {
    if (!opt || typeof opt !== "object") return acc;
    const rawVal = Number(opt.price_adjustment ?? opt.priceAdjustment ?? 0);
    const adj = !isNaN(rawVal) && isFinite(rawVal) ? Math.max(0, Math.round(rawVal)) : 0;
    return acc + adj;
  }, 0);

  return parsedBase + adjustmentsSum;
}

/**
 * Validates a customer's selections against active builder group rules.
 *
 * @param {Array<Object>} groups - Array of builder group configurations
 * @param {Object} selections - Map of groupSlug -> Array<Option> | Option | null
 * @returns {{
 *   isValid: boolean,
 *   errors: Record<string, string>,
 *   flattenedSelectedOptions: Array<Object>,
 *   selectionCounts: Record<string, number>
 * }}
 */
export function validateBuilderSelections(groups = [], selections = {}) {
  const errors = {};
  const flattenedSelectedOptions = [];
  const selectionCounts = {};

  if (!Array.isArray(groups) || groups.length === 0) {
    return {
      isValid: false,
      errors: { _global: "No builder configuration groups available." },
      flattenedSelectedOptions: [],
      selectionCounts: {},
    };
  }

  for (const group of groups) {
    if (!group || typeof group !== "object") continue;

    const slug = group.slug || group.id;
    const rawSelected = selections[slug];

    // Normalize raw selections into an array of options
    let selectedList = [];
    if (Array.isArray(rawSelected)) {
      selectedList = rawSelected.filter(Boolean);
    } else if (rawSelected && typeof rawSelected === "object") {
      selectedList = [rawSelected];
    }

    selectionCounts[slug] = selectedList.length;

    // 1. Single selection rule enforcement
    if (group.selection_type === "single" && selectedList.length > 1) {
      errors[slug] = `"${group.name}" only allows a single selection.`;
      continue;
    }

    // 2. Required group rule enforcement
    const isRequired = group.is_required !== false;
    const minSelections = typeof group.min_selections === "number" ? group.min_selections : (isRequired ? 1 : 0);

    if (isRequired && selectedList.length === 0) {
      errors[slug] = `Please make a selection for "${group.name}".`;
      continue;
    }

    if (selectedList.length > 0 && selectedList.length < minSelections) {
      errors[slug] = `Please select at least ${minSelections} option${minSelections > 1 ? "s" : ""} for "${group.name}".`;
      continue;
    }

    // 3. Maximum selections rule enforcement
    const maxSelections = typeof group.max_selections === "number" ? group.max_selections : (group.selection_type === "single" ? 1 : 99);
    if (selectedList.length > maxSelections) {
      errors[slug] = `You can select at most ${maxSelections} option${maxSelections > 1 ? "s" : ""} for "${group.name}".`;
      continue;
    }

    // 4. Verify selected options belong to this group and are active
    const availableOptions = Array.isArray(group.options) ? group.options : [];
    const validGroupOptionMap = new Map();
    for (const opt of availableOptions) {
      if (opt && opt.id) {
        validGroupOptionMap.set(opt.id, opt);
      }
    }

    let optionError = null;
    for (const chosen of selectedList) {
      if (!chosen || !chosen.id) {
        optionError = `Invalid option selected in "${group.name}".`;
        break;
      }

      const canonicalOption = validGroupOptionMap.get(chosen.id);
      if (!canonicalOption) {
        optionError = `Option "${chosen.name || chosen.id}" is not available in "${group.name}".`;
        break;
      }

      if (canonicalOption.is_active === false) {
        optionError = `Option "${canonicalOption.name}" is currently unavailable.`;
        break;
      }

      // Append verified canonical option
      flattenedSelectedOptions.push({
        id: canonicalOption.id,
        group_id: group.id,
        group_slug: slug,
        group_name: group.name,
        name: canonicalOption.name,
        slug: canonicalOption.slug,
        category: canonicalOption.category || null,
        price_adjustment: Math.max(0, Math.round(Number(canonicalOption.price_adjustment || 0))),
        image_url: canonicalOption.image_url || null,
      });
    }

    if (optionError) {
      errors[slug] = optionError;
    }
  }

  // 5. Anti-rogue group validation: reject any unrecognized group identifiers in selections
  const validGroupIdentifiers = new Set();
  for (const group of groups) {
    if (group && typeof group === "object") {
      if (group.slug) validGroupIdentifiers.add(String(group.slug));
      if (group.id) validGroupIdentifiers.add(String(group.id));
    }
  }

  for (const key of Object.keys(selections || {})) {
    const val = selections[key];
    const hasSelection = Array.isArray(val) ? val.length > 0 : Boolean(val);
    if (hasSelection && !validGroupIdentifiers.has(String(key))) {
      errors[key] = `Unrecognized customization group "${key}".`;
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    flattenedSelectedOptions,
    selectionCounts,
  };
}

/**
 * Builds an immutable structured configuration snapshot for storage in order_items.custom_configuration.
 *
 * @param {Object} settings - Builder settings { base_price, currency, title }
 * @param {Array<Object>} groups - Builder groups
 * @param {Object} selections - Customer selections map
 * @param {number} finalPrice - Verified total price
 * @returns {Object} Structured JSON-serializable snapshot
 */
export function buildCustomConfigurationSnapshot(settings = {}, groups = [], selections = {}, finalPrice = 0) {
  const basePrice = Math.max(0, Math.round(Number(settings.base_price || 0)));
  const currency = settings.currency || "PKR";
  const formattedFinalPrice = `${currency} ${finalPrice.toLocaleString("en-PK")}`;

  const groupsSnapshot = [];
  const summaryTokens = [];

  for (const group of groups) {
    const slug = group.slug || group.id;
    const rawSelected = selections[slug];

    let list = [];
    if (Array.isArray(rawSelected)) {
      list = rawSelected.filter(Boolean);
    } else if (rawSelected && typeof rawSelected === "object") {
      list = [rawSelected];
    }

    if (list.length === 0) continue;

    const selectedOptionsSummary = list.map((opt) => ({
      id: opt.id,
      name: opt.name,
      slug: opt.slug,
      category: opt.category || null,
      price_adjustment: Math.max(0, Math.round(Number(opt.price_adjustment || 0))),
    }));

    groupsSnapshot.push({
      group_id: group.id,
      group_slug: slug,
      group_name: group.name,
      selected_options: selectedOptionsSummary,
    });

    const groupNames = list.map((opt) => opt.name).join(", ");
    if (groupNames) {
      summaryTokens.push(groupNames);
    }
  }

  return {
    base_price: basePrice,
    total_price: finalPrice,
    formatted_total_price: formattedFinalPrice,
    currency,
    summary: summaryTokens.join(" · "),
    created_at: new Date().toISOString(),
    groups: groupsSnapshot,
  };
}
