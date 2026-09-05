import React, { useState, useEffect } from "react";
import {
  getAllInquiriesAdmin,
  updateInquiryStatusAdmin,
  deleteInquiryAdmin,
} from "../../services/inquiries";
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Check,
  Eye,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "../../components/Input";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [activeModalInquiry, setActiveModalInquiry] = useState(null);

  const loadInquiries = async () => {
    setIsLoading(true);
    const { data } = await getAllInquiriesAdmin({
      status: statusFilter,
      search,
    });
    if (data) setInquiries(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInquiries();
  }, [statusFilter, search]);

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await updateInquiryStatusAdmin(id, newStatus);
    if (!error) {
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq))
      );
      if (activeModalInquiry && activeModalInquiry.id === id) {
        setActiveModalInquiry((prev) => ({ ...prev, status: newStatus }));
      }
      setToastMessage(`Inquiry marked as ${newStatus.toUpperCase()}`);
      setTimeout(() => setToastMessage(""), 3500);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you wish to delete the inquiry from "${name}"?`
    );
    if (!confirmDelete) return;

    const { success } = await deleteInquiryAdmin(id);
    if (success) {
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      if (activeModalInquiry?.id === id) setActiveModalInquiry(null);
      setToastMessage(`Inquiry from ${name} removed.`);
      setTimeout(() => setToastMessage(""), 3500);
    }
  };

  const handleOpenDetail = async (inquiry) => {
    setActiveModalInquiry(inquiry);
    if (inquiry.status === "unread") {
      await handleStatusChange(inquiry.id, "read");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "unread":
        return "bg-amber-950/40 text-amber-300 border-amber-500/40";
      case "read":
        return "bg-sky-950/40 text-sky-300 border-sky-500/40";
      case "resolved":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/40";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const unreadCount = inquiries.filter((i) => i.status === "unread").length;

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0">
      {/* 1. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#181714] border border-[#BFA27A]/50 text-[#F2EEE7] px-5 py-3 text-xs font-sans shadow-2xl flex items-center space-x-2 rounded-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BFA27A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-1 font-medium">
            CLIENT CONCIERGE & COMMODITY
          </span>
          <h1 className="font-serif font-light text-2xl sm:text-3xl lg:text-4xl text-[#F2EEE7] tracking-headline">
            Client Inquiries
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-0.5">
            Private consultations, bespoke gifting requests, and client communications.
          </p>
        </div>

        <button
          onClick={loadInquiries}
          disabled={isLoading}
          className="self-stretch sm:self-auto flex items-center justify-center space-x-2 bg-[#121110] border border-[rgba(242,238,231,0.12)] px-4 py-2.5 text-xs font-sans uppercase tracking-[0.18em] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#BFA27A] transition-colors cursor-pointer min-h-[44px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#BFA27A]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3. TOOLBAR / SEARCH & FILTERS */}
      <div className="bg-[#121110] p-4 sm:p-5 border border-[rgba(242,238,231,0.06)] flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between font-sans text-xs rounded-sm">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <Input
            id="inquirySearch"
            type="text"
            size="compact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, email, phone, or subject..."
            icon={Search}
            iconPosition="left"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex border border-[rgba(242,238,231,0.12)] bg-[#0D0D0C] rounded-xl p-1 overflow-x-auto shrink-0">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "read", label: "Read" },
            { id: "resolved", label: "Resolved" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-[10.5px] uppercase font-sans tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap min-h-[36px] flex items-center ${
                statusFilter === st.id
                  ? "bg-[#1C1B18] text-[#BFA27A] font-semibold"
                  : "text-[#AAA49B] hover:text-[#F2EEE7]"
              }`}
            >
              <span>{st.label}</span>
              {st.id === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-300 font-mono">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. INQUIRIES LIST / TABLE */}
      <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] shadow-2xl overflow-hidden rounded-sm">
        {inquiries.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[rgba(242,238,231,0.06)] text-[9.5px] uppercase tracking-[0.2em] text-[#777169] bg-[#0D0D0C]/40">
                    <th className="py-3.5 px-5 font-medium">Client</th>
                    <th className="py-3.5 px-4 font-medium">Subject</th>
                    <th className="py-3.5 px-4 font-medium">Message Preview</th>
                    <th className="py-3.5 px-4 font-medium">Date</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,238,231,0.04)]">
                  {inquiries.map((inq) => (
                    <tr
                      key={inq.id}
                      className={`hover:bg-[#181714]/60 transition-colors ${
                        inq.status === "unread" ? "bg-[#181714]/30" : ""
                      }`}
                    >
                      {/* Client Name & Contacts */}
                      <td className="py-3.5 px-5">
                        <p className="font-serif text-base text-[#F2EEE7] font-normal leading-snug">
                          {inq.name}
                        </p>
                        <p className="text-[10.5px] text-[#777169] font-mono mt-0.5">
                          {inq.email || inq.phone || "No contact info"}
                        </p>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 font-medium text-[#BFA27A] whitespace-nowrap">
                        {inq.subject || "General Inquiry"}
                      </td>

                      {/* Message Preview */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#AAA49B]">
                        {inq.message}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[10.5px] text-[#777169] whitespace-nowrap">
                        {new Date(inq.created_at).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[9.5px] uppercase tracking-wider px-2.5 py-0.5 border ${getStatusBadge(
                            inq.status
                          )}`}
                        >
                          {inq.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenDetail(inq)}
                            className="p-1.5 text-[#AAA49B] hover:text-[#BFA27A] hover:bg-[#0D0D0C] transition-colors cursor-pointer"
                            title="Read inquiry details"
                            aria-label={`Read inquiry from ${inq.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {inq.status !== "resolved" && (
                            <button
                              onClick={() => handleStatusChange(inq.id, "resolved")}
                              className="p-1.5 text-[#777169] hover:text-emerald-400 hover:bg-[#0D0D0C] transition-colors cursor-pointer"
                              title="Mark as Resolved"
                              aria-label={`Mark inquiry from ${inq.name} as resolved`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(inq.id, inq.name)}
                            className="p-1.5 text-[#777169] hover:text-rose-400 hover:bg-[#0D0D0C] transition-colors cursor-pointer"
                            title="Delete inquiry"
                            aria-label={`Delete inquiry from ${inq.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE INQUIRY CARDS VIEW (< 768px) */}
            <div className="md:hidden divide-y divide-[rgba(242,238,231,0.06)] font-sans text-xs">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className={`p-4 space-y-3 ${
                    inq.status === "unread" ? "bg-[#181714]/25" : ""
                  }`}
                >
                  {/* Card Header: Client & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-lg text-[#F2EEE7] font-normal leading-snug">
                        {inq.name}
                      </p>
                      <p className="text-[11px] text-[#777169] font-mono mt-0.5">
                        {inq.email || inq.phone || "No contact info"}
                      </p>
                    </div>

                    <span
                      className={`inline-block text-[9.5px] uppercase tracking-wider px-2.5 py-0.5 border shrink-0 ${getStatusBadge(
                        inq.status
                      )}`}
                    >
                      {inq.status}
                    </span>
                  </div>

                  {/* Subject & Preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#BFA27A] font-medium block">
                      {inq.subject || "General Inquiry"}
                    </span>
                    <p className="text-xs text-[#AAA49B] line-clamp-2 leading-relaxed">
                      {inq.message}
                    </p>
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(242,238,231,0.04)] text-[11px] text-[#777169]">
                    <span>
                      {new Date(inq.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenDetail(inq)}
                        className="px-3 py-2 bg-[#181714] border border-[rgba(242,238,231,0.1)] text-[#F2EEE7] hover:text-[#BFA27A] rounded-sm text-[11px] uppercase tracking-wider min-h-[40px] flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#BFA27A]" />
                        <span>Read</span>
                      </button>

                      {inq.status !== "resolved" && (
                        <button
                          onClick={() => handleStatusChange(inq.id, "resolved")}
                          className="p-2 text-emerald-400 bg-[#0D0D0C] border border-emerald-500/30 rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                          title="Mark Resolved"
                          aria-label={`Mark inquiry from ${inq.name} as resolved`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(inq.id, inq.name)}
                        className="p-2 text-[#777169] hover:text-rose-400 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                        title="Delete inquiry"
                        aria-label={`Delete inquiry from ${inq.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-16 text-center space-y-3">
            <Mail className="w-8 h-8 text-[#777169] mx-auto opacity-40" />
            <p className="text-sm font-serif text-[#F2EEE7]">No inquiries found.</p>
            <p className="text-xs font-sans text-[#777169]">
              Inquiries submitted through the public Contact page will appear here.
            </p>
          </div>
        )}
      </div>

      {/* 5. INQUIRY DETAIL MODAL (RESPONSIVE VIEWPORT BOUNDS) */}
      <AnimatePresence>
        {activeModalInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#121110] border border-[rgba(242,238,231,0.12)] w-full max-w-2xl max-h-[88vh] flex flex-col p-5 sm:p-8 shadow-2xl space-y-5 font-sans text-xs rounded-sm overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Client Inquiry Manifest"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[rgba(242,238,231,0.06)] shrink-0">
                <div>
                  <span className="text-[9.5px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] block mb-1">
                    CLIENT INQUIRY MANIFEST
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-normal">
                    {activeModalInquiry.name}
                  </h3>
                  <p className="text-[11px] text-[#777169] mt-0.5">
                    Received on{" "}
                    {new Date(activeModalInquiry.created_at).toLocaleString("en-PK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <button
                  onClick={() => setActiveModalInquiry(null)}
                  className="p-2 -mr-1 text-[#777169] hover:text-[#F2EEE7] transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Close dialog"
                  aria-label="Close inquiry dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto space-y-5 pr-1 flex-1">
                {/* Client Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] rounded-sm">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#777169] block mb-0.5">
                      Email Address
                    </span>
                    {activeModalInquiry.email ? (
                      <a
                        href={`mailto:${activeModalInquiry.email}`}
                        className="text-[#F2EEE7] hover:text-[#BFA27A] transition-colors break-all"
                      >
                        {activeModalInquiry.email}
                      </a>
                    ) : (
                      <span className="text-[#777169] italic">None provided</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#777169] block mb-0.5">
                      Phone / WhatsApp
                    </span>
                    {activeModalInquiry.phone ? (
                      <a
                        href={`tel:${activeModalInquiry.phone}`}
                        className="text-[#F2EEE7] font-mono hover:text-[#BFA27A] transition-colors"
                      >
                        {activeModalInquiry.phone}
                      </a>
                    ) : (
                      <span className="text-[#777169] italic">None provided</span>
                    )}
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-[rgba(242,238,231,0.04)]">
                    <span className="text-[9px] uppercase tracking-wider text-[#777169] block mb-0.5">
                      Consultation Subject
                    </span>
                    <span className="text-[#BFA27A] font-medium text-sm">
                      {activeModalInquiry.subject}
                    </span>
                  </div>
                </div>

                {/* Full Message Body */}
                <div className="space-y-2">
                  <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                    Complete Message
                  </span>
                  <div className="p-4 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] text-[#F2EEE7] leading-relaxed text-sm whitespace-pre-wrap rounded-sm">
                    {activeModalInquiry.message}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[rgba(242,238,231,0.06)] shrink-0">
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="text-[10px] uppercase tracking-wider text-[#777169]">
                    STATUS:
                  </span>
                  <span
                    className={`inline-block text-[9.5px] uppercase tracking-wider px-2.5 py-0.5 border ${getStatusBadge(
                      activeModalInquiry.status
                    )}`}
                  >
                    {activeModalInquiry.status}
                  </span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {activeModalInquiry.status !== "resolved" ? (
                    <button
                      onClick={() => handleStatusChange(activeModalInquiry.id, "resolved")}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#181714] border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 transition-colors uppercase tracking-wider text-[10.5px] font-medium cursor-pointer min-h-[44px] flex items-center justify-center"
                    >
                      Mark as Resolved
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(activeModalInquiry.id, "read")}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#181714] border border-[rgba(242,238,231,0.2)] text-[#AAA49B] hover:text-[#F2EEE7] transition-colors uppercase tracking-wider text-[10.5px] cursor-pointer min-h-[44px] flex items-center justify-center"
                    >
                      Reopen as Read
                    </button>
                  )}

                  <button
                    onClick={() => setActiveModalInquiry(null)}
                    className="px-5 py-2.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] text-[#AAA49B] hover:text-[#F2EEE7] transition-colors uppercase tracking-wider text-[10.5px] cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
