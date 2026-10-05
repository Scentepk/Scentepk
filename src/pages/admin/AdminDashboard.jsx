import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardStats,
  getRecentOrders,
  getLowStockProducts,
} from "../../services/adminDashboard";
import {
  Package,
  Clock,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  Plus,
  MapPin,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 3,
    pendingOrders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    formattedRevenue: "PKR 0",
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    const [statsRes, ordersRes, stockRes] = await Promise.all([
      getDashboardStats(),
      getRecentOrders(5),
      getLowStockProducts(5),
    ]);

    if (statsRes.data) setStats(statsRes.data);
    if (ordersRes.data) setRecentOrders(ordersRes.data);
    if (stockRes.data) setLowStock(stockRes.data);

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-950/40 text-amber-300 border-amber-500/30";
      case "confirmed":
        return "bg-sky-950/40 text-sky-300 border-sky-500/30";
      case "processing":
        return "bg-purple-950/40 text-purple-300 border-purple-500/30";
      case "shipped":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
      case "delivered":
        return "bg-emerald-950/60 text-emerald-200 border-emerald-500/40";
      case "cancelled":
        return "bg-rose-950/40 text-rose-300 border-rose-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10 w-full min-w-0">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-1 font-medium">
            EXECUTIVE OVERVIEW
          </span>
          <h1 className="font-serif font-light text-2xl sm:text-3xl lg:text-4xl text-[#F2EEE7] tracking-headline">
            Executive Summary
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-0.5">
            Live catalog indicators, pending Cash on Delivery orders, and inventory status.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-stretch sm:self-auto">
          <Link
            to="/admin/products/new"
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] font-semibold px-4 py-2.5 text-xs font-sans uppercase tracking-[0.16em] transition-all shadow-[0_4px_20px_rgba(191,162,122,0.25)] min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 text-[#0D0D0C]" />
            <span>New Extrait</span>
          </Link>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center justify-center space-x-2 bg-[#121110] border border-[rgba(242,238,231,0.12)] px-4 py-2.5 text-xs font-sans uppercase tracking-[0.18em] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#BFA27A] transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#BFA27A]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. METRICS CARDS: 1-col mobile, 2-col tablet, 4-col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Products */}
        <Link
          to="/admin/products"
          className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] hover:border-[#BFA27A]/40 transition-colors space-y-3 block rounded-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169]">
              ACTIVE EXTRAITS
            </span>
            <Package className="w-4 h-4 text-[#BFA27A]" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl text-[#F2EEE7]">
            {stats.totalProducts}
          </p>
          <p className="text-[10.5px] font-sans text-[#AAA49B] flex items-center justify-between pt-1">
            <span>Manage Catalog</span>
            <ArrowRight className="w-3 h-3 text-[#777169]" />
          </p>
        </Link>

        {/* Card 2: Pending Orders */}
        <Link
          to="/admin/orders"
          className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] hover:border-amber-500/40 transition-colors space-y-3 block rounded-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169]">
              PENDING COD ORDERS
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl text-amber-300">
            {stats.pendingOrders}
          </p>
          <p className="text-[10.5px] font-sans text-[#AAA49B] flex items-center justify-between pt-1">
            <span>Awaiting Dispatch</span>
            <ArrowRight className="w-3 h-3 text-[#777169]" />
          </p>
        </Link>

        {/* Card 3: Total Orders */}
        <Link
          to="/admin/orders"
          className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] hover:border-[#BFA27A]/40 transition-colors space-y-3 block rounded-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169]">
              TOTAL RESERVATIONS
            </span>
            <ShoppingBag className="w-4 h-4 text-[#BFA27A]" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl text-[#F2EEE7]">
            {stats.totalOrders}
          </p>
          <p className="text-[10.5px] font-sans text-[#AAA49B] flex items-center justify-between pt-1">
            <span>Lifetime Orders</span>
            <ArrowRight className="w-3 h-3 text-[#777169]" />
          </p>
        </Link>

        {/* Card 4: Gross Revenue */}
        <div className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] space-y-3 rounded-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169]">
              GROSS VALUATION
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] truncate" title={stats.formattedRevenue}>
            {stats.formattedRevenue}
          </p>
          <p className="text-[10.5px] font-sans text-[#AAA49B] pt-1">
            Settled & Pending Deliveries
          </p>
        </div>
      </div>

      {/* 3. TWO-COLUMN SPLIT: RECENT ORDERS & INVENTORY STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left: Recent Orders */}
        <div className="lg:col-span-8 bg-[#121110] p-5 sm:p-7 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm min-w-0">
          <div className="flex items-center justify-between pb-4 border-b border-[rgba(242,238,231,0.06)]">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-normal">
                Recent Orders
              </h2>
              <p className="text-xs font-sans text-[#777169] mt-0.5">
                Latest customer reservations received
              </p>
            </div>

            <Link
              to="/admin/orders"
              className="text-[10.5px] uppercase font-sans text-[#BFA27A] hover:text-[#F2EEE7] tracking-wider transition-colors"
            >
              View All →
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <>
              {/* DESKTOP TABLE VIEW (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[rgba(242,238,231,0.06)] text-[9.5px] uppercase tracking-[0.2em] text-[#777169]">
                      <th className="pb-3 font-medium">Reference</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">City</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(242,238,231,0.04)]">
                    {recentOrders.map((order) => (
                      <tr key={order.reference} className="hover:bg-[#181714]/60 transition-colors">
                        <td className="py-3.5 font-mono text-[#F2EEE7] font-medium">
                          <Link
                            to={`/admin/orders/${order.id || order.reference}`}
                            className="hover:text-[#BFA27A]"
                          >
                            {order.reference}
                          </Link>
                        </td>
                        <td className="py-3.5 text-[#AAA49B]">
                          {order.customer_full_name}
                        </td>
                        <td className="py-3.5 text-[#AAA49B]">
                          {order.city}
                        </td>
                        <td className="py-3.5 font-serif text-[#F2EEE7]">
                          {order.formattedTotal}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 border ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Link
                            to={`/admin/orders/${order.id || order.reference}`}
                            className="p-1.5 text-[#777169] hover:text-[#F2EEE7] inline-block"
                            title="View order"
                            aria-label={`View order ${order.reference}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW (< 768px) */}
              <div className="md:hidden space-y-3 font-sans text-xs">
                {recentOrders.map((order) => (
                  <div
                    key={order.reference}
                    className="p-4 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] rounded-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#F2EEE7] font-medium text-sm">
                        {order.reference}
                      </span>
                      <span
                        className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-xs text-[#AAA49B]">
                      <div>
                        <p className="text-[#F2EEE7] font-medium">{order.customer_full_name}</p>
                        <p className="text-[11px] text-[#777169] flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#BFA27A]" />
                          <span>{order.city}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-serif text-base text-[#F2EEE7] font-medium block">
                          {order.formattedTotal}
                        </span>
                        <span className="text-[9.5px] uppercase tracking-wider text-[#777169]">
                          COD
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[rgba(242,238,231,0.04)]">
                      <Link
                        to={`/admin/orders/${order.id || order.reference}`}
                        className="w-full flex items-center justify-center space-x-1.5 bg-[#181714] border border-[rgba(242,238,231,0.1)] py-2.5 text-[11px] uppercase tracking-[0.16em] text-[#F2EEE7] hover:text-[#BFA27A] rounded-sm min-h-[44px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#BFA27A]" />
                        <span>Inspect Order</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs font-sans text-[#777169]">
              No customer orders received yet.
            </div>
          )}
        </div>

        {/* Right: Low Stock Alerts */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          <div className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] space-y-4 rounded-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)]">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif text-lg text-[#F2EEE7]">
                  Inventory Alerts
                </h2>
              </div>
              <span className="text-[10px] uppercase font-sans text-[#777169] tracking-wider">
                Below Threshold
              </span>
            </div>

            {lowStock.length > 0 ? (
              <div className="space-y-3 font-sans text-xs">
                {lowStock.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="text-[#F2EEE7] font-medium truncate">{prod.name}</p>
                      <p className="text-[10px] text-[#777169] uppercase tracking-wider">
                        {prod.family || "Extrait"}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 border ${
                          prod.stock_quantity === 0
                            ? "bg-rose-950/40 text-rose-300 border-rose-500/30"
                            : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {prod.stock_quantity} left
                      </span>

                      <Link
                        to={`/admin/products/${prod.id}/edit`}
                        className="text-[10px] uppercase text-[#BFA27A] hover:underline p-1 min-h-[36px] flex items-center"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#777169] py-4 text-center font-sans">
                All compositions are sufficiently stocked.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
