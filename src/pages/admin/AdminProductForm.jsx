import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getProductByIdAdmin,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  uploadProductImageAdmin,
  deleteProductImageAdmin,
} from "../../services/adminProducts";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Star,
  X,
  Check,
  Sparkles,
  Crop,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "../../components/CustomSelect";
import Input from "../../components/Input";
import Textarea from "../../components/Textarea";
import ImageCropModal from "../../components/admin/ImageCropModal";
import { calculateDiscountPercent } from "../../lib/pricing";

// Controlled Taxonomy for Fragrance Recommendation Engine
const SCENT_FAMILY_OPTIONS = [
  { value: "woody", label: "Woody" },
  { value: "oriental_amber", label: "Oriental & Amber" },
  { value: "fresh_citrus", label: "Fresh & Citrus" },
  { value: "floral", label: "Floral" },
  { value: "leather_smoky", label: "Leather & Smoky" },
  { value: "clean_musk", label: "Clean & Musk" },
  { value: "gourmand", label: "Gourmand" },
];

const INTENSITY_OPTIONS = [
  { value: "subtle", label: "Subtle", desc: "Intimate skin scent" },
  { value: "moderate", label: "Moderate", desc: "Balanced everyday sillage" },
  { value: "intense", label: "Intense", desc: "Commanding room-filling trail" },
];

const MOOD_OPTIONS = [
  { value: "mysterious", label: "Mysterious & Dark" },
  { value: "warm_enveloping", label: "Warm & Enveloping" },
  { value: "clean_timeless", label: "Clean & Timeless" },
  { value: "regal_opulent", label: "Regal & Opulent" },
  { value: "luminous_fresh", label: "Luminous & Fresh" },
  { value: "bold_magnetic", label: "Bold & Magnetic" },
  { value: "romantic", label: "Romantic" },
  { value: "dramatic", label: "Dramatic" },
];

const OCCASION_OPTIONS = [
  { value: "daily_office", label: "Daily & Office" },
  { value: "evening_date", label: "Evening & Date Night" },
  { value: "special_event", label: "Weddings & Special Events" },
  { value: "signature_all_day", label: "Signature / All-Day" },
  { value: "party", label: "Parties & Social" },
];

const SEASON_OPTIONS = [
  { value: "all_year", label: "All Year" },
  { value: "spring_summer", label: "Spring / Summer" },
  { value: "fall_winter", label: "Fall / Winter" },
];

