/**
 * Centralized Delivery & Shipping Configuration for SCENTÉ
 */
export const DELIVERY_CONFIG = {
  fee: 0, // Complimentary air express delivery across Pakistan
  currency: "PKR",
  isComplimentary: true,
  estimatedDeliveryWindow: "24–48 Hours",
  eligibleCities: "All major cities & nationwide districts",
  insured: true,
  paymentMethodsSupported: ["cod"], // Cash on Delivery only
};

export const formatPrice = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) return "PKR 0";
  return `PKR ${amount.toLocaleString()}`;
};
