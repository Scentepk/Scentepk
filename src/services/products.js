import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { PRODUCTS } from "../data/products.js";

/**
 * Normalizes database or local product row to frontend format
 */
export const normalizeProduct = (dbRow) => {
  if (!dbRow) return null;
  const isInactive = dbRow.status === "inactive" || dbRow.is_active === false;

  // Clean edge-artifact images or map high-fidelity clean versions
  const sanitizeImageUrl = (url, id) => {
    if (!url || typeof url !== "string") return url;
    if (url.includes("1790800904059-cn101wm.webp") || id === "luxury-perfume-testers-pack-of-5") {
      return "/images/products/luxury-perfume-testers.webp";
    }
    return url;
  };

  const rawImg = dbRow.primary_image || dbRow.image || "";
  const rawSecImg = dbRow.secondary_image || dbRow.secondaryImage || null;
  const prodIdOrSlug = dbRow.id || dbRow.slug || "";
  const img = sanitizeImageUrl(rawImg, prodIdOrSlug);
  const secImg = sanitizeImageUrl(rawSecImg, prodIdOrSlug);

  // Process raw images from database or local storage cache
  const rawImages = dbRow.product_images || dbRow.images || [];
  const normalizedImages = Array.isArray(rawImages) && rawImages.length > 0
    ? [...rawImages]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((im, idx) => {
          const rawUrl = typeof im === "string" ? im : (im.public_url || im.url || "");
          const public_url = sanitizeImageUrl(rawUrl, prodIdOrSlug);
          const storage_path = typeof im === "object" ? (im.storage_path || im.path || null) : null;
          return {
            id: im.id || `img-${dbRow.id}-${idx}`,
            product_id: dbRow.id,
            public_url,
            url: public_url,
            storage_path,
            alt_text: im.alt_text || dbRow.name,
            sort_order: im.sort_order ?? idx,
            is_primary: idx === 0,
          };
        })
        .filter((im) => Boolean(im.public_url))
    : (img ? [{ id: `img-${dbRow.id}-0`, product_id: dbRow.id, public_url: img, url: img, storage_path: null, alt_text: dbRow.name, sort_order: 0, is_primary: true }] : []);

  const resolvedPrimary = normalizedImages[0]?.public_url || img;
  const resolvedSecondary = normalizedImages[1]?.public_url || secImg;
  const allImageUrls = normalizedImages.map((im) => im.public_url);

  // Process raw variants from database or local storage cache
  // product_variants is the authoritative single source of truth for inventory
  const rawVariants = dbRow.product_variants || dbRow.variants || [];
  const normalizedVariants = Array.isArray(rawVariants)
    ? rawVariants
        .filter((v) => v.is_active !== false)
        .map((v) => {
          const stock = Number(v.stock_quantity ?? v.stockQuantity ?? 0);
          const price = Number(v.price) || Number(dbRow.price) || 0;
          const rawCompAt = v.compare_at_price ?? v.compareAtPrice ?? null;
          const compNum =
            rawCompAt !== null &&
            rawCompAt !== undefined &&
            rawCompAt !== "" &&
            !isNaN(Number(rawCompAt)) &&
            Number(rawCompAt) > 0
              ? Number(rawCompAt)
              : null;
          const compareAtPrice = compNum && compNum > price ? compNum : null;
          const discountPercent = compareAtPrice
            ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
            : 0;
          const formattedCompareAtPrice = compareAtPrice ? `PKR ${compareAtPrice.toLocaleString()}` : null;
          const isOnSale = Boolean(compareAtPrice && discountPercent > 0);

          return {
            id: v.id || `var-${dbRow.id}-${v.size}`,
            product_id: dbRow.id,
            size: v.size || "50ml",
            volume: v.volume || `${v.size || "50ml"} / 1.7 FL. OZ.`,
            price,
            formattedPrice: `PKR ${price.toLocaleString()}`,
            compareAtPrice,
            compare_at_price: compareAtPrice,
            formattedCompareAtPrice,
            discountPercent,
            isOnSale,
            stockQuantity: stock,
            stock_quantity: stock,
            isOutOfStock: stock <= 0,
            isActive: v.is_active !== false,
            is_active: v.is_active !== false,
          };
        })
    : [];

  const hasVariants = normalizedVariants.length > 0;
  // Product is out of stock ONLY when ALL active variants have stock <= 0
  const isOutOfStock = hasVariants
    ? normalizedVariants.every((v) => v.stockQuantity <= 0)
    : (dbRow.status === "out_of_stock" || Number(dbRow.stock_quantity ?? dbRow.stockQuantity ?? 0) <= 0);

  const totalCalculatedStock = hasVariants
    ? normalizedVariants.reduce((sum, v) => sum + v.stockQuantity, 0)
    : Number(dbRow.stock_quantity ?? dbRow.stockQuantity ?? 0);

  const status = isInactive ? "inactive" : isOutOfStock ? "out_of_stock" : "active";

  const rawBaseCompAt = dbRow.compare_at_price ?? dbRow.compareAtPrice ?? null;
  const baseCompNum =
    rawBaseCompAt !== null &&
    rawBaseCompAt !== undefined &&
    rawBaseCompAt !== "" &&
    !isNaN(Number(rawBaseCompAt)) &&
    Number(rawBaseCompAt) > 0
      ? Number(rawBaseCompAt)
      : null;
  const basePrice = Number(dbRow.price) || (normalizedVariants[0]?.price ?? 0);

  // If base product doesn't explicitly have compare-at price, check if primary variant does
  const primaryVariantComp = normalizedVariants[0]?.compareAtPrice ?? null;
  const compareAtPrice =
    baseCompNum && baseCompNum > basePrice
      ? baseCompNum
      : (primaryVariantComp && primaryVariantComp > basePrice ? primaryVariantComp : null);

  const discountPercent = compareAtPrice
    ? Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
    : 0;
  const formattedCompareAtPrice = compareAtPrice ? `PKR ${compareAtPrice.toLocaleString()}` : null;
  const isOnSale = Boolean(compareAtPrice && discountPercent > 0);

  const variants = hasVariants
    ? normalizedVariants
    : [
        {
          id: `var-${dbRow.id || "default"}-50ml`,
          product_id: dbRow.id,
          size: "50ml",
          volume: dbRow.volume || "50ml / 1.7 FL. OZ.",
          price: basePrice,
          formattedPrice: dbRow.formattedPrice || `PKR ${basePrice.toLocaleString()}`,
          compareAtPrice,
          compare_at_price: compareAtPrice,
          formattedCompareAtPrice,
          discountPercent,
          isOnSale,
          stockQuantity: totalCalculatedStock,
          stock_quantity: totalCalculatedStock,
          isOutOfStock,
          isActive: true,
          is_active: true,
        },
      ];

  const rawFam = (dbRow.family || "").toLowerCase();
  const isWaxProduct = rawFam === "waxes" || rawFam === "wax";
  const isTesterProduct = rawFam === "testers" || rawFam === "tester";

  const defaultSubtitle = isWaxProduct ? "Artisan Scented Wax" : isTesterProduct ? "Discovery Tester" : "Extrait de Parfum";
  const defaultConcentration = isWaxProduct ? "Pure Scented Wax" : isTesterProduct ? "Atelier Tester Vial" : "30% Pure Perfume Oil";
  const defaultVolume = isWaxProduct ? "100g / 3.5 OZ." : isTesterProduct ? "5ml / 0.17 FL. OZ." : "50ml / 1.7 FL. OZ.";

  return {
    id: dbRow.id,
    slug: dbRow.slug,
    name: dbRow.name,
    subtitle: dbRow.subtitle || defaultSubtitle,
    tagline: dbRow.tagline || "",
    description: dbRow.description || "",
    concentration: dbRow.concentration || defaultConcentration,
    family: dbRow.family,
    families: Array.isArray(dbRow.families) ? dbRow.families : [dbRow.family],
    olfactiveFamily: dbRow.olfactive_family || dbRow.olfactiveFamily || "",
    olfactive_family: dbRow.olfactive_family || dbRow.olfactiveFamily || "",
    price: basePrice,
    formattedPrice: dbRow.formattedPrice || `PKR ${basePrice.toLocaleString()}`,
    compareAtPrice,
    compare_at_price: compareAtPrice,
    formattedCompareAtPrice,
    discountPercent,
    isOnSale,
    volume: dbRow.volume || defaultVolume,
    image: resolvedPrimary,
    primary_image: resolvedPrimary,
    secondaryImage: resolvedSecondary,
    secondary_image: resolvedSecondary,
    images: allImageUrls,
    product_images: normalizedImages,
    mood: dbRow.mood || "",
    notes: dbRow.notes || { top: [], heart: [], base: [] },
    fragranceProfile: {
      scentFamilies: Array.isArray(dbRow.fragrance_profile?.scent_families)
        ? dbRow.fragrance_profile.scent_families
        : (Array.isArray(dbRow.fragranceProfile?.scentFamilies) ? dbRow.fragranceProfile.scentFamilies : []),
      intensity: dbRow.fragrance_profile?.intensity ?? dbRow.fragranceProfile?.intensity ?? null,
      moods: Array.isArray(dbRow.fragrance_profile?.moods)
        ? dbRow.fragrance_profile.moods
        : (Array.isArray(dbRow.fragranceProfile?.moods) ? dbRow.fragranceProfile.moods : []),
      occasions: Array.isArray(dbRow.fragrance_profile?.occasions)
        ? dbRow.fragrance_profile.occasions
        : (Array.isArray(dbRow.fragranceProfile?.occasions) ? dbRow.fragranceProfile.occasions : []),
      seasons: Array.isArray(dbRow.fragrance_profile?.seasons)
        ? dbRow.fragrance_profile.seasons
        : (Array.isArray(dbRow.fragranceProfile?.seasons) ? dbRow.fragranceProfile.seasons : []),
    },
    fragrance_profile: dbRow.fragrance_profile || {
      scent_families: Array.isArray(dbRow.fragranceProfile?.scentFamilies) ? dbRow.fragranceProfile.scentFamilies : [],
      intensity: dbRow.fragranceProfile?.intensity ?? null,
      moods: Array.isArray(dbRow.fragranceProfile?.moods) ? dbRow.fragranceProfile.moods : [],
      occasions: Array.isArray(dbRow.fragranceProfile?.occasions) ? dbRow.fragranceProfile.occasions : [],
      seasons: Array.isArray(dbRow.fragranceProfile?.seasons) ? dbRow.fragranceProfile.seasons : [],
    },
    stockQuantity: totalCalculatedStock,
    stock_quantity: totalCalculatedStock,
    isActive: !isInactive,
    status,
    isOutOfStock,
    variants,
    product_variants: variants,
    created_at: dbRow.created_at || null,
    updated_at: dbRow.updated_at || null,
  };
};

