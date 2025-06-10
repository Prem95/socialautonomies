import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // If there was an OAuth or OTP error
  if (error) {
    console.error("Auth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Exchange code error:", error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
        );
      }

      // Verify user is properly authenticated using secure getUser() method
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (user && !userError) {
        // Force redirect to dashboard on successful authentication
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      } else {
        // If user verification fails
        console.error("User verification failed:", userError);
        return NextResponse.redirect(new URL("/login?error=user_verification_failed", requestUrl.origin));
      }
    } catch (error) {
      // Handle unexpected errors
      console.error("Auth callback error:", error);
      return NextResponse.redirect(new URL("/login?error=auth_callback_failed", requestUrl.origin));
    }
  }

  // No code or errors, redirect to login
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}