import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const initializedRef = useRef(false);

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

    const initAuth = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        setIsLoadingAuth(false);
        const fullUser = await fetchProfile(session.user);
        if (isMounted) setUser(fullUser);
      } else {
        setUser(null);
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || event === 'INITIAL_SESSION') return;

      if (session?.user) {
        setUser(session.user);
        const fullUser = await fetchProfile(session.user);
        if (isMounted) setUser(fullUser);
      } else {
        setUser(null);
      }
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

export default AuthContext;