export default function AdminProductForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState("");
  // Image Crop & Positioning Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropQueue, setCropQueue] = useState([]);
  const [cropQueueIndex, setCropQueueIndex] = useState(0);
  const [isCropUploading, setIsCropUploading] = useState(false);

  // Product form data
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    subtitle: "Extrait de Parfum",
    tagline: "",
    description: "",
    concentration: "30% Pure Perfume Oil",
    volume: "50ml / 1.7 FL. OZ.",
    family: "unisex",
    olfactive_family: "",
    mood: "",
    price: 12500,
    compare_at_price: "",
    stock_quantity: 50,
    primary_image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85",
    secondary_image: "",
    topNotes: "Bergamot, Cardamom",
    heartNotes: "Cedarwood, Birch Tar",
    baseNotes: "Oud, Amber Resins",
    fragranceProfile: {
      scentFamilies: [],
      intensity: null,
      moods: [],
      occasions: [],
      seasons: [],
    },
    is_active: true,
    status: "active",
  });

  // Bottle Variants State
  const [variants, setVariants] = useState([
    {
      id: "var-default-50ml",
      size: "50ml",
      volume: "50ml / 1.7 FL. OZ.",
      compare_at_price: "",
      price: 12500,
      stock_quantity: 50,
      is_active: true,
    },
  ]);

  // Multiple Product Images State
  const [images, setImages] = useState([
    {
      id: "img-default-1",
      public_url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85",
      storage_path: null,
      is_primary: true,
    },
  ]);
  const [webImageUrl, setWebImageUrl] = useState("");

  // Load existing product if editing
  useEffect(() => {
    if (!isEditing) return;

    async function loadProduct() {
      setIsLoading(true);
      const { data, error } = await getProductByIdAdmin(id);
      if (error || !data) {
        setErrorMsg("Fragrance not found in catalog.");
        setIsLoading(false);
        return;
      }

      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        subtitle: data.subtitle || "Extrait de Parfum",
        tagline: data.tagline || "",
        description: data.description || "",
        concentration: data.concentration || "30% Pure Perfume Oil",
        volume: data.volume || "50ml / 1.7 FL. OZ.",
        family: (() => {
          const raw = (data.family || "").toLowerCase();
          if (["men", "women", "unisex", "waxes", "testers"].includes(raw)) return raw;
          if (raw === "wax") return "waxes";
          if (raw === "tester") return "testers";
          if (raw === "woody") return "men";
          if (raw === "floral") return "women";
          return "unisex";
        })(),
        olfactive_family: data.olfactive_family || data.olfactiveFamily || "",
        mood: data.mood || "",
        price: data.price || 12500,
        compare_at_price: data.compare_at_price ?? data.compareAtPrice ?? "",
        stock_quantity: data.stock_quantity ?? 50,
        primary_image: data.primary_image || data.image || "",
        secondary_image: data.secondary_image || data.secondaryImage || "",
        topNotes: data.notes?.top ? data.notes.top.join(", ") : "",
        heartNotes: data.notes?.heart ? data.notes.heart.join(", ") : "",
        baseNotes: data.notes?.base ? data.notes.base.join(", ") : "",
        fragranceProfile: {
          scentFamilies: Array.isArray(data.fragranceProfile?.scentFamilies)
            ? data.fragranceProfile.scentFamilies
            : (Array.isArray(data.fragrance_profile?.scent_families) ? data.fragrance_profile.scent_families : []),
          intensity: data.fragranceProfile?.intensity ?? data.fragrance_profile?.intensity ?? null,
          moods: Array.isArray(data.fragranceProfile?.moods)
            ? data.fragranceProfile.moods
            : (Array.isArray(data.fragrance_profile?.moods) ? data.fragrance_profile.moods : []),
          occasions: Array.isArray(data.fragranceProfile?.occasions)
            ? data.fragranceProfile.occasions
            : (Array.isArray(data.fragrance_profile?.occasions) ? data.fragrance_profile.occasions : []),
          seasons: Array.isArray(data.fragranceProfile?.seasons)
            ? data.fragranceProfile.seasons
            : (Array.isArray(data.fragrance_profile?.seasons) ? data.fragrance_profile.seasons : []),
        },
        is_active: data.is_active !== false,
        status: data.status || (data.is_active === false ? "inactive" : (data.stock_quantity === 0 ? "out_of_stock" : "active")),
      });

      const loadedVariants = data.product_variants || data.variants || [];
      if (loadedVariants.length > 0) {
        setVariants(
          loadedVariants.map((v) => ({
            ...v,
            compare_at_price: v.compare_at_price ?? v.compareAtPrice ?? "",
          }))
        );
      }

      // Load all product images
      const loadedImages = data.product_images || data.images || [];
      if (Array.isArray(loadedImages) && loadedImages.length > 0) {
        setImages(
          loadedImages.map((img, idx) => ({
            id: img.id || `img-${data.id}-${idx}`,
            public_url: typeof img === "string" ? img : (img.public_url || img.url || ""),
            storage_path: typeof img === "object" ? (img.storage_path || img.path || null) : null,
            is_primary: idx === 0,
          })).filter((i) => Boolean(i.public_url))
        );
      } else if (data.primary_image || data.image) {
        const initialGallery = [
          {
            id: `img-${data.id}-0`,
            public_url: data.primary_image || data.image,
            storage_path: null,
            is_primary: true,
          },
        ];
        if (data.secondary_image || data.secondaryImage) {
          initialGallery.push({
            id: `img-${data.id}-1`,
            public_url: data.secondary_image || data.secondaryImage,
            storage_path: null,
            is_primary: false,
          });
        }
        setImages(initialGallery);
      }

      setIsLoading(false);
    }

    loadProduct();
  }, [id, isEditing]);

  // Handle multi-select toggle for recommendation profile arrays
  const handleToggleProfileArray = (field, value) => {
    setFormData((prev) => {
      const current = prev.fragranceProfile?.[field] || [];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return {
        ...prev,
        fragranceProfile: {
          ...prev.fragranceProfile,
          [field]: updated,
        },
      };
    });
  };

  // Handle single-select / toggle for intensity
  const handleSelectIntensity = (val) => {
    setFormData((prev) => ({
      ...prev,
      fragranceProfile: {
        ...prev.fragranceProfile,
        intensity: prev.fragranceProfile?.intensity === val ? null : val,
      },
    }));
  };

  // Auto-generate URL slug when product name changes (only in Add mode)
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !isEditing
        ? val
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : prev.slug,
    }));
  };

  // Add another bottle size variant
  const handleAddVariant = () => {
    const newVariant = {
      id: `var-${Date.now()}`,
      size: "100ml",
      volume: "100ml / 3.4 FL. OZ.",
      compare_at_price: "",
      price: Math.round(Number(formData.price || 12500) * 1.6),
      stock_quantity: 25,
      is_active: true,
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  // Update a bottle size variant
  const handleVariantChange = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (idx !== index) return v;
        let parsedValue = value;
        if (field === "price" || field === "stock_quantity") {
          parsedValue = value === "" ? "" : Number(value);
        } else if (field === "compare_at_price") {
          parsedValue = value === "" ? "" : Number(value);
        }
        return {
          ...v,
          [field]: parsedValue,
        };
      })
    );
  };

  // Remove a variant
  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      setErrorMsg("A fragrance composition must have at least one bottle size.");
      return;
    }
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Handle multiple file selection: enqueue into visual Crop & Positioning Modal
  const handleFileUpload = (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    setErrorMsg("");

    // Validate size limit (5MB)
    const validFiles = [];
    const oversizeErrors = [];

    for (const file of fileList) {
      if (file.size > 5 * 1024 * 1024) {
        oversizeErrors.push(`${file.name} exceeds 5MB limit`);
      } else {
        validFiles.push(file);
      }
    }

    if (oversizeErrors.length > 0) {
      setErrorMsg(oversizeErrors.join(" • "));
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const queueItems = validFiles.map((file) => ({
      file,
      fileName: file.name,
      isNewUpload: true,
    }));

    setCropQueue(queueItems);
    setCropQueueIndex(0);
    setCropModalOpen(true);

    e.target.value = "";
  };

  // Open Crop & Framing Modal for an existing gallery image
  const handleOpenCropForExistingImage = (idx) => {
    const targetImage = images[idx];
    if (!targetImage?.public_url) return;

    setCropQueue([
      {
        file: targetImage.public_url,
        fileName: `product-image-${idx + 1}.jpg`,
        existingIndex: idx,
        isNewUpload: false,
      },
    ]);
    setCropQueueIndex(0);
    setCropModalOpen(true);
  };

  // Close the crop modal and clear queue
  const handleCloseCropModal = () => {
    setCropModalOpen(false);
    setCropQueue([]);
    setCropQueueIndex(0);
    setIsCropUploading(false);
  };

  // Apply crop result, upload to Supabase Storage, and update gallery
  const handleApplyCrop = async (cropResult) => {
    const currentItem = cropQueue[cropQueueIndex];
    if (!currentItem) return;

    // Handle skip to next image
    if (cropResult?.skip) {
      if (cropQueueIndex < cropQueue.length - 1) {
        setCropQueueIndex((prev) => prev + 1);
      } else {
        handleCloseCropModal();
      }
      return;
    }

    const { file: croppedFile, cropMetadata } = cropResult;
    if (!croppedFile) return;

    setIsCropUploading(true);
    setErrorMsg("");

    const { url, path, error } = await uploadProductImageAdmin(croppedFile);

    setIsCropUploading(false);

    if (error) {
      setErrorMsg(`Upload failed: ${error.message || "Failed to upload cropped image"}`);
      return;
    }

    if (url) {
      if (currentItem.existingIndex !== undefined) {
        // Replacing framing of existing gallery image
        const idx = currentItem.existingIndex;
        const oldImage = images[idx];
        if (oldImage?.storage_path && oldImage.isNewlyUploaded) {
          deleteProductImageAdmin(oldImage.storage_path).catch(() => {});
        }

        setImages((prev) => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            public_url: url,
            storage_path: path,
            isNewlyUploaded: true,
            crop_metadata: cropMetadata,
          };
          return updated;
        });

        if (idx === 0) {
          setFormData((prev) => ({ ...prev, primary_image: url }));
        }

        setSuccessMsg("Product image framing updated successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
        handleCloseCropModal();
      } else {
        // Newly uploaded photo from device
        const newImg = {
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          public_url: url,
          storage_path: path,
          is_primary: images.length === 0,
          isNewlyUploaded: true,
          crop_metadata: cropMetadata,
        };

        setImages((prev) => {
          const combined = [...prev, newImg];
          return combined.map((img, i) => ({
            ...img,
            is_primary: i === 0,
          }));
        });

        if (images.length === 0) {
          setFormData((prev) => ({ ...prev, primary_image: url }));
        }

        if (cropQueueIndex < cropQueue.length - 1) {
          // Advance to next image in batch
          setCropQueueIndex((prev) => prev + 1);
        } else {
          // Queue finished
          setSuccessMsg(
            `${cropQueue.length} photo${cropQueue.length > 1 ? "s" : ""} framed & added to product gallery.`
          );
          setTimeout(() => setSuccessMsg(""), 3500);
          handleCloseCropModal();
        }
      }
    }
  };

  // Add image by direct Web URL
  const handleAddWebImageUrl = () => {
    const trimmed = webImageUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setErrorMsg("Please enter a valid image web URL.");
      return;
    }
    const newImg = {
      id: `img-${Date.now()}`,
      public_url: trimmed,
      storage_path: null,
      is_primary: images.length === 0,
    };
    setImages((prev) => {
      const combined = [...prev, newImg];
      return combined.map((img, idx) => ({ ...img, is_primary: idx === 0 }));
    });
    setWebImageUrl("");
    setSuccessMsg("Image URL added to gallery.");
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  // Remove an individual image from gallery
  const handleRemoveImage = (indexToRemove) => {
    const targetImage = images[indexToRemove];
    if (targetImage?.storage_path && targetImage.isNewlyUploaded) {
      deleteProductImageAdmin(targetImage.storage_path).catch(() => {});
    }
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      return filtered.map((img, idx) => ({ ...img, is_primary: idx === 0 }));
    });
  };

  // Set an image as primary (moves to first slot)
  const handleSetPrimaryImage = (index) => {
    setImages((prev) => {
      if (index === 0) return prev;
      const target = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [target, ...rest].map((img, idx) => ({ ...img, is_primary: idx === 0 }));
    });
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Product Name is required. Please provide a title.");
      return;
    }

    if (!formData.slug.trim()) {
      setErrorMsg("URL Slug is required. (e.g. santal-33).");
      return;
    }

    if (Number(formData.price) < 0 || isNaN(Number(formData.price))) {
      setErrorMsg("Main display price must be a valid positive number.");
      return;
    }

    if (formData.compare_at_price !== "" && formData.compare_at_price !== null) {
      const comp = Number(formData.compare_at_price);
      if (isNaN(comp) || comp < 0) {
        setErrorMsg("Main display compare-at price cannot be negative.");
        return;
      }
    }

    if (Number(formData.stock_quantity) < 0 || isNaN(Number(formData.stock_quantity))) {
      setErrorMsg("Stock quantity cannot be a negative number.");
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const vPrice = Number(v.price);
      if (isNaN(vPrice) || vPrice < 0) {
        setErrorMsg(`Bottle size "${v.size || i + 1}" price must be a valid positive number.`);
        return;
      }
      if (v.compare_at_price !== "" && v.compare_at_price !== null && v.compare_at_price !== undefined) {
        const vComp = Number(v.compare_at_price);
        if (isNaN(vComp) || vComp < 0) {
          setErrorMsg(`Bottle size "${v.size || i + 1}" compare-at price cannot be negative.`);
          return;
        }
      }
    }

    if (images.length === 0) {
      setErrorMsg("At least one product photo is required.");
      return;
    }

    setIsSaving(true);

    const calculatedTotalStock = variants.length > 0
      ? variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0)
      : Number(formData.stock_quantity);

    const cleanVariantsPayload = variants.map((v) => ({
      ...v,
      price: Number(v.price) || 0,
      compare_at_price:
        v.compare_at_price !== "" &&
        v.compare_at_price !== null &&
        v.compare_at_price !== undefined &&
        !isNaN(Number(v.compare_at_price)) &&
        Number(v.compare_at_price) > 0
          ? Number(v.compare_at_price)
          : null,
      stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
    }));

    const payload = {
      ...formData,
      family: formData.family,
      families: [formData.family],
      price: Number(formData.price),
      compare_at_price:
        formData.compare_at_price !== "" &&
        formData.compare_at_price !== null &&
        formData.compare_at_price !== undefined &&
        !isNaN(Number(formData.compare_at_price)) &&
        Number(formData.compare_at_price) > 0
          ? Number(formData.compare_at_price)
          : null,
      stock_quantity: calculatedTotalStock,
      notes: {
        top: formData.topNotes.split(",").map((s) => s.trim()).filter(Boolean),
        heart: formData.heartNotes.split(",").map((s) => s.trim()).filter(Boolean),
        base: formData.baseNotes.split(",").map((s) => s.trim()).filter(Boolean),
      },
      fragrance_profile: formData.fragranceProfile,
    };

    const cleanPrimary = images[0]?.public_url || formData.primary_image || "";
    const cleanSecondary = images[1]?.public_url || formData.secondary_image || null;

    let res;
    if (isEditing) {
      res = await updateProductAdmin(id, {
        ...payload,
        primary_image: cleanPrimary,
        secondary_image: cleanSecondary,
      }, cleanVariantsPayload, images);
    } else {
      res = await createProductAdmin({
        ...payload,
        primary_image: cleanPrimary,
        secondary_image: cleanSecondary,
      }, cleanVariantsPayload, images);
    }

    setIsSaving(false);

    if (res.error) {
      setErrorMsg(res.error.message || "Error saving product to database.");
    } else {
      setSuccessMsg(isEditing ? "Fragrance updated successfully." : "New fragrance created.");
      setTimeout(() => {
        navigate("/admin/products");
      }, 1200);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-[#AAA49B] text-xs uppercase font-sans tracking-[0.24em] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#BFA27A]" />
        <span>Loading Product Details...</span>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-10 pb-16 max-w-5xl mx-auto w-full min-w-0">
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div className="space-y-1 min-w-0 flex-1 pr-2">
          <Link
            to="/admin/products"
            className="inline-flex items-center text-[10.5px] uppercase font-sans tracking-[0.2em] text-[#777169] hover:text-[#BFA27A] transition-colors mb-1.5 min-h-[30px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
            <span>Back to Product Catalog</span>
          </Link>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-1 font-medium">
              {isEditing ? "FORMULATION EDITOR" : "NEW FORMULATION ARCHITECTURE"}
            </span>
            <h1 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline leading-tight truncate">
              {formData.name || (isEditing ? "Edit Fragrance" : "Craft New Fragrance")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap self-start md:self-center">
          {isEditing && (
            <Link
              to={`/product/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 sm:px-4 py-2 text-xs uppercase font-sans tracking-[0.16em] text-[#AAA49B] hover:text-[#F2EEE7] border border-[rgba(242,238,231,0.1)] hover:border-[#BFA27A] transition-colors flex items-center justify-center space-x-1.5 min-h-[40px] rounded-sm whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#BFA27A]" />
              <span>Storefront</span>
            </Link>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setDeleteModalError("");
                setShowDeleteModal(true);
              }}
              className="px-3 sm:px-4 py-2 text-xs uppercase font-sans tracking-[0.16em] text-rose-400 hover:text-white bg-rose-950/20 hover:bg-rose-900/60 border border-rose-500/30 transition-all flex items-center justify-center space-x-1.5 min-h-[40px] rounded-sm cursor-pointer whitespace-nowrap"
              title="Delete this fragrance"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] font-semibold px-4 sm:px-5 py-2 text-xs uppercase font-sans tracking-[0.18em] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-40 min-h-[40px] rounded-sm whitespace-nowrap"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D0D0C]" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>SAVE PRODUCT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS (ERROR / SUCCESS) */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 sm:p-4 bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-sans flex items-center justify-between gap-3 rounded-sm"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="p-1 text-rose-400/70 hover:text-rose-200 transition-colors shrink-0 cursor-pointer"
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 sm:p-4 bg-[#181714] border border-[#BFA27A]/60 text-[#BFA27A] text-xs font-sans flex items-center justify-between gap-3 rounded-sm"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#BFA27A]" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg("")}
              className="p-1 text-[#BFA27A]/70 hover:text-[#BFA27A] transition-colors shrink-0 cursor-pointer"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: PRODUCT INFORMATION */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm">
        <div className="pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal">
            1. Product Information
          </h2>
          <p className="text-xs font-sans text-[#777169] mt-0.5">
            General product details displayed in the shop catalog and web address.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs font-sans">
          {/* Product Name */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Product Name <span className="text-[#BFA27A]">*</span>
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Santal 33 or SCENTÉ NOIR"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              The name customers will see on the website, in the cart, and on receipts.
            </p>
          </div>

          {/* URL Slug */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              URL Slug <span className="text-[#BFA27A]">*</span>
            </label>
            <Input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. santal-33"
              className="font-mono text-[#AAA49B]"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              Used for the product page web link (e.g. /product/santal-33). Automatically generated from the product name.
            </p>
          </div>

          {/* Short Tagline */}
          <div className="md:col-span-2">
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Short Tagline
            </label>
            <Input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="e.g. Quietly bold. Deeply refined."
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              A short, catchy sentence that captures the personality of this fragrance.
            </p>
          </div>

          {/* Full Product Description */}
          <div className="md:col-span-2">
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Product Description
            </label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the fragrance, its character, inspiration, and overall experience..."
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              Write the full fragrance story and description that customers will read on the product page.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: FRAGRANCE DETAILS */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm">
        <div className="pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal">
            2. Fragrance Details
          </h2>
          <p className="text-xs font-sans text-[#777169] mt-0.5">
            Information about the scent itself. This helps customers understand what the fragrance smells like.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs font-sans">
          {/* Product Category / Target Audience */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Category / Target Audience <span className="text-[#BFA27A]">*</span>
            </label>
            <CustomSelect
              value={formData.family}
              onChange={(val) => setFormData((prev) => ({ ...prev, family: val }))}
              options={[
                { value: "men", label: "Men" },
                { value: "women", label: "Women" },
                { value: "unisex", label: "Unisex" },
                { value: "waxes", label: "Waxes" },
                { value: "testers", label: "Testers" },
              ]}
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              Choose the shop category for this product (Men, Women, Unisex, Waxes, or Testers).
            </p>
          </div>

          {/* Scent Character */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Scent Character
            </label>
            <Input
              type="text"
              value={formData.olfactive_family}
              onChange={(e) => setFormData({ ...formData, olfactive_family: e.target.value })}
              placeholder="e.g. Warm, smoky, sophisticated and magnetic"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              Describe the overall smell in 3 to 5 words (e.g. Smoky Woods & Tuscan Leather).
            </p>
          </div>

          {/* Fragrance Concentration */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Fragrance Concentration
            </label>
            <Input
              type="text"
              value={formData.concentration}
              onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
              placeholder="e.g. Extrait de Parfum (30% Pure Perfume Oil)"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              How concentrated the perfume is (e.g. Extrait de Parfum or 30% Pure Perfume Oil).
            </p>
          </div>

          {/* Standard Bottle Volume */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Standard Bottle Volume
            </label>
            <Input
              type="text"
              value={formData.volume}
              onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
              placeholder="e.g. 50ml / 1.7 FL. OZ."
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              Default bottle volume specification displayed on the product page.
            </p>
          </div>

          {/* Mood / Editorial Description */}
          <div className="md:col-span-2">
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Mood / Editorial Description
            </label>
            <Input
              type="text"
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
              placeholder="e.g. Smoky • Nocturnal • Magnetic"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              Sensory keywords shown on product cards and marketing highlights (e.g. Warm • Radiant • Enveloping).
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: FRAGRANCE NOTES */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm">
        <div className="pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal">
            3. Fragrance Notes
          </h2>
          <p className="text-xs font-sans text-[#777169] mt-0.5">
            These are the main ingredients and notes customers notice as the perfume develops over time. Separate multiple notes with commas.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-5 text-xs font-sans">
          {/* Top Notes */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#BFA27A] mb-1.5 font-medium">
              Top Notes (Opening Scent)
            </label>
            <Input
              type="text"
              value={formData.topNotes}
              onChange={(e) => setFormData({ ...formData, topNotes: e.target.value })}
              placeholder="e.g. Italian Bergamot, Pink Pepper, Cardamom"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              The scents noticed first right after spraying (lasts ~15 to 30 minutes). Separate with commas.
            </p>
          </div>

          {/* Heart Notes */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#BFA27A] mb-1.5 font-medium">
              Heart Notes (Main Character)
            </label>
            <Input
              type="text"
              value={formData.heartNotes}
              onChange={(e) => setFormData({ ...formData, heartNotes: e.target.value })}
              placeholder="e.g. Tuscan Leather, Black Pepper, Cedarwood, Jasmine"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              The persistent core character that emerges after the top notes settle (lasts ~1 to 6 hours). Separate with commas.
            </p>
          </div>

          {/* Base Notes */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#BFA27A] mb-1.5 font-medium">
              Base Notes (Lasting Trail)
            </label>
            <Input
              type="text"
              value={formData.baseNotes}
              onChange={(e) => setFormData({ ...formData, baseNotes: e.target.value })}
              placeholder="e.g. Sandalwood, Amber Resins, Musk, Aged Oud"
            />
            <p className="text-[11px] text-[#777169] mt-1.5 font-light leading-relaxed">
              The deeper, richer scents that remain the longest on skin and clothing (lasts 6 to 14+ hours). Separate with commas.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: FRAGRANCE RECOMMENDATION PROFILE */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-6 rounded-sm">
        <div className="pb-3 border-b border-[rgba(242,238,231,0.06)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#BFA27A]" />
              <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal">
                4. Fragrance Recommendation Profile
              </h2>
            </div>
            <p className="text-xs font-sans text-[#777169] mt-0.5">
              Olfactive profiling attributes used for fragrance discovery and catalog curation.
            </p>
          </div>
          <span className="text-[10px] uppercase font-sans tracking-[0.16em] px-2.5 py-1 rounded-sm bg-[#BFA27A]/10 text-[#BFA27A] border border-[#BFA27A]/30 self-start sm:self-auto font-medium">
            Recommendation Metadata
          </span>
        </div>

        <div className="space-y-6 font-sans text-xs">
          {/* 1. SCENT FAMILIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] font-medium">
                Scent Families <span className="text-[10px] text-[#777169] font-normal lowercase">(select all that apply)</span>
              </label>
              <span className="text-[10px] text-[#BFA27A] font-medium">
                {formData.fragranceProfile?.scentFamilies?.length || 0} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {SCENT_FAMILY_OPTIONS.map((opt) => {
                const isSelected = formData.fragranceProfile?.scentFamilies?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleProfileArray("scentFamilies", opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.1em] transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[#BFA27A] ${
                      isSelected
                        ? "bg-[#BFA27A]/15 text-[#F2EEE7] border border-[#BFA27A] shadow-[0_0_12px_rgba(191,162,122,0.18)] font-medium"
                        : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A]/40 hover:text-[#F2EEE7]"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${
                      isSelected ? "bg-[#BFA27A] border-[#BFA27A] text-[#0D0D0C]" : "border-white/20 bg-transparent"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. INTENSITY */}
          <div className="space-y-2 pt-2 border-t border-[rgba(242,238,231,0.04)]">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] font-medium">
                Intensity & Sillage <span className="text-[10px] text-[#777169] font-normal lowercase">(single choice)</span>
              </label>
              {formData.fragranceProfile?.intensity && (
                <button
                  type="button"
                  onClick={() => handleSelectIntensity(formData.fragranceProfile.intensity)}
                  className="text-[10px] text-[#777169] hover:text-[#BFA27A] underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {INTENSITY_OPTIONS.map((opt) => {
                const isSelected = formData.fragranceProfile?.intensity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectIntensity(opt.value)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 focus:outline-none focus:ring-1 focus:ring-[#BFA27A] ${
                      isSelected
                        ? "bg-[#181714] border-[#BFA27A] shadow-[0_0_15px_rgba(191,162,122,0.15)] ring-1 ring-[#BFA27A]/40"
                        : "bg-[#0D0D0C] border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs uppercase tracking-wider font-medium ${
                        isSelected ? "text-[#BFA27A]" : "text-[#F2EEE7]"
                      }`}>
                        {opt.label}
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#BFA27A] bg-[#BFA27A]" : "border-white/20"
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0D0D0C]" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#777169] leading-relaxed">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. MOOD / VIBE */}
          <div className="space-y-2 pt-2 border-t border-[rgba(242,238,231,0.04)]">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] font-medium">
                Mood / Vibe <span className="text-[10px] text-[#777169] font-normal lowercase">(select all that match)</span>
              </label>
              <span className="text-[10px] text-[#BFA27A] font-medium">
                {formData.fragranceProfile?.moods?.length || 0} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {MOOD_OPTIONS.map((opt) => {
                const isSelected = formData.fragranceProfile?.moods?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleProfileArray("moods", opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.1em] transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[#BFA27A] ${
                      isSelected
                        ? "bg-[#BFA27A]/15 text-[#F2EEE7] border border-[#BFA27A] shadow-[0_0_12px_rgba(191,162,122,0.18)] font-medium"
                        : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A]/40 hover:text-[#F2EEE7]"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${
                      isSelected ? "bg-[#BFA27A] border-[#BFA27A] text-[#0D0D0C]" : "border-white/20 bg-transparent"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. OCCASIONS */}
          <div className="space-y-2 pt-2 border-t border-[rgba(242,238,231,0.04)]">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] font-medium">
                Best Occasions <span className="text-[10px] text-[#777169] font-normal lowercase">(select all that match)</span>
              </label>
              <span className="text-[10px] text-[#BFA27A] font-medium">
                {formData.fragranceProfile?.occasions?.length || 0} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {OCCASION_OPTIONS.map((opt) => {
                const isSelected = formData.fragranceProfile?.occasions?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleProfileArray("occasions", opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.1em] transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[#BFA27A] ${
                      isSelected
                        ? "bg-[#BFA27A]/15 text-[#F2EEE7] border border-[#BFA27A] shadow-[0_0_12px_rgba(191,162,122,0.18)] font-medium"
                        : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A]/40 hover:text-[#F2EEE7]"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${
                      isSelected ? "bg-[#BFA27A] border-[#BFA27A] text-[#0D0D0C]" : "border-white/20 bg-transparent"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. SEASONS */}
          <div className="space-y-2 pt-2 border-t border-[rgba(242,238,231,0.04)]">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] font-medium">
                Ideal Seasons <span className="text-[10px] text-[#777169] font-normal lowercase">(select all that match)</span>
              </label>
              <span className="text-[10px] text-[#BFA27A] font-medium">
                {formData.fragranceProfile?.seasons?.length || 0} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {SEASON_OPTIONS.map((opt) => {
                const isSelected = formData.fragranceProfile?.seasons?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleProfileArray("seasons", opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs uppercase tracking-[0.1em] transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[#BFA27A] ${
                      isSelected
                        ? "bg-[#BFA27A]/15 text-[#F2EEE7] border border-[#BFA27A] shadow-[0_0_12px_rgba(191,162,122,0.18)] font-medium"
                        : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A]/40 hover:text-[#F2EEE7]"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${
                      isSelected ? "bg-[#BFA27A] border-[#BFA27A] text-[#0D0D0C]" : "border-white/20 bg-transparent"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: BOTTLE SIZES & PRICING */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)] gap-2">
          <div>
            <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal">
              5. Bottle Sizes & Pricing
            </h2>
            <p className="text-xs font-sans text-[#777169] mt-0.5">
              Add the bottle sizes you want customers to be able to purchase. Each row represents a bottle size with its own price and available stock.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddVariant}
            className="flex items-center space-x-1.5 text-xs font-sans uppercase tracking-[0.14em] text-[#BFA27A] hover:text-[#F2EEE7] transition-colors cursor-pointer self-start sm:self-auto font-medium min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Bottle Size</span>
          </button>
        </div>

        {/* Base Default Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 p-4 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] text-xs font-sans rounded-sm">
          {/* Main Display Selling Price */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AAA49B] mb-1.5 font-medium">
              Selling Price (PKR) <span className="text-[#BFA27A]">*</span>
            </label>
            <Input
              type="number"
              min="0"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <p className="text-[11px] text-[#777169] mt-1 font-light">
              Authoritative starting price charged at checkout.
            </p>
          </div>

          {/* Main Display Compare-at Price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-[#AAA49B] font-medium">
                Compare-at Price (PKR)
              </label>
              {calculateDiscountPercent(formData.compare_at_price, formData.price) > 0 && (
                <span className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BFA27A] bg-[#BFA27A]/15 border border-[#BFA27A]/30 px-1.5 py-0.2 rounded-sm font-sans">
                  {calculateDiscountPercent(formData.compare_at_price, formData.price)}% OFF
                </span>
              )}
            </div>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 3499 (optional original)"
              value={formData.compare_at_price ?? ""}
              onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
            />
            <p className="text-[11px] text-[#777169] mt-1 font-light">
              Original price shown crossed out (leave blank if no discount).
            </p>
          </div>

          {/* Total Available Stock */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-[#AAA49B] font-medium">
                Total Stock Units <span className="text-[#BFA27A]">*</span>
              </label>
              {variants.length > 0 && (
                <span className="text-[9.5px] uppercase tracking-wider text-[#BFA27A] font-sans">
                  Auto-derived
                </span>
              )}
            </div>
            <Input
              type="number"
              min="0"
              required
              readOnly={variants.length > 0}
              value={
                variants.length > 0
                  ? variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0)
                  : formData.stock_quantity
              }
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              className={variants.length > 0 ? "opacity-80 bg-[#161513] cursor-not-allowed" : ""}
            />
            <p className="text-[11px] text-[#777169] mt-1 font-light">
              Total bottles available in atelier storage.
            </p>
          </div>
        </div>

        {/* Dynamic Size Variants List */}
        <div className="space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between">
            <span className="block text-[10px] uppercase tracking-wider text-[#777169] font-medium">
              Configured Bottle Sizes ({variants.length})
            </span>
            <span className="text-[10px] text-[#777169] font-light hidden sm:inline">
              Each size has its own selling price, compare-at price, and stock.
            </span>
          </div>

          {variants.map((v, idx) => {
            const stockNum = Number(v.stock_quantity) || 0;
            const stockTier =
              stockNum <= 0
                ? { label: "Out of Stock (0)", badgeClass: "bg-rose-950/40 text-rose-400 border-rose-500/30" }
                : stockNum <= 5
                ? { label: `Low Stock (${stockNum})`, badgeClass: "bg-amber-950/40 text-amber-400 border-amber-500/30" }
                : { label: `In Stock (${stockNum})`, badgeClass: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" };

            const discount = calculateDiscountPercent(v.compare_at_price, v.price);

            return (
              <div
                key={v.id || idx}
                className="p-4 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] rounded-sm space-y-3"
              >
                {/* Header row on mobile / desktop indicator */}
                <div className="flex items-center justify-between pb-2 border-b border-[rgba(242,238,231,0.04)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-[#BFA27A] uppercase tracking-wider">
                      Size #{idx + 1} ({v.size || "Variant"})
                    </span>
                    {discount > 0 && (
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 border rounded-sm font-semibold bg-[#BFA27A]/15 text-[#BFA27A] border-[#BFA27A]/30">
                        {discount}% OFF
                      </span>
                    )}
                    <span
                      className={`text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 border rounded-sm ${stockTier.badgeClass}`}
                    >
                      {stockTier.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="p-2 text-[#777169] hover:text-rose-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Remove this bottle size"
                    aria-label={`Remove bottle size ${v.size || idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Input fields */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  {/* Bottle Size */}
                  <div className="sm:col-span-2">
                    <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Bottle Size
                    </label>
                    <Input
                      type="text"
                      size="compact"
                      surface="elevated"
                      value={v.size}
                      onChange={(e) => handleVariantChange(idx, "size", e.target.value)}
                      placeholder="e.g. 50ml"
                    />
                  </div>

                  {/* Volume Spec */}
                  <div className="sm:col-span-3">
                    <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Volume Spec
                    </label>
                    <Input
                      type="text"
                      size="compact"
                      surface="elevated"
                      value={v.volume || ""}
                      onChange={(e) => handleVariantChange(idx, "volume", e.target.value)}
                      placeholder="e.g. 50ml / 1.7 FL. OZ."
                    />
                  </div>

                  {/* Compare-at Price PKR */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] font-medium truncate">
                        Compare-at
                      </label>
                      {discount > 0 && (
                        <span className="text-[8px] uppercase tracking-wider text-[#BFA27A] font-semibold">
                          {discount}%
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      size="compact"
                      surface="elevated"
                      placeholder="e.g. 3499"
                      value={v.compare_at_price ?? ""}
                      onChange={(e) => handleVariantChange(idx, "compare_at_price", e.target.value)}
                    />
                  </div>

                  {/* Sale Price PKR */}
                  <div className="sm:col-span-2">
                    <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] mb-1 font-medium truncate">
                      Sale Price (PKR)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      size="compact"
                      surface="elevated"
                      value={v.price}
                      onChange={(e) => handleVariantChange(idx, "price", e.target.value)}
                    />
                  </div>

                  {/* Stock Units */}
                  <div className="sm:col-span-3">
                    <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Stock Units
                    </label>
                    <Input
                      type="number"
                      min="0"
                      size="compact"
                      surface="elevated"
                      value={v.stock_quantity}
                      onChange={(e) => handleVariantChange(idx, "stock_quantity", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 6: PRODUCT IMAGES & GALLERY */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-6 rounded-sm">
        <div className="pb-3 border-b border-[rgba(242,238,231,0.06)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal flex items-center gap-2">
              <span>6. Product Gallery & Images</span>
              <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30">
                {images.length} {images.length === 1 ? "Image" : "Images"}
              </span>
            </h2>
            <p className="text-xs font-sans text-[#777169] mt-0.5">
              Upload multiple photos for this fragrance (front bottle, angles, lifestyle imagery). The first image acts as the primary cover photo.
            </p>
          </div>
        </div>

        {/* Upload Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-xs font-sans">
          {/* File Upload to Supabase Storage */}
          <div className="md:col-span-7">
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-2 font-medium">
              Upload Images from Device (Supports Multiple)
            </label>
            <label className="flex flex-col items-center justify-center space-y-2 border border-dashed border-[rgba(242,238,231,0.2)] p-6 bg-[#0D0D0C] rounded-xl hover:border-[#BFA27A] transition-colors cursor-pointer text-[#AAA49B] hover:text-[#F2EEE7] text-center min-h-[130px]">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-6 h-6 text-[#BFA27A] animate-spin" />
                  <span className="text-xs uppercase tracking-wider font-medium text-[#F2EEE7]">
                    Uploading images to Atelier Storage...
                  </span>
                  <span className="text-[11px] text-[#777169]">
                    Processing and generating unique storage paths...
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[#BFA27A]" />
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Click to select 1, 2, 3 or more photos
                  </span>
                  <span className="text-[11px] text-[#777169] font-light">
                    Hold Ctrl / Shift to select multiple images (JPG, PNG, WebP • Max 5MB each)
                  </span>
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Direct Web Image Link */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Or Add via Direct Web URL
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={webImageUrl}
                onChange={(e) => setWebImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddWebImageUrl();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddWebImageUrl}
                className="px-3.5 py-2 bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] font-medium text-xs tracking-wider uppercase rounded-sm transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            <p className="text-[11px] text-[#777169] font-light leading-relaxed">
              Paste an external image link and click Add to append it to the gallery.
            </p>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] font-medium">
              Configured Image Gallery ({images.length})
            </span>
            <span className="text-[11px] text-[#777169]">
              {images.length > 0 ? "First image is primary • Click 'Make Primary' to reorder" : "No images yet"}
            </span>
          </div>

          {images.length === 0 ? (
            <div className="bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] rounded-sm p-8 text-center text-[#777169]">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#BFA27A]" />
              <p className="text-xs uppercase tracking-wider font-medium text-[#AAA49B] mb-1">
                No product photos attached
              </p>
              <p className="text-[11px] font-light">
                Select 1 or more images above to build this product's gallery.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, idx) => {
                const isPrimary = idx === 0;
                return (
                  <div
                    key={img.id || img.public_url || idx}
                    className={`relative group bg-[#0D0D0C] border rounded-sm overflow-hidden flex flex-col transition-all duration-200 ${
                      isPrimary
                        ? "border-[#BFA27A] shadow-[0_0_15px_rgba(191,162,122,0.15)] ring-1 ring-[#BFA27A]/40"
                        : "border-[rgba(242,238,231,0.08)] hover:border-[rgba(242,238,231,0.2)]"
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-[4/5] bg-[#121110] overflow-hidden">
                      <img
                        src={img.public_url}
                        alt={`Product preview ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80";
                        }}
                      />

                      {/* Top Badges & Action Buttons */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
                        <span className="bg-black/80 backdrop-blur-sm text-white/90 text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1 pointer-events-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenCropForExistingImage(idx)}
                            className="p-1.5 bg-black/80 hover:bg-[#BFA27A] text-[#AAA49B] hover:text-[#0D0D0C] rounded-sm border border-white/10 transition-colors cursor-pointer shadow-sm"
                            title="Crop & Position image framing"
                            aria-label={`Crop and frame image ${idx + 1}`}
                          >
                            <Crop className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 bg-black/80 hover:bg-rose-950/90 text-[#AAA49B] hover:text-rose-400 rounded-sm border border-white/10 transition-colors cursor-pointer shadow-sm"
                            title="Remove image"
                            aria-label={`Remove image ${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Center Adjust Framing hover action */}
                      <button
                        type="button"
                        onClick={() => handleOpenCropForExistingImage(idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-center p-2 cursor-pointer z-10"
                        title="Adjust visual crop & composition"
                      >
                        <div className="p-2 rounded-full bg-[#BFA27A] text-[#0D0D0C] shadow-lg transform group-hover:scale-110 transition-transform">
                          <Crop className="w-4 h-4" />
                        </div>
                        <span className="text-[9.5px] uppercase font-sans tracking-widest text-[#F2EEE7] font-medium drop-shadow">
                          Adjust Framing
                        </span>
                      </button>

                      {/* Primary badge tag */}
                      {isPrimary && (
                        <div className="absolute bottom-2 left-2 right-2 bg-[#BFA27A] text-[#0D0D0C] px-2 py-1 rounded-sm text-[9.5px] uppercase tracking-wider font-semibold flex items-center justify-center gap-1 shadow-md z-20 pointer-events-none">
                          <Star className="w-3 h-3 fill-current" />
                          <span>Primary Cover</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-2 bg-[#121110] border-t border-[rgba(242,238,231,0.04)] flex items-center justify-between text-[10px]">
                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          className="w-full py-1 text-center text-[#BFA27A] hover:text-[#F2EEE7] hover:bg-[#BFA27A]/15 rounded transition-colors uppercase tracking-wider font-medium cursor-pointer"
                        >
                          Set as Primary
                        </button>
                      ) : (
                        <span className="w-full text-center text-[#777169] py-1 uppercase tracking-widest font-mono text-[9px]">
                          Storefront Cover
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 7: PRODUCT STATUS & AVAILABILITY */}
      <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm">
        <div className="pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <h2 className="font-serif text-lg sm:text-xl lg:text-2xl text-[#F2EEE7] font-normal">
            7. Product Status & Visibility
          </h2>
          <p className="text-xs font-sans text-[#777169] mt-0.5">
            Controls whether customers can currently see and purchase this fragrance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-xs font-sans">
          {/* Status Dropdown */}
          <div className="md:col-span-1">
            <label className="block text-[10.5px] uppercase tracking-[0.16em] text-[#AAA49B] mb-1.5 font-medium">
              Product Status <span className="text-[#BFA27A]">*</span>
            </label>
            <CustomSelect
              value={formData.status || (formData.is_active === false ? "inactive" : (Number(formData.stock_quantity) === 0 ? "out_of_stock" : "active"))}
              onChange={(val) => {
                setFormData((prev) => ({
                  ...prev,
                  status: val,
                  is_active: val !== "inactive",
                  stock_quantity: val === "out_of_stock" ? 0 : (Number(prev.stock_quantity) === 0 ? 50 : prev.stock_quantity),
                }));
              }}
              options={[
                { value: "active", label: "Active (Available to buy)" },
                { value: "out_of_stock", label: "Out of Stock (Visible, disabled)" },
                { value: "inactive", label: "Inactive (Hidden completely)" },
              ]}
            />
          </div>

          {/* Status Explanation Callouts */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className={`p-3.5 border rounded-lg transition-colors ${
                formData.status === "active"
                  ? "bg-[#181714] border-[#BFA27A]/50 text-[#F2EEE7]"
                  : "bg-[#0D0D0C] border-[rgba(242,238,231,0.04)] text-[#777169]"
              }`}
            >
              <p className="font-medium text-xs mb-1 text-emerald-300">Active</p>
              <p className="text-[11px] leading-relaxed">
                Visible on the website and customers can freely add to cart and checkout.
              </p>
            </div>

            <div
              className={`p-3.5 border rounded-lg transition-colors ${
                formData.status === "out_of_stock"
                  ? "bg-[#181714] border-amber-500/50 text-[#F2EEE7]"
                  : "bg-[#0D0D0C] border-[rgba(242,238,231,0.04)] text-[#777169]"
              }`}
            >
              <p className="font-medium text-xs mb-1 text-amber-300">Out of Stock</p>
              <p className="text-[11px] leading-relaxed">
                Visible on the website with an 'Out of Stock' badge. Ordering buttons are disabled.
              </p>
            </div>

            <div
              className={`p-3.5 border rounded-lg transition-colors ${
                formData.status === "inactive"
                  ? "bg-[#181714] border-rose-500/50 text-[#F2EEE7]"
                  : "bg-[#0D0D0C] border-[rgba(242,238,231,0.04)] text-[#777169]"
              }`}
            >
              <p className="font-medium text-xs mb-1 text-rose-300">Inactive</p>
              <p className="text-[11px] leading-relaxed">
                Completely hidden from customer storefront, catalog, and live search.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DANGER ZONE (EXISTING PRODUCT ONLY) */}
      {isEditing && (
        <div className="bg-[#121110] p-4 sm:p-6 lg:p-8 border border-rose-900/40 rounded-sm space-y-4">
          <div className="pb-3 border-b border-rose-950/50 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg sm:text-xl text-rose-300 font-normal">
                Danger Zone
              </h2>
              <p className="text-xs text-[#777169] mt-0.5 font-sans">
                Irreversible catalog modification
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-rose-950/60 text-rose-400 border border-rose-500/30">
              Caution
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 font-sans">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-[#F2EEE7]">
                Permanently delete this fragrance
              </h4>
              <p className="text-xs text-[#AAA49B] max-w-xl leading-relaxed">
                Once deleted, this fragrance formulation, all associated sizing variants, and gallery images will be removed from your atelier store. This action cannot be reversed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeleteModalError("");
                setShowDeleteModal(true);
              }}
              className="px-5 py-2.5 bg-rose-950/30 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 hover:text-white text-xs uppercase font-sans tracking-[0.18em] font-medium transition-all shrink-0 flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE FRAGRANCE</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. BOTTOM SUBMISSION BAR */}
      <div className="bg-[#121110] p-4 sm:p-6 border border-[rgba(242,238,231,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs rounded-sm">
        <Link
          to="/admin/products"
          className="text-[11px] uppercase tracking-wider text-[#AAA49B] hover:text-[#BFA27A] transition-colors py-2"
        >
          ← Cancel and Return to Catalog
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto bg-[#F2EEE7] text-[#0D0D0C] border border-[#F2EEE7] hover:bg-[#BFA27A] hover:border-[#BFA27A] hover:text-[#0D0D0C] px-8 py-3.5 text-xs uppercase font-sans tracking-[0.2em] transition-all flex items-center justify-center space-x-2 cursor-pointer font-medium disabled:opacity-40 shadow-lg min-h-[44px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0D0D0C]" />
              <span>SAVING PRODUCT...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? "SAVE CHANGES" : "PUBLISH FRAGRANCE"}</span>
            </>
          )}
        </button>
      </div>
    </form>

    {/* DELETE CONFIRMATION MODAL */}
    <AnimatePresence>
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isDeleting) setShowDeleteModal(false);
            }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#141311] border border-[rgba(242,238,231,0.12)] p-6 sm:p-7 shadow-2xl rounded-sm z-10 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-[#F2EEE7] font-normal">
                    Delete Fragrance
                  </h3>
                  <p className="text-[11px] text-[#777169] uppercase tracking-wider font-sans">
                    Permanent Catalog Removal
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 text-[#AAA49B] hover:text-[#F2EEE7] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Snippet */}
            <div className="flex items-center space-x-3 p-3 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] rounded-sm">
              <div className="w-12 h-14 bg-[#181714] border border-[rgba(242,238,231,0.08)] overflow-hidden shrink-0">
                <img
                  src={formData.primary_image || (images[0]?.public_url)}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base text-[#F2EEE7] truncate">
                  {formData.name || "Untitled Fragrance"}
                </p>
                <p className="text-[11px] font-mono text-[#AAA49B] truncate">
                  /{formData.slug} • PKR {Number(formData.price || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs font-sans text-[#AAA49B] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#F2EEE7]">{formData.name}</strong>? This action will permanently remove this fragrance, all its bottle size variants, and gallery images from your storefront. This cannot be undone.
            </p>

            {deleteModalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded-sm">
                {deleteModalError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 text-xs uppercase font-sans tracking-[0.16em] text-[#AAA49B] hover:text-[#F2EEE7] border border-[rgba(242,238,231,0.1)] transition-colors min-h-[42px] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProduct}
                className="px-5 py-2.5 text-xs uppercase font-sans tracking-[0.18em] bg-rose-900/80 hover:bg-rose-800 text-white border border-rose-500/60 flex items-center space-x-2 font-medium transition-all shadow-lg min-h-[42px] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DELETE FRAGRANCE</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* IMAGE CROP & POSITIONING MODAL */}
    <ImageCropModal
      isOpen={cropModalOpen}
      onClose={handleCloseCropModal}
      imageSource={cropQueue[cropQueueIndex]?.file}
      imageFileName={cropQueue[cropQueueIndex]?.fileName}
      productName={formData.name || "Crafted Fragrance"}
      productSubtitle={formData.subtitle || "Extrait de Parfum"}
      productPrice={formData.price || 12500}
      queueIndex={cropQueueIndex}
      queueTotal={cropQueue.length}
      onApplyCrop={handleApplyCrop}
      isProcessing={isCropUploading}
    />
    </>
  );
}
