import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct } from "./products.js";
import { AUDIENCES, SHOP_CATEGORIES } from "../data/products.js";

test("1. SHOP_CATEGORIES and AUDIENCES taxonomy completeness", () => {
  const ids = SHOP_CATEGORIES.map((c) => c.id);
  assert.deepEqual(ids, ["men", "women", "unisex", "waxes", "testers"]);

  const audienceIds = AUDIENCES.map((c) => c.id);
  assert.ok(audienceIds.includes("waxes"));
  assert.ok(audienceIds.includes("testers"));
  assert.ok(audienceIds.includes("men"));
  assert.ok(audienceIds.includes("women"));
  assert.ok(audienceIds.includes("unisex"));
});

test("2. Normalizes wax product with category-appropriate defaults", () => {
  const rawWax = {
    id: "wax-nocturne",
    slug: "wax-nocturne",
    name: "NOCTURNE WAX MELT",
    family: "waxes",
    price: 3500,
  };

  const normalized = normalizeProduct(rawWax);
  assert.equal(normalized.family, "waxes");
  assert.equal(normalized.subtitle, "Artisan Scented Wax");
  assert.equal(normalized.concentration, "Pure Scented Wax");
  assert.equal(normalized.volume, "100g / 3.5 OZ.");
});

test("3. Normalizes tester product with category-appropriate defaults", () => {
  const rawTester = {
    id: "tester-noir",
    slug: "tester-noir",
    name: "SCENTE NOIR TESTER",
    family: "testers",
    price: 1500,
  };

  const normalized = normalizeProduct(rawTester);
  assert.equal(normalized.family, "testers");
  assert.equal(normalized.subtitle, "Discovery Tester");
  assert.equal(normalized.concentration, "Atelier Tester Vial");
  assert.equal(normalized.volume, "5ml / 0.17 FL. OZ.");
});

test("4. Normalizes perfume with standard Extrait defaults preserved", () => {
  const rawPerfume = {
    id: "scente-noir",
    slug: "scente-noir",
    name: "SCENTE NOIR",
    family: "men",
    price: 12500,
  };

  const normalized = normalizeProduct(rawPerfume);
  assert.equal(normalized.family, "men");
  assert.equal(normalized.subtitle, "Extrait de Parfum");
  assert.equal(normalized.concentration, "30% Pure Perfume Oil");
  assert.equal(normalized.volume, "50ml / 1.7 FL. OZ.");
});

test("5. Category filter logic correctly segregates Waxes, Testers, and Fragrances", () => {
  const mockCatalog = [
    { id: "1", name: "Alpha", family: "men", description: "masculine woody" },
    { id: "2", name: "Beta", family: "women", description: "feminine floral" },
    { id: "3", name: "Gamma", family: "unisex", description: "clean musk" },
    { id: "4", name: "Delta Wax", family: "waxes", description: "artisan wax melt" },
    { id: "5", name: "Epsilon Tester", family: "testers", description: "5ml tester vial" },
  ];

  const filterFn = (cat, product) => {
    if (cat === "all") return true;
    const pFamily = (product.family || "").toLowerCase();
    const pAudience = (product.audience || "").toLowerCase();
    const pFamilies = Array.isArray(product.families)
      ? product.families.map((f) => String(f).toLowerCase())
      : [];
    const pDesc = (product.description || "").toLowerCase();

    if (cat === "waxes") {
      return (
        pFamily === "waxes" ||
        pFamily === "wax" ||
        pAudience === "waxes" ||
        pAudience === "wax" ||
        pFamilies.includes("waxes") ||
        pFamilies.includes("wax")
      );
    }

    if (cat === "testers") {
      return (
        pFamily === "testers" ||
        pFamily === "tester" ||
        pAudience === "testers" ||
        pAudience === "tester" ||
        pFamilies.includes("testers") ||
        pFamilies.includes("tester")
      );
    }

    const isWaxOrTester =
      pFamily === "waxes" ||
      pFamily === "wax" ||
      pFamily === "testers" ||
      pFamily === "tester" ||
      pFamilies.includes("waxes") ||
      pFamilies.includes("wax") ||
      pFamilies.includes("testers") ||
      pFamilies.includes("tester");

    if (isWaxOrTester) return false;

    if (pFamily === cat || pAudience === cat || pFamilies.includes(cat)) {
      return true;
    }

    if (cat === "men") {
      if (pFamily === "woody" || pFamilies.includes("woody")) return true;
      if (pDesc.includes("masculine") || pDesc.includes("for men")) return true;
    } else if (cat === "women") {
      if (pFamily === "floral" || pFamilies.includes("floral")) return true;
      if (pDesc.includes("feminine") || pDesc.includes("for women")) return true;
    } else if (cat === "unisex") {
      if (["amber", "musk", "fresh"].includes(pFamily) || pFamilies.some((f) => ["amber", "musk", "fresh"].includes(f))) return true;
      if (pDesc.includes("unisex")) return true;
    }

    return false;
  };

  const waxesOnly = mockCatalog.filter((p) => filterFn("waxes", p));
  assert.deepEqual(waxesOnly.map((p) => p.id), ["4"]);

  const testersOnly = mockCatalog.filter((p) => filterFn("testers", p));
  assert.deepEqual(testersOnly.map((p) => p.id), ["5"]);

  const menOnly = mockCatalog.filter((p) => filterFn("men", p));
  assert.deepEqual(menOnly.map((p) => p.id), ["1"]);

  const womenOnly = mockCatalog.filter((p) => filterFn("women", p));
  assert.deepEqual(womenOnly.map((p) => p.id), ["2"]);

  const unisexOnly = mockCatalog.filter((p) => filterFn("unisex", p));
  assert.deepEqual(unisexOnly.map((p) => p.id), ["3"]);

  const all = mockCatalog.filter((p) => filterFn("all", p));
  assert.equal(all.length, 5);
});
