import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://scente.pk";
const DEFAULT_TITLE = "SCENTÉ — Haute Parfumerie | Extraits de Parfum";
const DEFAULT_DESCRIPTION =
  "SCENTÉ is a luxury niche fragrance atelier crafting rare Extraits de Parfum with 30%+ pure perfume oils. Complimentary express delivery across Pakistan with Cash on Delivery.";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85";

/**
 * Helper to update or create an HTML head meta tag
 */
function setMetaTag(name, content, isProperty = false) {
  if (!content) return;
  const attribute = isProperty ? "property" : "name";
  let tag = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Helper to update or create the canonical link tag
 */
function setCanonical(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

/**
 * Comprehensive SEO and Head Management Component
 */
export default function SEO({
  title,
  description,
  keywords,
  canonical,
  canonicalUrl,
  image,
  ogImage,
  ogType = "website",
  noindex = false,
  productData,
  structuredData,
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. Resolve values
    const fullTitle = title
      ? title.includes("SCENTÉ")
        ? title
        : `${title} | SCENTÉ — Haute Parfumerie`
      : DEFAULT_TITLE;

    const fullDescription = description || DEFAULT_DESCRIPTION;

    const rawCanonical = canonical || canonicalUrl;
    const resolvedCanonical = rawCanonical
      ? rawCanonical.startsWith("http")
        ? rawCanonical
        : `${BASE_URL}${rawCanonical.startsWith("/") ? "" : "/"}${rawCanonical}`
      : `${BASE_URL}${location.pathname}`;

    const rawImage = image || ogImage;
    const resolvedImage = rawImage
      ? rawImage.startsWith("http")
        ? rawImage
        : `${BASE_URL}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
      : DEFAULT_IMAGE;

    // 2. Document Title
    document.title = fullTitle;

    // 3. Standard Meta
    setMetaTag("description", fullDescription);
    if (keywords) {
      const keywordsStr = Array.isArray(keywords) ? keywords.join(", ") : keywords;
      setMetaTag("keywords", keywordsStr);
    }
    setMetaTag("robots", noindex ? "noindex, nofollow" : "index, follow");

    // 4. Canonical Link
    setCanonical(resolvedCanonical);

    // 5. Open Graph Meta
    setMetaTag("og:title", fullTitle, true);
    setMetaTag("og:description", fullDescription, true);
    setMetaTag("og:url", resolvedCanonical, true);
    setMetaTag("og:image", resolvedImage, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:site_name", "SCENTÉ Parfums", true);
    setMetaTag("og:locale", "en_US", true);

    // 6. Twitter Card Meta
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", fullTitle);
    setMetaTag("twitter:description", fullDescription);
    setMetaTag("twitter:image", resolvedImage);

    // 7. Product Open Graph Extensions
    if (ogType === "product" && productData) {
      if (productData.price) {
        setMetaTag("product:price:amount", String(productData.price), true);
        setMetaTag("product:price:currency", productData.currency || "PKR", true);
      }
      const isAvailable =
        productData.inStock !== false && productData.availability !== "out_of_stock";
      setMetaTag("product:availability", isAvailable ? "instock" : "oos", true);
    }

    // 8. Structured Data (JSON-LD)
    const scriptId = "scente-structured-data";
    let scriptTag = document.getElementById(scriptId);

    const resolvedStructuredData =
      structuredData ||
      (ogType === "product" && productData
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: productData.name,
            image: resolvedImage,
            description: fullDescription,
            sku: productData.sku || "SCENTE-PARFUM",
            brand: {
              "@type": "Brand",
              name: "SCENTÉ",
            },
            offers: {
              "@type": "Offer",
              url: resolvedCanonical,
              priceCurrency: productData.currency || "PKR",
              price: productData.price || 0,
              availability:
                productData.inStock !== false && productData.availability !== "out_of_stock"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
            },
          }
        : null);

    if (resolvedStructuredData) {
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = scriptId;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(resolvedStructuredData);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [
    title,
    description,
    keywords,
    canonical,
    canonicalUrl,
    image,
    ogImage,
    ogType,
    noindex,
    productData,
    structuredData,
    location.pathname,
  ]);

  return null;
}
