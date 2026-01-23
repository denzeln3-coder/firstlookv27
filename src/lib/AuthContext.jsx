import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProfileWithTimeout = async (authUser, timeoutMs = 3000) => {
      if (!authUser) return null;
      
      try {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs);
        });

        // Race between fetch and timeout
        const fetchPromise = supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        const { data: profile, error } = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (error) {
          console.warn("[Auth] Profile error:", error.message);
          return { ...authUser, user_type: null };
        }
        
        return profile 
          ? { ...authUser, ...profile }
          : { ...authUser, user_type: null };
          
      } catch (error) {
        console.warn("[Auth] Profile fetch failed/timeout:", error.message);
        return { ...authUser, user_type: null };
      }
    };

    const handleAuthChange = async (event, session) => {
      console.log("[Auth] Event:", event);
      
      if (!isMounted) return;

      if (session?.user) {
        console.log("[Auth] User found:", session.user.email);
        const fullUser = await fetchProfileWithTimeout(session.user);
        console.log("[Auth] Complete, user_type:", fullUser?.user_type);
        
        if (isMounted) {
          setUser(fullUser);
          setIsLoadingAuth(false);
        }
      } else {
        console.log("[Auth] No user");
        if (isMounted) {
          setUser(null);
          setIsLoadingAuth(false);
        }
      }
    };

    // Set up listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        handleAuthChange('INITIAL_CHECK', session);
      }
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted && isLoadingAuth) {
        console.warn("[Auth] Global timeout - forcing complete");
        setIsLoadingAuth(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("[Auth] Sign out error:", error);
      setUser(null);
    }
  };

  const value = {
    user,
    isLoadingAuth,
    loading: isLoadingAuth,
    authError: null,
    isLoadingPublicSettings: false,
    signOut,
    navigateToLogin: () => { window.location.href = "/login"; },
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;