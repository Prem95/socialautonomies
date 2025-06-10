"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./client";

export function useAuthRedirect() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.refresh();
        router.push("/dashboard");
      }
      if (event === "SIGNED_OUT") {
        router.refresh();
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);
}