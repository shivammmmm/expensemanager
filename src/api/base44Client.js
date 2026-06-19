// Local replacement for Base44 SDK
// The existing UI expects a `base44` object with:
// - base44.auth.* methods
// - base44.entities.* CRUD methods
// - base44.users.inviteUser
// - base44.integrations.Core.UploadFile

import {
  getLocalToken,
  setLocalToken,
  clearLocalToken,
} from "@/lib/localToken";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

async function api(
  path,
  { method = "GET", body = undefined, token = undefined, headers = {} } = {}
) {
  const reqHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };
  const bearer = token || getLocalToken();
  if (bearer) reqHeaders.Authorization = `Bearer ${bearer}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed: ${method} ${path}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function buildAuth() {
  return {
    me: () => api("/auth/me"),

    async loginViaEmailPassword(identifier, password) {
      // UI uses "username" but SDK method name is kept.
      const { access_token } = await api("/auth/login", {
        method: "POST",
        body: { email: identifier, password },
        token: null,
      });
      setLocalToken(access_token);
      return { access_token };
    },

    async register() {
      throw new Error("Registration disabled. Admin creates staff accounts.");
    },

    async verifyOtp() {
      throw new Error(
        "OTP verification disabled. Admin creates staff accounts."
      );
    },

    async resendOtp() {
      throw new Error("OTP flow disabled.");
    },

    logout: (_redirectUrl) => {
      clearLocalToken();
    },

    redirectToLogin: (redirectUrl) => {
      clearLocalToken();
      window.location.href = redirectUrl || "/login";
    },

    async resetPasswordRequest(email) {
      return api("/auth/reset-password-request", {
        method: "POST",
        body: { email },
        token: null,
      });
    },

    async resetPassword({ resetToken, newPassword }) {
      return api("/auth/reset-password", {
        method: "POST",
        body: { resetToken, newPassword },
        token: null,
      });
    },
  };
}

function buildUpload() {
  return {
    async UploadFile({ file }) {
      // For now we ignore file content and return stub.
      // Frontend uses `bill_image` URL.
      // If you want real storage, add multipart upload.
      void file;
      const data = await api("/upload", {
        method: "POST",
        body: { _ignored: true },
      });
      return data;
    },
  };
}

function buildEntities() {
  // Helpers to match UI calls:
  // - list(orderBy, limit)
  // - filter(filterObj, orderBy, limit)
  // - create(data)
  // - update(id, data)

  const Expense = {
    list: (orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/expenses?orderBy=${encodeURIComponent(order || "")}`);
    },
    filter: (filterObj, orderBy = undefined, _limit = undefined) => {
      // Only staff_id filtering in UI; server also filters by role, so just call list.
      void filterObj;
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/expenses?orderBy=${encodeURIComponent(order || "")}`);
    },
    update: (id, data) =>
      api(`/expenses/${id}`, { method: "PATCH", body: data }),
    create: (data) => api("/expenses", { method: "POST", body: data }),
  };

  const SentPayment = {
    list: (orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/sent-payments?orderBy=${encodeURIComponent(order || "")}`);
    },
    filter: (filterObj, orderBy = undefined, _limit = undefined) => {
      void filterObj;
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/sent-payments?orderBy=${encodeURIComponent(order || "")}`);
    },
    create: (data) => api("/sent-payments", { method: "POST", body: data }),
  };

  const Collection = {
    list: (orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/collections?orderBy=${encodeURIComponent(order || "")}`);
    },
    filter: (filterObj, orderBy = undefined, _limit = undefined) => {
      void filterObj;
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/collections?orderBy=${encodeURIComponent(order || "")}`);
    },
    create: (data) => api("/collections", { method: "POST", body: data }),
  };

  const User = {
    list: () => api("/users"),
  };

  const Client = {
    list: (orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/clients?orderBy=${encodeURIComponent(order || "")}`);
    },
    filter: (_filterObj, orderBy = undefined, _limit = undefined) => {
      // Server already enforces role/staff-based filtering.
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/clients?orderBy=${encodeURIComponent(order || "")}`);
    },
  };

  const CashLedger = {
    list: (orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/cash-ledger?orderBy=${encodeURIComponent(order || "")}`);
    },
    filter: (_filterObj, orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/cash-ledger?orderBy=${encodeURIComponent(order || "")}`);
    },
    create: (data) => api("/cash-ledger", { method: "POST", body: data }),
    delete: (id) => api(`/cash-ledger/${id}`, { method: "DELETE" }),
  };

  const StaffTransfer = {
    list: (orderBy = undefined, _limit = undefined) => {
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/staff-transfers?orderBy=${encodeURIComponent(order || "")}`);
    },
    filter: (filterObj, orderBy = undefined, _limit = undefined) => {
      void filterObj;
      const order = orderBy ? String(orderBy) : undefined;
      return api(`/staff-transfers?orderBy=${encodeURIComponent(order || "")}`);
    },
    create: (data) => api("/staff-transfers", { method: "POST", body: data }),
    delete: (id) => api(`/staff-transfers/${id}`, { method: "DELETE" }),
  };

  return { Expense, SentPayment, Collection, User, Client, CashLedger, StaffTransfer };
}

const base44 = {

  auth: buildAuth(),
  entities: buildEntities(),
  users: {
    createStaff: (payload) =>
      api("/users/create", { method: "POST", body: payload }),
    updateStaff: (id, payload) =>
      api(`/users/${id}`, { method: "PATCH", body: payload }),
    resetStaffPassword: (id, payload) =>
      api(`/users/${id}/reset-password`, { method: "POST", body: payload }),
    deleteStaff: (id) => api(`/users/${id}`, { method: "DELETE" }),
  },

  settings: {
    getCompanySettings: () => api(`/settings/company`),
    saveCompanySettings: (payload) =>
      api(`/settings/company`, { method: "PUT", body: payload }),
  },

  integrations: {
    Core: buildUpload(),
  },
};


export default base44;
export { base44 };
