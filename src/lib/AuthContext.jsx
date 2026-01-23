import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

async function fetchUserWithProfile(authUser) {
  if (!authUser) return null;
  try {
    const { data: profile } = await supabase.from("users").select("*").eq("id", authUser.id).single();
    return { ...authUser, ...profile };
  } catch (error) {
    return authUser;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userWithProfile = await fetchUserWithProfile(session?.user);
      setUser(userWithProfile);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      const userWithProfile = await fetchUserWithProfile(session?.user);
      setUser(userWithProfile);
    });

    return () => subscription.unsubscribe();
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
