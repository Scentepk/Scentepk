import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Input from "../../components/Input";
import { motion } from "framer-motion";
import SEO from "../../components/SEO";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, isAdmin, signIn, authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!email.trim() || !password.trim()) {
      setLocalError("Please enter both email address and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate("/admin", { replace: true });
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#F2EEE7] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="SCENTE Admin Portal — Control Console"
        noindex={true}
      />
      {/* Top Back Link */}
      <div className="max-w-md w-full mx-auto flex items-center justify-start">
        <Link
          to="/"
          className="inline-flex items-center text-[10.5px] uppercase font-sans tracking-[0.2em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors py-2 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2 stroke-[1.5]" />
          <span>Return to Storefront</span>
        </Link>
      </div>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full mx-auto bg-[#121110] border border-[rgba(242,238,231,0.06)] rounded-2xl p-6 sm:p-10 shadow-2xl space-y-6 sm:space-y-8 my-auto"
      >
        {/* Header */}
        <div className="text-center space-y-2 pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)]">
          <span className="font-serif text-3xl sm:text-4xl font-medium tracking-[0.2em] text-[#F2EEE7] block">
            SCENTEPK
          </span>
          <span className="text-[9px] uppercase font-sans tracking-[0.35em] text-[#BFA27A] block font-medium">
            ADMIN CONTROL PORTAL
          </span>
        </div>

        {/* Error Alert */}
        {(localError || authError) && (
          <div className="p-3.5 sm:p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-sans space-y-1">
            <div className="flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Authentication Restricted</span>
            </div>
            <p className="text-[11px] opacity-90 pl-6 leading-relaxed">
              {localError || authError}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169] mb-2"
            >
              Administrator Email
            </label>
            <Input
              id="email"
              type="text"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin"
              icon={Mail}
              iconPosition="left"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169] mb-2"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={Lock}
              iconPosition="left"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-transparent text-[#F2EEE7] border border-[rgba(242,238,231,0.22)] rounded-xl py-3.5 px-6 text-xs uppercase font-sans tracking-[0.22em] hover:border-[#BFA27A] hover:text-[#BFA27A] hover:bg-[#181714] disabled:opacity-40 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer font-medium mt-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#BFA27A]" />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <span>SIGN IN →</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center">
          <span className="text-[10.5px] text-[#777169] font-sans">
            Encrypted session • Authorized personnel only
          </span>
        </div>
      </motion.div>

      {/* Bottom Footer Note */}
      <div className="max-w-md w-full mx-auto text-center py-4">
        <span className="text-[10px] text-[#777169] uppercase tracking-wider font-mono">
          SCENTEPK Parfums • Control Architecture v2.0
        </span>
      </div>
    </div>
  );
}
