import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import Button from "../Button";

export default function ProtectedAdminRoute({ children }) {
  const { user, isAdmin, isLoading, signOut } = useAuth();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0C] flex flex-col items-center justify-center text-[#F2EEE7] px-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#BFA27A] mb-4" />
        <span className="text-[10.5px] uppercase font-sans tracking-[0.28em] text-[#AAA49B]">
          VERIFYING ADMIN CREDENTIALS...
        </span>
      </div>
    );
  }

  // 2. Not Authenticated -> Redirect to Login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // 3. Authenticated but NOT an Admin -> Unauthorized State
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D0D0C] flex items-center justify-center text-[#F2EEE7] px-6 py-20">
        <div className="max-w-md w-full bg-[#121110] border border-[rgba(242,238,231,0.06)] p-10 sm:p-12 text-center shadow-2xl space-y-6">
          <div className="w-12 h-12 rounded-full bg-[#181714] border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-sans tracking-[0.3em] text-[#BFA27A] block font-medium">
              RESTRICTED ACCESS
            </span>
            <h1 className="font-serif text-3xl text-[#F2EEE7] font-normal">
              Unauthorized
            </h1>
            <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed">
              Signed in as <strong className="text-[#F2EEE7]">{user.email}</strong>. This account does not possess administrator privileges for SCENTEPK.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={signOut}
              className="w-full sm:w-auto bg-transparent text-[#F2EEE7] border border-[rgba(242,238,231,0.2)] px-6 py-3 text-[11px] font-sans uppercase tracking-[0.2em] hover:border-[#BFA27A] hover:text-[#BFA27A] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
            <Button to="/" variant="solid">
              Return to Storefront
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin
  return children;
}
