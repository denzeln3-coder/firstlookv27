import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (mountedRef.current) {
            setUser({ ...session.user, ...profile });
          }
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        if (mountedRef.current) {
          setIsLoadingAuth(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION" || !mountedRef.current) return;
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (mountedRef.current) {
          setUser({ ...session.user, ...profile });
        }
      } else {
        if (mountedRef.current) {
          setUser(null);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    isLoadingAuth,
    authError: null,
    isLoadingPublicSettings: false,
    signOut,
    navigateToLogin: () => { window.location.href = "/login"; },
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
