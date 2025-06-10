"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  title: string;
  isCollapsed: boolean;
}

export function NavItem({ href, icon: Icon, title, isCollapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const linkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
        "hover:bg-slate-100/80 hover:scale-[1.02]",
        isActive 
          ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 shadow-sm border border-amber-200/50" 
          : "text-slate-600 hover:text-slate-900",
        isCollapsed && "justify-center px-2 py-2"
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-lg transition-all duration-200",
        isActive
          ? "bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-md"
          : "text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200/50",
        isCollapsed ? "h-8 w-8" : "h-7 w-7"
      )}>
        <Icon className={cn("transition-transform duration-200 group-hover:scale-110", isCollapsed ? "h-4 w-4" : "h-4 w-4")} />
      </div>
      
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="truncate font-medium"
        >
          {title}
        </motion.span>
      )}
      
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="activeIndicator"
          className="ml-auto w-1.5 h-1.5 bg-amber-600 rounded-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="w-full">
              {linkContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}