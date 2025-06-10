"use client";

import Link from "next/link";
import { Bot, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/navigation/user-nav";
import { MainNav } from "@/components/navigation/main-nav";
import { ModeToggle } from "@/components/mode-toggle";

interface DashboardHeaderProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function DashboardHeader({ isMobile, sidebarOpen, setSidebarOpen }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center">
          {/* Mobile menu toggle - only on mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 mr-2"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          )}
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2 mr-6">
            <Bot className="h-6 w-6" />
            <span className="font-bold">Social Autonomies</span>
          </Link>
          
          {/* Main navigation - consistent with site header */}
          <div className="hidden md:block">
            <MainNav />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
} 