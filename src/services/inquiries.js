import { supabase, isSupabaseConfigured } from "../lib/supabase";

const LOCAL_STORAGE_INQUIRIES_KEY = "scente_admin_inquiries_cache";

/**
 * Helper to get local inquiries store
 */
function getLocalInquiriesStore() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_INQUIRIES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading local inquiries cache:", e);
  }

  // Initial seed inquiry for demonstration
  const initial = [
    {
      id: "inq-seed-1",
      name: "Sobia Rehman",
      email: "sobia.rehman@domain.pk",
      phone: "0301 8294711",
      subject: "Fragrance Consultation",
      message:
        "Good afternoon. I am seeking advice on an evening fragrance with smoky leather and cardamom notes. Between SCENTE NOIR and SCENTE AMBER, which offers superior sillage in winter climates?",
      status: "unread",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "inq-seed-2",
      name: "Kamran Siddiqui",
      email: "k.siddiqui@enterprise.com",
      phone: "0322 4433221",
      subject: "Corporate & Event Gifting",
      message:
        "We are hosting an executive retreat in Islamabad next month and would like to procure 25 custom gift boxes featuring SCENTE NOIR 50ml flacons. Please advise on corporate bespoke rates and delivery timelines.",
      status: "read",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  try {
    localStorage.setItem(LOCAL_STORAGE_INQUIRIES_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

function saveLocalInquiriesStore(inquiries) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INQUIRIES_KEY, JSON.stringify(inquiries));
  } catch (e) {
    console.error("Error saving local inquiries cache:", e);
  }
}

/**
 * Public Client: Submit a new inquiry from Contact page
 */
export async function submitInquiry({ name, email = "", phone = "", subject = "Fragrance Consultation", message }) {
  if (!name || !name.trim()) {
    return { data: null, error: new Error("Please provide your full name.") };
  }
  if (!message || !message.trim()) {
    return { data: null, error: new Error("Please enter your message.") };
  }

  const payload = {
    name: name.trim(),
    email: email ? email.trim() : null,
    phone: phone ? phone.trim() : null,
    subject: subject || "Fragrance Consultation",
    message: message.trim(),
    status: "unread",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalInquiriesStore();
    const newEntry = {
      id: `inq-${Date.now()}`,
      ...payload,
    };
    items.unshift(newEntry);
    saveLocalInquiriesStore(items);
    return { data: newEntry, error: null };
  }

  try {
    const { error } = await supabase
      .from("inquiries")
      .insert(payload);

    if (error) throw error;
    return { data: { success: true, ...payload }, error: null };
  } catch (err) {
    console.error("Supabase inquiry insert error, falling back to local store:", err);
    const items = getLocalInquiriesStore();
    const newEntry = {
      id: `inq-${Date.now()}`,
      ...payload,
    };
    items.unshift(newEntry);
    saveLocalInquiriesStore(items);
    return { data: newEntry, error: null };
  }
}

/**
 * Admin: Get all inquiries with optional status filter
 */
export async function getAllInquiriesAdmin({ status = "all", search = "" } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    let items = getLocalInquiriesStore();
    if (status !== "all") {
      items = items.filter((inq) => inq.status === status);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (inq) =>
          inq.name.toLowerCase().includes(q) ||
          (inq.email && inq.email.toLowerCase().includes(q)) ||
          (inq.phone && inq.phone.includes(q)) ||
          (inq.subject && inq.subject.toLowerCase().includes(q)) ||
          inq.message.toLowerCase().includes(q)
      );
    }
    return { data: items, error: null };
  }

  try {
    let query = supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (search.trim()) {
      query = query.or(
        `name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,subject.ilike.%${search.trim()}%,message.ilike.%${search.trim()}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Failed to query inquiries from Supabase:", err);
    let items = getLocalInquiriesStore();
    if (status !== "all") items = items.filter((inq) => inq.status === status);
    return { data: items, error: err };
  }
}

/**
 * Admin: Update inquiry status (unread, read, resolved)
 */
export async function updateInquiryStatusAdmin(id, newStatus) {
  const allowed = ["unread", "read", "resolved"];
  if (!allowed.includes(newStatus)) {
    return { data: null, error: new Error(`Invalid status: ${newStatus}`) };
  }

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalInquiriesStore();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx].status = newStatus;
      items[idx].updated_at = new Date().toISOString();
      saveLocalInquiriesStore(items);
      return { data: items[idx], error: null };
    }
    return { data: null, error: new Error("Inquiry not found") };
  }

  try {
    const { data, error } = await supabase
      .from("inquiries")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Failed to update inquiry status:", err);
    const items = getLocalInquiriesStore();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx].status = newStatus;
      saveLocalInquiriesStore(items);
      return { data: items[idx], error: null };
    }
    return { data: null, error: err };
  }
}

/**
 * Admin: Delete inquiry
 */
export async function deleteInquiryAdmin(id) {
  if (!isSupabaseConfigured || !supabase) {
    let items = getLocalInquiriesStore();
    items = items.filter((i) => i.id !== id);
    saveLocalInquiriesStore(items);
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.from("inquiries").delete().eq("id", id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to delete inquiry:", err);
    let items = getLocalInquiriesStore();
    items = items.filter((i) => i.id !== id);
    saveLocalInquiriesStore(items);
    return { success: true, error: null };
  }
}

/**
 * Admin / Nav: Get unread count
 */
export async function getUnreadInquiriesCount() {
  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalInquiriesStore();
    return items.filter((i) => i.status === "unread").length;
  }

  try {
    const { count, error } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread");

    if (error) throw error;
    return count || 0;
  } catch (err) {
    const items = getLocalInquiriesStore();
    return items.filter((i) => i.status === "unread").length;
  }
}
