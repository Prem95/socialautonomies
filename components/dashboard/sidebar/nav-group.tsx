"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./nav-item";
import { motion, AnimatePresence } from "framer-motion";
import type { NavItem as NavItemType } from "@/types/nav";

interface NavGroupProps {
  group: {
    title: string;
    items: NavItemType[];
  };
  isCollapsed: boolean;
}

export function NavGroup({ group, isCollapsed }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-1">
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2.5",
              "text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/60",
              "transition-all duration-200 group"
            )}
          >
            <span className="uppercase tracking-wider">{group.title}</span>
            <motion.div
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
      
      <AnimatePresence initial={false}>
        {(isOpen || isCollapsed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid gap-1 pt-1">
              {group.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <NavItem {...item} isCollapsed={isCollapsed} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}