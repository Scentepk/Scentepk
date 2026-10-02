import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const LOCAL_STORAGE_REVIEWS_KEY = "scente_admin_reviews_cache";

/**
 * Normalizes a database review record to the frontend camelCase structure
 */
export function normalizeReview(dbRow) {
  if (!dbRow) return null;
  const prod = dbRow.products || dbRow.product || null;

  return {
    id: dbRow.id,
    customerName: dbRow.customer_name || dbRow.customerName || "",
    reviewText: dbRow.review_text || dbRow.reviewText || "",
    rating: Number(dbRow.rating) || 5,
    location: dbRow.location || "",
    productId: dbRow.product_id || dbRow.productId || null,
    productName: prod?.name || dbRow.product_name || dbRow.productName || null,
    productSlug: prod?.slug || dbRow.product_slug || dbRow.productSlug || null,
    product: prod ? { id: prod.id, name: prod.name, slug: prod.slug } : null,
    isPublished: dbRow.is_published ?? dbRow.isPublished ?? false,
    displayOrder: Number(dbRow.display_order ?? dbRow.displayOrder ?? 0),
    createdAt: dbRow.created_at || dbRow.createdAt || new Date().toISOString(),
    updatedAt: dbRow.updated_at || dbRow.updatedAt || new Date().toISOString(),
  };
}

/**
 * Reads local cached reviews (fallback for offline/demo scenarios)
 */
function getLocalReviews() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeReview);
      }
    }
  } catch (e) {
    console.warn("Failed to parse local reviews cache:", e);
  }
  return [];
}

/**
 * Persists reviews to local cache and broadcasts update event
 */
function saveLocalReviews(reviews) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("scente_reviews_updated", { detail: reviews }));
    }
  } catch (e) {
    console.error("Failed to save local reviews cache:", e);
  }
}

/**
 * Public Storefront API:
 * Fetches ONLY published reviews sorted by display_order ASC, created_at DESC.
 */
export async function getPublishedReviews() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, product:products(id, name, slug)")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase getPublishedReviews error, using local fallback:", error);
        const local = getLocalReviews().filter((r) => r.isPublished);
        return { data: local, error: null };
      }

      const normalized = (data || []).map(normalizeReview);
      return { data: normalized, error: null };
    } catch (err) {
      console.warn("getPublishedReviews failed unexpectedly, using local fallback:", err);
      const local = getLocalReviews().filter((r) => r.isPublished);
      return { data: local, error: null };
    }
  }

  // Fallback when Supabase is not configured
  const local = getLocalReviews().filter((r) => r.isPublished);
  return { data: local, error: null };
}

/**
 * Admin API:
 * Fetches ALL reviews (both published and drafts).
 */
export async function getAllReviewsAdmin() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, product:products(id, name, slug)")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase getAllReviewsAdmin error, using local cache:", error);
        return { data: getLocalReviews(), error };
      }

      const normalized = (data || []).map(normalizeReview);
      saveLocalReviews(normalized);
      return { data: normalized, error: null };
    } catch (err) {
      console.warn("getAllReviewsAdmin failed unexpectedly, using local cache:", err);
      return { data: getLocalReviews(), error: err };
    }
  }

  return { data: getLocalReviews(), error: null };
}

/**
 * Admin API:
 * Create a new review record.
 */
