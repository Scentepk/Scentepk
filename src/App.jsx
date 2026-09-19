import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { SmoothScrollProvider } from "./context/SmoothScrollProvider";
import MainLayout from "./layouts/MainLayout";
import AtelierLoader from "./components/AtelierLoader";
import ErrorBoundary from "./components/ErrorBoundary";

// Primary Storefront Landing Page (Eagerly Loaded for Instant FCP)
import Home from "./pages/Home";

// Secondary Storefront Routes (Lazy Loaded with Code Splitting)
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const About = lazy(() => import("./pages/About"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const ScentFinder = lazy(() => import("./pages/ScentFinder"));
const Contact = lazy(() => import("./pages/Contact"));
const DeliveryReturns = lazy(() => import("./pages/DeliveryReturns"));
const CodGuide = lazy(() => import("./pages/CodGuide"));
const Authenticity = lazy(() => import("./pages/Authenticity"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Architecture (Isolated in Dedicated Admin Chunk)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProductList = lazy(() => import("./pages/admin/AdminProductList"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminOrderList = lazy(() => import("./pages/admin/AdminOrderList"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminHeroManagement = lazy(() => import("./pages/admin/AdminHeroManagement"));
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <BrowserRouter>
            <SmoothScrollProvider>
              <ErrorBoundary>
                <Suspense fallback={<AtelierLoader />}>
                  <Routes>
                    {/* Public Storefront Routes */}
                    <Route path="/" element={<MainLayout />}>
                      <Route index element={<Home />} />
                      <Route path="shop" element={<Shop />} />
                      <Route path="product/:slug" element={<ProductDetails />} />
                      <Route path="wishlist" element={<Wishlist />} />
                      <Route path="about" element={<About />} />
                      <Route path="story" element={<About />} />
                      <Route path="track" element={<TrackOrder />} />
                      <Route path="track-order" element={<TrackOrder />} />
                      <Route path="scent-finder" element={<ScentFinder />} />
                      <Route path="contact" element={<Contact />} />
                      <Route path="delivery-returns" element={<DeliveryReturns />} />
                      <Route path="cod-guide" element={<CodGuide />} />
                      <Route path="authenticity" element={<Authenticity />} />
                      <Route path="privacy" element={<Privacy />} />
                      <Route path="terms" element={<Terms />} />
                      <Route path="cart" element={<Cart />} />
                      <Route path="checkout" element={<Checkout />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>

                  {/* Admin Authentication Route */}
                  <Route path="/admin/login" element={<AdminLogin />} />

                  {/* Protected Admin Workspace Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedAdminRoute>
                        <AdminLayout />
                      </ProtectedAdminRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />

                    {/* Hero Section Editorial Management */}
                    <Route path="hero" element={<AdminHeroManagement />} />

                    {/* Product Catalog Management */}
                    <Route path="products" element={<AdminProductList />} />
                    <Route path="products/new" element={<AdminProductForm />} />
                    <Route path="products/:id/edit" element={<AdminProductForm />} />

                    {/* Order Logistics Management */}
                    <Route path="orders" element={<AdminOrderList />} />
                    <Route path="orders/:id" element={<AdminOrderDetail />} />

                    {/* Client Concierge Inquiries */}
                    <Route path="inquiries" element={<AdminInquiries />} />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </SmoothScrollProvider>
        </BrowserRouter>
      </CartProvider>
    </WishlistProvider>
  </AuthProvider>
  );
}
