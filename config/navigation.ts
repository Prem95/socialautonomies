import {
  LayoutDashboard,
  Bot,
  PlusCircle,
  Settings,
  CreditCard,
} from "lucide-react";
import type { NavItem } from "@/types/nav";

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        title: "Agents",
        href: "/dashboard/agents",
        icon: Bot,
      },
      {
        title: "Create Agent",
        href: "/dashboard/agents/new",
        icon: PlusCircle,
      },
    ],
  },
  {
    title: "User",
    items: [
      {
        title: "Profile",
        href: "/dashboard/profile",
        icon: Settings,
      },
      {
        title: "Pricing",
        href: "/pricing",
        icon: CreditCard,
      },
    ],
  },
];