export const STOREFRONT_PRODUCTS_CACHE_KEY = "scente_verified_catalog_v1";

/**
 * Validates and retrieves previously confirmed live Supabase products from localStorage.
 * Strictly guarantees that unverified prototype or hardcoded dummy products are rejected,
 * preventing any flash of false items on initial mount.
 */
export function getVerifiedCachedActiveProducts() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STOREFRONT_PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.source === "supabase" &&
      Array.isArray(parsed.data) &&
      parsed.data.length > 0
    ) {
      return parsed.data.filter((p) => p.status !== "inactive" && p.is_active !== false);
    }
  } catch (e) {
    console.warn("Could not parse verified catalog cache:", e);
  }
  return null;
}

function getLocalActiveProducts() {
  try {
    const verified = getVerifiedCachedActiveProducts();
    if (verified && verified.length > 0) {
      return verified;
    }
    const saved = localStorage.getItem("scente_admin_products_cache");
    if (saved) {
      const items = JSON.parse(saved);
      return items
        .filter((p) => p.status !== "inactive" && p.is_active !== false)
        .map(normalizeProduct);
    }
  } catch (e) {}
  return PRODUCTS.filter((p) => p.status !== "inactive" && p.is_active !== false).map(normalizeProduct);
}

// In-Memory Performance Cache (60-second TTL) & In-Flight Promise Deduplication
const CACHE_TTL_MS = 60_000;
let _productsCache = null;
let _activeProductsPromise = null;
const _productBySlugCache = new Map();
const _productBySlugPromises = new Map();

