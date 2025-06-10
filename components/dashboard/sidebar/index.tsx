"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavGroup } from "./nav-group";
import { navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [isCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-white",
        "h-[calc(100vh-4rem)]", // Account for header height (64px = 4rem)
        isCollapsed ? "w-16" : "w-64",
        "transition-all duration-300"
      )}
    >
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-4">
          {navigation.map((group, i) => (
            <NavGroup key={i} group={group} isCollapsed={isCollapsed} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}