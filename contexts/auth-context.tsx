"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session and user
    const initializeAuth = async () => {
      setIsLoading(true);
      let isMounted = true; // Flag to prevent state updates after unmount

      try {
        // Use the secure getUser() method to get verified user data
        const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
        
        if (isMounted) {
          if (!userError && verifiedUser) {
            setUser(verifiedUser);
            // Get session only after user verification succeeds
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
          } else {
            setUser(null);
            setSession(null);
          }
        }

        // Subscribe to auth changes - but don't call getUser() again if we already did it
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event, newSession?.user?.id);
            
            // Only update if mounted
            if (!isMounted) return;
            
            // Only fetch user when session actually changes to prevent loops
            if (event !== 'INITIAL_SESSION') {
              if (newSession) {
                // Verify user with secure getUser() method
                const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
                if (isMounted && !userError && verifiedUser) {
                  setUser(verifiedUser);
                  setSession(newSession);
                } else {
                  setUser(null);
                  setSession(null);
                }
              } else {
                setUser(null);
                setSession(null);
              }
              
              router.refresh();
            }
          }
        );

        return () => {
          isMounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();
  }, []); // Remove router and supabase dependencies to prevent unnecessary re-renders

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // After sign up, create a profile
      // Use the verified user data from the signup response
      if (data.user) {
        try {
          // Create profile in our database
          const response = await fetch('/api/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create profile');
          }
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Clear the auth state in the context
      setUser(null);
      setSession(null);

      // Sign out from Supabase (clears the session cookie)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Force a refresh to clear any cached state
      router.refresh();
      
      // Then redirect to login page
      router.push('/login');
      
      // Fixed return type to properly match Promise<void>
      return Promise.resolve();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 