/**
 * Invalidate in-memory product cache (e.g. after admin catalog update)
 */
export function invalidateProductCache() {
  _productsCache = null;
  _activeProductsPromise = null;
  _productBySlugCache.clear();
  _productBySlugPromises.clear();
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STOREFRONT_PRODUCTS_CACHE_KEY);
    }
  } catch (e) {}
}

if (typeof window !== "undefined") {
  window.addEventListener("scente_catalog_updated", invalidateProductCache);
  window.addEventListener("storage", (e) => {
    if (e.key === "scente_admin_products_cache" || e.key === STOREFRONT_PRODUCTS_CACHE_KEY) {
      invalidateProductCache();
    }
  });
}

/**
 * Fetch all active products with deduplication and in-memory caching
 */
export async function getActiveProducts() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: getLocalActiveProducts(), error: null };
  }

  const now = Date.now();

  // 1. Return fresh in-memory cache if within TTL
  if (_productsCache && now - _productsCache.timestamp < CACHE_TTL_MS) {
    return { data: _productsCache.data, error: null };
  }

  // 2. Return in-flight request if already pending (deduplication)
  if (_activeProductsPromise) {
    return _activeProductsPromise;
  }

  // 3. Initiate fetch and store in-flight promise
  _activeProductsPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*), product_images(*)")
        .neq("is_active", false)
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        const verified = getVerifiedCachedActiveProducts();
        if (verified && verified.length > 0) {
          _productsCache = { data: verified, timestamp: Date.now() };
          return { data: verified, error: null };
        }
        const local = getLocalActiveProducts();
        _productsCache = { data: local, timestamp: Date.now() };
        return { data: local, error: null, isFallback: true };
      }

      const filtered = data
        .filter((row) => row.status !== "inactive" && row.is_active !== false)
        .map(normalizeProduct);

      _productsCache = { data: filtered, timestamp: Date.now() };

      // Persist verified Supabase catalog to storefront cache
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            STOREFRONT_PRODUCTS_CACHE_KEY,
            JSON.stringify({
              version: 1,
              source: "supabase",
              timestamp: Date.now(),
              data: filtered,
            })
          );
        }
      } catch (e) {
        console.warn("Could not save verified catalog cache:", e);
      }

      // Pre-warm individual slug cache for instant product detail navigation
      for (const prod of filtered) {
        if (prod.slug) {
          _productBySlugCache.set(prod.slug, { data: prod, timestamp: Date.now() });
        }
      }

      return { data: filtered, error: null };
    } catch (err) {
      console.error("Failed to query products from Supabase:", err);
      const verified = getVerifiedCachedActiveProducts();
      if (verified && verified.length > 0) {
        return { data: verified, error: null };
      }
      const local = getLocalActiveProducts();
      return { data: local, error: null, isFallback: true };
    } finally {
      _activeProductsPromise = null;
    }
  })();

  return _activeProductsPromise;
}

