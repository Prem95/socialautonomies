"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
// import { useAuth } from "@/contexts/auth-context";

export function MainNav() {
  const pathname = usePathname();
  // const { user } = useAuth();

  // Fixed navigation items with Dashboard removed
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="flex items-center space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm transition-colors hover:text-foreground",
            pathname === item.href
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}