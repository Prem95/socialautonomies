"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Don't show header on dashboard pages
  const isDashboard = pathname?.startsWith("/dashboard");
  
  if (isDashboard) {
    return null;
  }
  
  return <SiteHeader />;
} 