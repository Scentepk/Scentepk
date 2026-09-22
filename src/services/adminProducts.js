import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { PRODUCTS } from "../data/products.js";

// Local storage key for fallback prototype mutations
const LOCAL_STORAGE_PRODUCTS_KEY = "scente_admin_products_cache";

export function notifyCatalogChange() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("scente_catalog_updated"));
    } catch (e) {}
  }
}

/**
 * Initializes and retrieves the local prototype products list
 */
function getLocalProductsStore() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((p) => {
        const isOutOfStock = p.status === "out_of_stock" || p.stock_quantity === 0;
        const isInactive = p.status === "inactive" || p.is_active === false;
        const status = isInactive ? "inactive" : isOutOfStock ? "out_of_stock" : (p.status || "active");
        return {
          ...p,
          status,
          is_active: status !== "inactive",
          stock_quantity: status === "out_of_stock" ? 0 : (p.stock_quantity ?? 50),
        };
      });
    }
  } catch (e) {
    console.error("Error reading local products cache:", e);
  }
  // Initialize with static catalog
  const initial = PRODUCTS.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle || "Extrait de Parfum",
    tagline: p.tagline || "",
    description: p.description || "",
    concentration: p.concentration || "30% Pure Perfume Oil",
    family: p.family || "unisex",
    families: p.families || [p.family || "unisex"],
    olfactive_family: p.olfactiveFamily || "",
    price: p.price || 12500,
    currency: "PKR",
    volume: p.volume || "50ml / 1.7 FL. OZ.",
    primary_image: p.image,
    secondary_image: p.secondaryImage || null,
    mood: p.mood || "",
    notes: p.notes || { top: [], heart: [], base: [] },
    stock_quantity: 50,
    is_active: true,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: `var-${p.id}-50ml`,
        product_id: p.id,
        size: "50ml",
        volume: "50ml / 1.7 FL. OZ.",
        price: p.price || 12500,
        stock_quantity: 50,
        is_active: true,
      },
    ],
  }));
  try {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

function saveLocalProductsStore(products) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error("Error saving local products cache:", e);
  }
}

/**
 * Fetch all products for Admin table with filtering and search
 */
export async function getAllProductsAdmin({ search = "", family = "all", status = "all" } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    let items = getLocalProductsStore();

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (family !== "all") {
      items = items.filter((p) => p.family === family || (p.families && p.families.includes(family)));
    }

    if (status === "active") {
      items = items.filter((p) => p.status === "active" || (p.is_active !== false && p.stock_quantity > 0));
    } else if (status === "inactive" || status === "archived") {
      items = items.filter((p) => p.status === "inactive" || p.is_active === false);
    } else if (status === "out_of_stock") {
      items = items.filter((p) => p.status === "out_of_stock" || p.stock_quantity === 0);
    }

    return { data: items, error: null };
  }

  try {
    let query = supabase
      .from("products")
      .select("*, product_variants(*), product_images(*)")
      .order("created_at", { ascending: false });

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    if (family !== "all") {
      query = query.eq("family", family);
    }

    if (status === "active") {
      query = query.eq("is_active", true).gt("stock_quantity", 0);
    } else if (status === "inactive" || status === "archived") {
      query = query.eq("is_active", false);
    } else if (status === "out_of_stock") {
      query = query.or("status.eq.out_of_stock,stock_quantity.eq.0");
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error("Failed to fetch admin products from Supabase:", err);
    return { data: getLocalProductsStore(), error: err };
  }
}

/**
 * Fetch single product for Edit form
 */