/**
 * Fetch single product by its unique slug with caching and deduplication
 */
export async function getProductBySlug(slug) {
  if (!slug) return { data: null, error: null };

  if (!isSupabaseConfigured || !supabase) {
    const localProducts = getLocalActiveProducts();
    const localMatch = localProducts.find((p) => p.slug === slug || p.id === slug);
    return { data: localMatch || null, error: null };
  }

  const now = Date.now();

  // 1. Check in-memory slug cache
  const cached = _productBySlugCache.get(slug);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return { data: cached.data, error: null };
  }

  // 2. Check in-flight promise for this slug
  if (_productBySlugPromises.has(slug)) {
    return _productBySlugPromises.get(slug);
  }

  // 3. Fetch from Supabase
  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*), product_images(*)")
        .eq("slug", slug)
        .single();

      if (error || !data || data.status === "inactive" || data.is_active === false) {
        const localProducts = getLocalActiveProducts();
        const localMatch = localProducts.find((p) => p.slug === slug || p.id === slug);
        return { data: localMatch || null, error: null };
      }

      const normalized = normalizeProduct(data);
      _productBySlugCache.set(slug, { data: normalized, timestamp: Date.now() });
      return { data: normalized, error: null };
    } catch (err) {
      console.error(`Failed to fetch product for slug ${slug}:`, err);
      const localProducts = getLocalActiveProducts();
      const localMatch = localProducts.find((p) => p.slug === slug || p.id === slug);
      return { data: localMatch || null, error: null };
    } finally {
      _productBySlugPromises.delete(slug);
    }
  })();

  _productBySlugPromises.set(slug, fetchPromise);
  return fetchPromise;
}

/**
 * Fetch variants for a specific product
 */
export async function getProductVariants(productId) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: [{ id: "50ml", size: "50ml", volume: "50ml / 1.7 FL. OZ.", price: 12500, stockQuantity: 50 }],
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to fetch variants for product ${productId}:`, err);
    return { data: [], error: err };
  }
}
