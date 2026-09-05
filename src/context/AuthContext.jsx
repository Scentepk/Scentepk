import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Helper to load profile role for authenticated user
  const fetchProfile = async (currentUser) => {
    if (!currentUser || !supabase) {
      setProfile(null);
      setIsAdmin(false);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.warn("Could not fetch user profile from Supabase:", error.message);
        setProfile(null);
        setIsAdmin(false);
        return null;
      }

      setProfile(data);
      const hasAdminRole = data?.role === "admin";
      setIsAdmin(hasAdminRole);
      return data;
    } catch (err) {
      console.error("Error fetching profile role:", err);
      setProfile(null);
      setIsAdmin(false);
      return null;
    }
  };

  // Monitor Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      } catch (err) {
        console.error("Error during initial getSession:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    let authSubscription = null;
    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      });
      authSubscription = subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Sign In Action (Strict Supabase Auth with Role Verification)
  const signIn = async (email, password) => {
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      const msg = "Authentication service unavailable. Supabase is not configured.";
      setAuthError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message || "Invalid email or password.");
        return { success: false, error: error.message };
      }

      if (data?.user) {
        setUser(data.user);
        const userProfile = await fetchProfile(data.user);

        if (userProfile?.role !== "admin") {
          setAuthError("Access restricted. This account does not possess administrator privileges.");
          return {
            success: false,
            isUnauthorized: true,
            error: "Non-admin account",
          };
        }

        return { success: true, user: data.user, profile: userProfile };
      }
    } catch (err) {
      const msg = err.message || "Authentication error occurred.";
      setAuthError(msg);
      return { success: false, error: msg };
    }

    return { success: false, error: "Authentication failed." };
  };

  // Sign Out Action
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Error signing out of Supabase:", err);
      }
    }
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isLoading,
        authError,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
