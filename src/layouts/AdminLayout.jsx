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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUnreadInquiriesCount } from "../services/inquiries";

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const { lenis } = useSmoothScroll();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // Close mobile navigation drawer whenever route changes
  useEffect(() => {
    setMobileNavOpen(false);
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
      name: "Products",
      path: "/admin/products",
      icon: Package,
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
      name: "Inquiries",
      path: "/admin/inquiries",
      icon: Mail,
      badge: unreadCount,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2EEE7] flex flex-col md:flex-row w-full relative">
      {/* 1. PERSISTENT DESKTOP / TABLET SIDEBAR (FIXED VIEWPORT ANCHOR) */}
      <aside
        data-lenis-prevent
        className="hidden md:flex w-60 lg:w-72 bg-[#121110] border-r border-[rgba(242,238,231,0.06)] flex-col justify-between p-5 lg:p-6 shrink-0 h-screen fixed top-0 bottom-0 left-0 z-20 select-none"
      >
        <div className="flex-1 flex flex-col min-h-0 space-y-6">
          {/* Brand Wordmark (Pinned Top) */}
          <div className="space-y-1 pb-5 border-b border-[rgba(242,238,231,0.06)] shrink-0">
            <Link to="/admin" className="block focus:outline-none group">
              <span className="font-serif text-2xl lg:text-3xl font-medium tracking-[0.24em] text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors block">
                SCENTÉ
              </span>
              <span className="text-[8px] uppercase font-sans tracking-[0.32em] text-[#BFA27A] block font-medium">
                ATELIER CONTROL ROOM
              </span>
            </Link>
          </div>

          {/* Navigation Links (Independently Scrollable if height is constrained) */}
          <nav
            data-lenis-prevent
            className="space-y-1.5 font-sans flex-1 overflow-y-auto pr-1"
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
                  className={`flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.18em] transition-all rounded-sm min-h-[44px] ${isActive
                      ? "bg-[#181714] text-[#F2EEE7] border-l-2 border-[#BFA27A] font-medium"
                      : "text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-[#161513]"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#BFA27A]" : "text-[#777169]"}`} />
                    <span>{item.name}</span>
                  </div>

                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Admin Profile & Storefront Link (Pinned Bottom) */}
        <div className="space-y-4 pt-5 border-t border-[rgba(242,238,231,0.06)] font-sans shrink-0">
          {/* Storefront Link */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors min-h-[40px]"
          >
            <span>View Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Admin User Card */}
          <div className="p-3.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] flex items-center justify-between">
            <div className="space-y-0.5 max-w-[150px] lg:max-w-[180px] truncate">
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3 h-3 text-[#BFA27A]" />
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
              className="p-2 text-[#777169] hover:text-rose-400 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Sign Out"
              aria-label="Sign out of admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
                      SCENTÉ
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
      <main className="flex-1 min-w-0 md:ml-60 lg:ml-72 p-3.5 sm:p-6 md:p-8 lg:p-12 xl:p-14 w-full">
        <div className="max-w-[1600px] w-full mx-auto min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
