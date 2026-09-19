import React, { createContext, useContext, useState, useEffect } from "react";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("scente_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("scente_wishlist", JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "scente_wishlist") {
        try {
          setWishlist(JSON.parse(e.newValue || "[]"));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleWishlist = (id) => {
    setWishlist((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const isInWishlist = (id) => wishlist.includes(id);

  const removeFromWishlist = (id) => {
    setWishlist((prev) => prev.filter((item) => item !== id));
  };

  const clearWishlist = () => setWishlist([]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    // Fallback gracefully if used outside provider
    return {
      wishlist: [],
      wishlistCount: 0,
      toggleWishlist: () => {},
      isInWishlist: () => false,
      removeFromWishlist: () => {},
      clearWishlist: () => {},
    };
  }
  return context;
}