export async function getProductByIdAdmin(id) {
  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalProductsStore();
    const match = items.find((p) => p.id === id || p.slug === id);
    if (!match) return { data: null, error: new Error("Product not found") };
    return { data: match, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*), product_images(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to fetch product ${id}:`, err);
    const items = getLocalProductsStore();
    const match = items.find((p) => p.id === id || p.slug === id);
    return { data: match || null, error: err };
  }
}

/**
 * Create a new product with variants and images
 */
export async function createProductAdmin(productData, variants = [], images = []) {
  const slug = (productData.slug || productData.name || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const id = productData.id || slug || `prod-${Date.now()}`;

  // Clean images
  const cleanImages = (images || []).map((img, idx) => {
    const public_url = typeof img === "string" ? img : (img.public_url || img.url || "");
    const storage_path = typeof img === "object" ? (img.storage_path || img.path || null) : null;
    return {
      id: (typeof img === "object" && img.id) ? img.id : `img-${id}-${idx}`,
      product_id: id,
      public_url,
      storage_path,
      alt_text: (typeof img === "object" && img.alt_text) ? img.alt_text : productData.name,
      sort_order: (typeof img === "object" && typeof img.sort_order === "number") ? img.sort_order : idx,
      is_primary: idx === 0,
    };
  }).filter((img) => Boolean(img.public_url));

  const cleanProduct = {
    id,
    slug,
    name: productData.name.trim(),
    subtitle: productData.subtitle || "Extrait de Parfum",
    tagline: productData.tagline || "",
    description: productData.description || "",
    concentration: productData.concentration || "30% Pure Perfume Oil",
    family: productData.family || "unisex",
    families: productData.families || [productData.family || "unisex"],
    olfactive_family: productData.olfactive_family || "",
    price: Number(productData.price) || 0,
    currency: "PKR",
    volume: productData.volume || "50ml / 1.7 FL. OZ.",
    primary_image: cleanImages[0]?.public_url || productData.primary_image || "",
    secondary_image: cleanImages[1]?.public_url || productData.secondary_image || null,
    mood: productData.mood || "",
    notes: productData.notes || { top: [], heart: [], base: [] },
    stock_quantity: Number(productData.stock_quantity) || 0,
    is_active: productData.status ? productData.status !== "inactive" : (productData.is_active !== undefined ? productData.is_active : true),
    status: productData.status || (productData.is_active === false ? "inactive" : (productData.stock_quantity === 0 ? "out_of_stock" : "active")),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalProductsStore();
    const existingSlug = items.find((p) => p.slug === slug);
    if (existingSlug) {
      return { data: null, error: new Error(`Product slug "${slug}" already exists. Please choose a unique slug.`) };
    }

    const cleanVariants = variants.map((v, idx) => ({
      id: v.id || `var-${id}-${idx}`,
      product_id: id,
      size: v.size || "50ml",
      volume: v.volume || `${v.size} / 1.7 FL. OZ.`,
      price: Number(v.price) || cleanProduct.price,
      stock_quantity: Number(v.stock_quantity) || 50,
      is_active: v.is_active !== false,
    }));

    const newEntry = {
      ...cleanProduct,
      variants: cleanVariants,
      product_variants: cleanVariants,
      images: cleanImages,
      product_images: cleanImages,
    };

    items.unshift(newEntry);
    saveLocalProductsStore(items);
    notifyCatalogChange();
    return { data: newEntry, error: null };
  }

  try {
    // 1. Insert product
    const { data: insertedProduct, error: prodErr } = await supabase
      .from("products")
      .insert(cleanProduct)
      .select()
      .single();

    if (prodErr) throw prodErr;

    // 2. Insert variants if any
    if (variants.length > 0) {
      const variantPayload = variants.map((v) => ({
        product_id: id,
        size: v.size,
        volume: v.volume || `${v.size} / 1.7 FL. OZ.`,
        price: Number(v.price) || cleanProduct.price,
        stock_quantity: Number(v.stock_quantity) || 50,
        is_active: v.is_active !== false,
      }));

      await supabase.from("product_variants").insert(variantPayload);
    }

    // 3. Insert images if any
    if (cleanImages.length > 0) {
      const imagePayload = cleanImages.map((img, idx) => ({
        product_id: id,
        public_url: img.public_url,
        storage_path: img.storage_path,
        alt_text: img.alt_text || cleanProduct.name,
        sort_order: idx,
        is_primary: idx === 0,
      }));

      const { error: imgErr } = await supabase.from("product_images").insert(imagePayload);
      if (imgErr) {
        console.warn("Non-fatal: Failed to insert product_images rows:", imgErr);
      }
    }

    notifyCatalogChange();
    return { data: insertedProduct, error: null };
  } catch (err) {
    console.error("Failed to create product in Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * Update an existing product, variants, and images
 */
export async function updateProductAdmin(id, productData, variants = [], images = null) {
  // Clean images if provided
  const cleanImages = Array.isArray(images)
    ? images.map((img, idx) => {
        const public_url = typeof img === "string" ? img : (img.public_url || img.url || "");
        const storage_path = typeof img === "object" ? (img.storage_path || img.path || null) : null;
        return {
          id: (typeof img === "object" && img.id) ? img.id : `img-${id}-${idx}`,
          product_id: id,
          public_url,
          storage_path,
          alt_text: (typeof img === "object" && img.alt_text) ? img.alt_text : productData.name,
          sort_order: (typeof img === "object" && typeof img.sort_order === "number") ? img.sort_order : idx,
          is_primary: idx === 0,
        };
      }).filter((img) => Boolean(img.public_url))
    : null;

  const updatePayload = {
    name: productData.name.trim(),
    subtitle: productData.subtitle || "Extrait de Parfum",
    tagline: productData.tagline || "",
    description: productData.description || "",
    concentration: productData.concentration || "30% Pure Perfume Oil",
    family: productData.family || "unisex",
    families: productData.families || [productData.family || "unisex"],
    olfactive_family: productData.olfactive_family || "",
    price: Number(productData.price) || 0,
    volume: productData.volume || "50ml / 1.7 FL. OZ.",
    primary_image: cleanImages && cleanImages.length > 0 ? cleanImages[0].public_url : (productData.primary_image || ""),
    secondary_image: cleanImages && cleanImages.length > 1 ? cleanImages[1].public_url : (productData.secondary_image || null),
    mood: productData.mood || "",
    notes: productData.notes || { top: [], heart: [], base: [] },
    stock_quantity: Number(productData.stock_quantity) || 0,
    is_active: productData.status ? productData.status !== "inactive" : (productData.is_active !== undefined ? productData.is_active : true),
    status: productData.status || (productData.is_active === false ? "inactive" : (productData.stock_quantity === 0 ? "out_of_stock" : "active")),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalProductsStore();
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) return { data: null, error: new Error("Product not found") };

    const updatedEntry = {
      ...items[idx],
      ...updatePayload,
      variants: variants.length > 0 ? variants : items[idx].variants,
      product_variants: variants.length > 0 ? variants : items[idx].variants,
      images: cleanImages !== null ? cleanImages : (items[idx].product_images || []),
      product_images: cleanImages !== null ? cleanImages : (items[idx].product_images || []),
    };

    items[idx] = updatedEntry;
    saveLocalProductsStore(items);
    notifyCatalogChange();
    return { data: updatedEntry, error: null };
  }

  try {
    const { data: updatedProduct, error: prodErr } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (prodErr) throw prodErr;

    // Safely sync variants without hard-deleting historical order variants
    if (variants.length > 0) {
      // 1. Fetch existing variants currently in database
      const { data: existingVariants } = await supabase
        .from("product_variants")
        .select("id, size")
        .eq("product_id", id);

      const existingMap = new Map((existingVariants || []).map((v) => [v.id, v]));
      const incomingIds = new Set(variants.map((v) => v.id).filter(Boolean));

      // 2. Identify variants removed from this product configuration
      const removedVariants = (existingVariants || []).filter((ev) => !incomingIds.has(ev.id));

      for (const removed of removedVariants) {
        // Check if this variant is referenced by historical order_items
        const { count, error: countErr } = await supabase
          .from("order_items")
          .select("id", { count: "exact", head: true })
          .eq("variant_id", removed.id);

        if (!countErr && count > 0) {
          // Referenced by past orders: DO NOT hard delete. Deactivate instead!
          await supabase
            .from("product_variants")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", removed.id);
        } else {
          // Not referenced by historical orders: Safe to delete
          await supabase.from("product_variants").delete().eq("id", removed.id);
        }
      }

      // 3. Upsert / update active bottle sizes
      for (const v of variants) {
        const variantData = {
          product_id: id,
          size: v.size,
          volume: v.volume || `${v.size} / 1.7 FL. OZ.`,
          price: Number(v.price) || updatePayload.price,
          stock_quantity: Number(v.stock_quantity) || 0,
          is_active: v.is_active !== false,
          updated_at: new Date().toISOString(),
        };

        const isExisting = v.id && existingMap.has(v.id);
        if (isExisting) {
          await supabase
            .from("product_variants")
            .update(variantData)
            .eq("id", v.id);
        } else {
          await supabase.from("product_variants").insert(variantData);
        }
      }

      // 4. Transactionally sync base product stock from active variants
      try {
        await supabase.rpc("sync_product_inventory_from_variants", { p_product_id: id });
      } catch (e) {
        console.warn("Non-fatal: could not run sync_product_inventory_from_variants RPC:", e);
      }
    }

    // Replace images if provided
    if (cleanImages !== null) {
      // 1. Identify and clean up orphaned storage objects that were removed from this product
      try {
        const { data: existingImgRows } = await supabase
          .from("product_images")
          .select("storage_path")
          .eq("product_id", id);

        if (existingImgRows && existingImgRows.length > 0) {
          const newPaths = new Set(
            cleanImages.map((img) => img.storage_path).filter(Boolean)
          );
          const orphanedPaths = existingImgRows
            .map((r) => r.storage_path)
            .filter((path) => path && !newPaths.has(path));

          if (orphanedPaths.length > 0) {
            await deleteProductImageAdmin(orphanedPaths);
          }
        }
      } catch (cleanupErr) {
        console.warn("Non-fatal: image storage cleanup warning:", cleanupErr);
      }

      await supabase.from("product_images").delete().eq("product_id", id);
      if (cleanImages.length > 0) {
        const imagePayload = cleanImages.map((img, idx) => ({
          product_id: id,
          public_url: img.public_url,
          storage_path: img.storage_path,
          alt_text: img.alt_text || updatePayload.name,
          sort_order: idx,
          is_primary: idx === 0,
        }));
        const { error: imgErr } = await supabase.from("product_images").insert(imagePayload);
        if (imgErr) console.warn("Non-fatal: Failed to update product_images:", imgErr);
      }
    }

    notifyCatalogChange();
    return { data: updatedProduct, error: null };
  } catch (err) {
    console.error(`Failed to update product ${id}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Update single product status (active, inactive, out_of_stock)
 */
export async function updateProductStatusAdmin(id, newStatus) {
  const is_active = newStatus !== "inactive";

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalProductsStore();
    const idx = items.findIndex((p) => p.id === id || p.slug === id);
    if (idx !== -1) {
      const currentStock = items[idx].stock_quantity;
      const nextStock = newStatus === "out_of_stock" ? 0 : (currentStock === 0 ? 50 : currentStock);
      items[idx] = {
        ...items[idx],
        status: newStatus,
        is_active,
        stock_quantity: nextStock,
        updated_at: new Date().toISOString(),
      };
      saveLocalProductsStore(items);
      notifyCatalogChange();
      return { data: items[idx], error: null };
    }
    return { data: null, error: new Error("Product not found") };
  }

  try {
    const payload = {
      status: newStatus,
      is_active,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "out_of_stock") {
      payload.stock_quantity = 0;
    }

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes("status")) {
        const fallbackPayload = {
          is_active,
          updated_at: new Date().toISOString(),
        };
        if (newStatus === "out_of_stock") fallbackPayload.stock_quantity = 0;
        else if (newStatus === "active") fallbackPayload.stock_quantity = 50;

        const { data: fbData, error: fbErr } = await supabase
          .from("products")
          .update(fallbackPayload)
          .eq("id", id)
          .select()
          .single();

        if (fbErr) throw fbErr;
        notifyCatalogChange();
        return { data: { ...fbData, status: newStatus }, error: null };
      }
      throw error;
    }

    notifyCatalogChange();
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to update status for product ${id}:`, err);
    const items = getLocalProductsStore();
    const idx = items.findIndex((p) => p.id === id || p.slug === id);
    if (idx !== -1) {
      const currentStock = items[idx].stock_quantity;
      const nextStock = newStatus === "out_of_stock" ? 0 : (currentStock === 0 ? 50 : currentStock);
      items[idx] = {
        ...items[idx],
        status: newStatus,
        is_active,
        stock_quantity: nextStock,
        updated_at: new Date().toISOString(),
      };
      saveLocalProductsStore(items);
      notifyCatalogChange();
      return { data: items[idx], error: null };
    }
    return { data: null, error: err };
  }
}

/**
 * Toggle product active / archived state
 */
export async function toggleArchiveProductAdmin(id, newStatus) {
  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalProductsStore();
    const idx = items.findIndex((p) => p.id === id);
    if (idx !== -1) {
      items[idx].is_active = newStatus;
      items[idx].updated_at = new Date().toISOString();
      saveLocalProductsStore(items);
      notifyCatalogChange();
    }
    return { data: { id, is_active: newStatus }, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    notifyCatalogChange();
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to toggle archive status for product ${id}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Upload product image to Supabase Storage bucket 'product-images'
 */
export async function uploadProductImageAdmin(file) {
  if (!file) return { url: null, error: new Error("No file provided") };

  // Allowed formats
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!validTypes.includes(file.type)) {
    return { url: null, error: new Error("Invalid format. Please upload JPEG, PNG, or WebP.") };
  }

  // Size limit 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: new Error("Image exceeds 5MB limit.") };
  }

  if (!isSupabaseConfigured || !supabase) {
    // Generate preview data URL in local mode
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result, path: `local/${file.name}`, error: null });
      };
      reader.onerror = () => {
        resolve({ url: null, path: null, error: new Error("Failed to read image locally") });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl, path: filePath, error: null };
  } catch (err) {
    console.error("Storage upload error:", err);
    return { url: null, error: err };
  }
}

/**
 * Delete a product image from Supabase Storage bucket 'product-images'
 */
export async function deleteProductImageAdmin(storagePath) {
  if (!storagePath) return { success: true, error: null };
  if (!isSupabaseConfigured || !supabase) return { success: true, error: null };

  try {
    const paths = Array.isArray(storagePath) ? storagePath : [storagePath];
    const cleanPaths = paths.filter((p) => Boolean(p) && typeof p === "string");
    if (cleanPaths.length === 0) return { success: true, error: null };

    const { data, error } = await supabase.storage
      .from("product-images")
      .remove(cleanPaths);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Storage delete error:", err);
    return { data: null, error: err };
  }
}

/**
 * Delete an entire product, its variants, gallery images, and cleanly dissociate historical orders
 */
export async function deleteProductAdmin(id) {
  if (!id) return { success: false, error: new Error("Product ID is required") };

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalProductsStore();
    const filtered = items.filter((p) => p.id !== id && p.slug !== id);
    saveLocalProductsStore(filtered);
    notifyCatalogChange();
    return { success: true, error: null };
  }

  try {
    // 0. Resolve actual product ID in case slug was passed
    let targetId = id;
    const { data: prod } = await supabase
      .from("products")
      .select("id")
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle();

    if (prod && prod.id) {
      targetId = prod.id;
    }

    // 1. Fetch and clean up image storage files
    try {
      const { data: imgRows } = await supabase
        .from("product_images")
        .select("storage_path")
        .eq("product_id", targetId);

      if (imgRows && imgRows.length > 0) {
        const paths = imgRows.map((r) => r.storage_path).filter(Boolean);
        if (paths.length > 0) {
          await deleteProductImageAdmin(paths);
        }
      }
    } catch (imgErr) {
      console.warn("Non-fatal: could not clean up image storage files:", imgErr);
    }

    // 2. Fetch variants for this product
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", targetId);

    const variantIds = (variants || []).map((v) => v.id);

    // 3. Dissociate past order_items so trigger and foreign key don't block deletion
    if (variantIds.length > 0) {
      await supabase
        .from("order_items")
        .update({ variant_id: null })
        .in("variant_id", variantIds);
    }

    await supabase
      .from("order_items")
      .update({ product_id: null })
      .eq("product_id", targetId);

    // 4. Delete image rows and variants rows
    await supabase.from("product_images").delete().eq("product_id", targetId);
    await supabase.from("product_variants").delete().eq("product_id", targetId);

    // 5. Delete the product itself
    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .eq("id", targetId);

    if (delErr) throw delErr;

    // 6. Update local cache as well so fallback stays in sync
    const items = getLocalProductsStore();
    const filtered = items.filter(
      (p) => p.id !== targetId && p.slug !== targetId && p.id !== id && p.slug !== id
    );
    saveLocalProductsStore(filtered);

    notifyCatalogChange();
    return { success: true, error: null };
  } catch (err) {
    console.error(`Failed to delete product ${id}:`, err);
    return { success: false, error: err };
  }
}