export async function createReviewAdmin(payload) {
  const customerName = (payload.customerName || payload.customer_name || "").trim();
  const reviewText = (payload.reviewText || payload.review_text || "").trim();
  const rating = Number(payload.rating);

  if (!customerName) {
    return { data: null, error: { message: "Customer name is required." } };
  }
  if (!reviewText) {
    return { data: null, error: { message: "Review text is required." } };
  }
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { data: null, error: { message: "Rating must be a whole number between 1 and 5." } };
  }

  const dbPayload = {
    customer_name: customerName,
    review_text: reviewText,
    rating,
    location: (payload.location || "").trim() || null,
    product_id: payload.productId || payload.product_id || null,
    is_published: Boolean(payload.isPublished ?? payload.is_published ?? false),
    display_order: Number(payload.displayOrder ?? payload.display_order ?? 0),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .insert(dbPayload)
        .select("*, product:products(id, name, slug)")
        .single();

      if (error) {
        console.error("Supabase createReviewAdmin error:", error);
        return { data: null, error };
      }

      const normalized = normalizeReview(data);
      const local = [normalized, ...getLocalReviews()];
      saveLocalReviews(local);
      return { data: normalized, error: null };
    } catch (err) {
      console.error("createReviewAdmin failed:", err);
      return { data: null, error: err };
    }
  }

  // Local fallback
  const newReview = normalizeReview({
    id: `rev-${Date.now()}`,
    ...dbPayload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const local = [newReview, ...getLocalReviews()];
  saveLocalReviews(local);
  return { data: newReview, error: null };
}

/**
 * Admin API:
 * Update an existing review record.
 */
export async function updateReviewAdmin(id, payload) {
  if (!id) {
    return { data: null, error: { message: "Review ID is required." } };
  }

  const customerName = (payload.customerName || payload.customer_name || "").trim();
  const reviewText = (payload.reviewText || payload.review_text || "").trim();
  const rating = Number(payload.rating);

  if (!customerName) {
    return { data: null, error: { message: "Customer name is required." } };
  }
  if (!reviewText) {
    return { data: null, error: { message: "Review text is required." } };
  }
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { data: null, error: { message: "Rating must be a whole number between 1 and 5." } };
  }

  const updateFields = {
    customer_name: customerName,
    review_text: reviewText,
    rating,
    location: (payload.location || "").trim() || null,
    product_id: payload.productId || payload.product_id || null,
    is_published: Boolean(payload.isPublished ?? payload.is_published ?? false),
    display_order: Number(payload.displayOrder ?? payload.display_order ?? 0),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .update(updateFields)
        .eq("id", id)
        .select("*, product:products(id, name, slug)")
        .single();

      if (error) {
        console.error("Supabase updateReviewAdmin error:", error);
        return { data: null, error };
      }

      const normalized = normalizeReview(data);
      const updatedLocal = getLocalReviews().map((r) => (r.id === id ? normalized : r));
      saveLocalReviews(updatedLocal);
      return { data: normalized, error: null };
    } catch (err) {
      console.error("updateReviewAdmin failed:", err);
      return { data: null, error: err };
    }
  }

  // Local fallback
  const local = getLocalReviews();
  const idx = local.findIndex((r) => r.id === id);
  if (idx === -1) {
    return { data: null, error: { message: "Review not found in local cache." } };
  }

  const updatedReview = {
    ...local[idx],
    ...updateFields,
    customerName,
    reviewText,
    rating,
    location: updateFields.location,
    productId: updateFields.product_id,
    isPublished: updateFields.is_published,
    displayOrder: updateFields.display_order,
  };

  local[idx] = updatedReview;
  saveLocalReviews(local);
  return { data: updatedReview, error: null };
}

/**
 * Admin API:
 * Delete a review record.
 */
export async function deleteReviewAdmin(id) {
  if (!id) {
    return { error: { message: "Review ID is required." } };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase deleteReviewAdmin error:", error);
        return { error };
      }
    } catch (err) {
      console.error("deleteReviewAdmin failed:", err);
      return { error: err };
    }
  }

  const local = getLocalReviews().filter((r) => r.id !== id);
  saveLocalReviews(local);
  return { error: null };
}

/**
 * Admin API:
 * Quick toggle for publication status.
 */
export async function toggleReviewPublishAdmin(id, isPublished) {
  if (!id) {
    return { data: null, error: { message: "Review ID is required." } };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .update({
          is_published: Boolean(isPublished),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, product:products(id, name, slug)")
        .single();

      if (error) {
        console.error("Supabase toggleReviewPublishAdmin error:", error);
        return { data: null, error };
      }

      const normalized = normalizeReview(data);
      const local = getLocalReviews().map((r) => (r.id === id ? normalized : r));
      saveLocalReviews(local);
      return { data: normalized, error: null };
    } catch (err) {
      console.error("toggleReviewPublishAdmin failed:", err);
      return { data: null, error: err };
    }
  }

  // Local fallback
  const local = getLocalReviews();
  const idx = local.findIndex((r) => r.id === id);
  if (idx !== -1) {
    local[idx].isPublished = Boolean(isPublished);
    local[idx].updatedAt = new Date().toISOString();
    saveLocalReviews(local);
    return { data: local[idx], error: null };
  }

  return { data: null, error: { message: "Review not found." } };
}

/**
 * Calculates responsive visible card count based on screen width.
 * Desktop (>=1024px): 3
 * Tablet (768px-1023px): 2
 * Mobile (<768px): 1
 */
export function getReviewsVisibleCount(windowWidth) {
  if (typeof windowWidth !== "number" || windowWidth < 768) return 1;
  if (windowWidth < 1024) return 2;
  return 3;
}

/**
 * Calculates max carousel slide index.
 * Movement is 1 review at a time.
 */
export function calculateCarouselMaxIndex(totalItems, visibleCount) {
  if (!totalItems || totalItems <= 0) return 0;
  const count = typeof visibleCount === "number" && visibleCount > 0 ? visibleCount : 1;
  return Math.max(0, totalItems - count);
}

/**
 * Determines whether navigation controls (arrows / pagination) are needed.
 */
export function shouldShowCarouselNavigation(totalItems, visibleCount) {
  if (!totalItems || totalItems <= 0) return false;
  const count = typeof visibleCount === "number" && visibleCount > 0 ? visibleCount : 1;
  return totalItems > count;
}

