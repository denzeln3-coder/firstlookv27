import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false); // Start false - don't block render

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (authUser) => {
      if (!authUser) return null;
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();
        return profile ? { ...authUser, ...profile } : { ...authUser, user_type: null };
      } catch {
        return { ...authUser, user_type: null };
      }
    };

    const handleAuthChange = async (event, session) => {
      if (!isMounted) return;
      
      if (session?.user) {
        // Set user immediately with basic info, then fetch profile
        setUser(session.user);
        const fullUser = await fetchProfile(session.user);
        if (isMounted) setUser(fullUser);
      } else {
        setUser(null);
      }
      setIsLoadingAuth(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Quick initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) handleAuthChange('INITIAL', session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoadingAuth,
      loading: isLoadingAuth,
      authError: null,
      isLoadingPublicSettings: false,
      signOut,
      navigateToLogin: () => { window.location.href = "/login"; },
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}
