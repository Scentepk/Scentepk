import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSmoothScroll } from "../context/SmoothScrollProvider";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Shield,
  Mail,
  Sparkles,
  ChevronRight,
  Tag,
  Image as ImageIcon,
  Star,
  FlaskConical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUnreadInquiriesCount } from "../services/inquiries";

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const { lenis } = useSmoothScroll();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const [isDesktopFocused, setIsDesktopFocused] = useState(false);
  const location = useLocation();

  const isExpanded = isDesktopHovered || isDesktopFocused;

  // Close mobile navigation drawer and collapse desktop sidebar whenever route changes
  useEffect(() => {
    setMobileNavOpen(false);
    setIsDesktopFocused(false);
    setIsDesktopHovered(false);
  }, [location.pathname]);

  // Fetch live unread inquiries count
  useEffect(() => {
    async function fetchUnread() {
      try {
        const count = await getUnreadInquiriesCount();
        setUnreadCount(count);
      } catch (e) {
        // Silently fallback if offline
      }
    }
    fetchUnread();
  }, [location.pathname]);

  // Handle drawer open/close scroll lock & Lenis synchronization
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
    } else {
      document.body.style.overflow = "";
      if (lenis) lenis.start();
    }
    return () => {
      document.body.style.overflow = "";
      if (lenis) lenis.start();
    };
  }, [mobileNavOpen, lenis]);

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Hero Section",
      path: "/admin/hero",
      icon: Sparkles,
    },
    {
      name: "Editorial Banner",
      path: "/admin/editorial-banner",
      icon: ImageIcon,
    },
    {
      name: "Products",
      path: "/admin/products",
      icon: Package,
    },
    {
      name: "Custom Builder",
      path: "/admin/custom-builder",
      icon: FlaskConical,
    },
    {
      name: "Promo Codes",
      path: "/admin/promo-codes",
      icon: Tag,
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      name: "Reviews",
      path: "/admin/reviews",
      icon: Star,
    },
    {
      name: "Inquiries",
      path: "/admin/inquiries",
      icon: Mail,
      badge: unreadCount,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2EEE7] flex flex-col md:flex-row w-full relative">
      {/* 1. PERSISTENT DESKTOP / TABLET SIDEBAR (TRUE OVERLAY HOVER-EXPAND) */}
      <aside
        data-lenis-prevent
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => setIsDesktopHovered(false)}
        onFocusCapture={() => setIsDesktopFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDesktopFocused(false);
          }
        }}
        className={`hidden md:flex bg-[#121110] border-r border-[rgba(242,238,231,0.06)] flex-col justify-between shrink-0 h-screen fixed top-0 bottom-0 left-0 z-30 select-none transition-[width,box-shadow,padding] duration-250 ease-out overflow-hidden ${
          isExpanded
            ? "w-[260px] p-5 shadow-[8px_0_35px_rgba(0,0,0,0.7)]"
            : "w-[76px] px-2.5 py-5 shadow-none"
        }`}
        aria-label="Admin navigation sidebar"
      >
        <div className="flex-1 flex flex-col min-h-0 space-y-5">
          {/* Brand Wordmark (Pinned Top) */}
          <div className="pb-4 border-b border-[rgba(242,238,231,0.06)] shrink-0 overflow-hidden">
            <Link
              to="/admin"
              className="block focus:outline-none group"
              title="SCENTÉ Atelier Control Room"
              aria-label="SCENTÉ Atelier Control Room"
            >
              {isExpanded ? (
                <div className="transition-opacity duration-200">
                  <span className="font-serif text-2xl font-medium tracking-[0.24em] text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors block whitespace-nowrap">
                    SCENTÉPK
                  </span>
                  <span className="text-[8px] uppercase font-sans tracking-[0.32em] text-[#BFA27A] block font-medium whitespace-nowrap">
                    ATELIER CONTROL ROOM
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1 transition-opacity duration-200">
                  <span className="font-serif text-xl font-medium tracking-[0.18em] text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors block">
                    SC
                  </span>
                  <span className="text-[7.5px] uppercase font-sans tracking-[0.26em] text-[#BFA27A] block font-medium mt-0.5">
                    ADM
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation Links (Independently Scrollable if height is constrained) */}
          <nav
            data-lenis-prevent
            className="space-y-1.5 font-sans flex-1 overflow-y-auto overflow-x-hidden pr-0.5"
            aria-label="Admin desktop navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  title={!isExpanded ? item.name : undefined}
                  aria-label={item.name}
                  className={`flex items-center ${
                    isExpanded ? "justify-between px-3.5" : "justify-center px-0"
                  } py-2.5 text-xs uppercase tracking-[0.18em] transition-all duration-150 rounded-sm min-h-[44px] group relative ${
                    isActive
                      ? "bg-[#181714] text-[#F2EEE7] border-l-2 border-[#BFA27A] font-medium"
                      : "text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-[#161513]"
                  }`}
                >
                  <div className={`flex items-center ${isExpanded ? "space-x-3 min-w-0" : "justify-center w-full"}`}>
                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-[#BFA27A]" : "text-[#777169] group-hover:text-[#AAA49B]"}`} />
                      {!isExpanded && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#121110] animate-pulse" />
                      )}
                    </div>
                    {isExpanded && (
                      <span className="truncate whitespace-nowrap">{item.name}</span>
                    )}
                  </div>

                  {isExpanded && item.badge > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Admin Profile & Storefront Link (Pinned Bottom) */}
        <div className="space-y-3.5 pt-4 border-t border-[rgba(242,238,231,0.06)] font-sans shrink-0 overflow-hidden">
          {/* Storefront Link */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            title={!isExpanded ? "View Storefront" : undefined}
            aria-label="View Storefront"
            className={`flex items-center ${
              isExpanded ? "justify-between px-3" : "justify-center px-0"
            } py-2 text-[11px] uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors min-h-[40px] rounded-sm group`}
          >
            {isExpanded && <span className="whitespace-nowrap">View Storefront</span>}
            <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Admin User Card */}
          <div
            className={`p-2.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] flex items-center ${
              isExpanded ? "justify-between" : "justify-center"
            } rounded-sm overflow-hidden`}
          >
            {isExpanded ? (
              <>
                <div className="space-y-0.5 max-w-[160px] truncate mr-2">
                  <div className="flex items-center space-x-1.5">
                    <Shield className="w-3 h-3 text-[#BFA27A] shrink-0" />
                    <span className="text-[9px] uppercase tracking-wider text-[#BFA27A] font-medium">
                      {profile?.role || "ADMIN"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#F2EEE7] truncate" title={user?.email}>
                    {user?.email || "admin@scente-parfums.com"}
                  </p>
                </div>

                <button
                  onClick={signOut}
                  className="p-1.5 text-[#777169] hover:text-rose-400 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
                  title="Sign Out"
                  aria-label="Sign out of admin"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={signOut}
                className="p-2 text-[#777169] hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
                title={`Sign Out (${user?.email || "Admin"})`}
                aria-label="Sign out of admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP APP BAR (< 768px) */}
      <header className="md:hidden bg-[#121110] border-b border-[rgba(242,238,231,0.06)] h-16 px-4 flex items-center justify-between sticky top-0 z-30 w-full shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2.5 -ml-1 text-[#F2EEE7] hover:text-[#BFA27A] active:bg-[#181714] rounded-lg transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/admin" className="focus:outline-none">
            <span className="font-serif text-xl tracking-[0.2em] text-[#F2EEE7] block leading-none">
              SCENTÉ
            </span>
            <span className="text-[7.5px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] block mt-1 font-medium">
              CONTROL ROOM
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Link
              to="/admin/inquiries"
              className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-950/90 text-amber-300 border border-amber-500/40 flex items-center space-x-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{unreadCount}</span>
            </Link>
          )}

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[#AAA49B] hover:text-[#BFA27A] min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="View Storefront"
            aria-label="Open storefront in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* 3. MOBILE SLIDE-IN DRAWER & BACKDROP (< 768px) */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
              aria-hidden="true"
            />

            {/* Slide-out Sidebar Panel */}
            <motion.div
              data-lenis-prevent
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="relative w-[85%] max-w-xs bg-[#121110] border-r border-[rgba(242,238,231,0.08)] h-full flex flex-col justify-between p-6 shadow-2xl z-10 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Admin Mobile Navigation"
            >
              <div className="space-y-6">
                {/* Header in Drawer */}
                <div className="flex items-center justify-between pb-5 border-b border-[rgba(242,238,231,0.06)]">
                  <div>
                    <span className="font-serif text-2xl font-medium tracking-[0.2em] text-[#F2EEE7] block">
                      SCENTÉPK
                    </span>
                    <span className="text-[8px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] block font-medium mt-0.5">
                      ATELIER CONTROL
                    </span>
                  </div>

                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="p-2 -mr-2 text-[#AAA49B] hover:text-[#F2EEE7] rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nav Items */}
                <nav className="space-y-1 font-sans" aria-label="Mobile navigation links">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);

                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center justify-between px-4 py-3.5 text-xs uppercase tracking-[0.18em] rounded-lg min-h-[48px] transition-colors ${isActive
                            ? "bg-[#1C1B18] text-[#BFA27A] font-semibold border-l-2 border-[#BFA27A]"
                            : "text-[#AAA49B] hover:text-[#F2EEE7] active:bg-[#181714]"
                          }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-[#BFA27A]" : "text-[#777169]"}`} />
                          <span>{item.name}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {item.badge > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-950/90 text-amber-300 border border-amber-500/40">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-[#777169]" />
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Section: Profile & Storefront */}
              <div className="space-y-4 pt-6 border-t border-[rgba(242,238,231,0.06)] font-sans">
                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors min-h-[44px]"
                >
                  <span>Open Storefront</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <div className="p-3.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] rounded-lg flex items-center justify-between">
                  <div className="space-y-0.5 max-w-[160px] truncate">
                    <div className="flex items-center space-x-1.5">
                      <Shield className="w-3 h-3 text-[#BFA27A]" />
                      <span className="text-[9px] uppercase tracking-wider text-[#BFA27A] font-medium">
                        {profile?.role || "ADMIN"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#F2EEE7] truncate">
                      {user?.email || "admin@scente-parfums.com"}
                    </p>
                  </div>

                  <button
                    onClick={signOut}
                    className="p-2 text-[#777169] hover:text-rose-400 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="Sign Out"
                    aria-label="Sign out of admin"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT WORKSPACE (SCROLLS NATURALLY WITH WINDOW & LENIS) */}
      <main className="flex-1 min-w-0 md:ml-[76px] p-3.5 sm:p-6 md:p-8 lg:p-12 xl:p-14 w-full">
        <div className="max-w-[1600px] w-full mx-auto min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
