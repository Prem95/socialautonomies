"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { DashboardHeader } from "./dashboard-header";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setSidebarOpen(window.innerWidth >= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {/* Dashboard Header - includes navigation and mobile menu toggle */}
      <DashboardHeader 
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Container - Fixed positioning with proper z-index */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 transition-transform duration-300",
          "top-16", // Account for header height
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && isMobile && "hidden"
        )}>
          <Sidebar />
        </div>
        
        {/* Mobile overlay when sidebar is open */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden top-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main content with proper left margin to account for sidebar */}
        <main className={cn(
          "flex-1 overflow-y-auto transition-all duration-300",
          sidebarOpen && !isMobile ? "md:ml-0" : "ml-0",
          "relative"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}