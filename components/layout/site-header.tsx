"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { MainNav } from "@/components/navigation/main-nav";
import { UserNav } from "@/components/navigation/user-nav";
import { ModeToggle } from "@/components/mode-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 mr-6">
            <Bot className="h-6 w-6" />
            <span className="font-bold">Social Autonomies</span>
          </Link>
          
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