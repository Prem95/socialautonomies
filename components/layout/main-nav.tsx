"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

const publicNavItems = [
  { title: "Home", href: "/" },
  { title: "Pricing", href: "/pricing" },
  { title: "Privacy", href: "/privacy" },
  // { title: "Dashboard", href: "/dashboard" },
];

const authNavItems = [
  { title: "Home", href: "/" },
  { title: "Pricing", href: "/pricing" },
  { title: "Privacy", href: "/privacy" },
];

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Choose navigation items based on auth state
  const navItems = user ? authNavItems : publicNavItems;

  return (
    <NavigationMenu className="mr-6">
      <NavigationMenuList className="gap-6">
        {navItems.map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary px-4 py-2",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.title}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

// function UserNavDropdown({ user }: { user: any }) {
//   const userInitial = user.email ? user.email[0].toUpperCase() : "U";
  
//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="relative h-8 w-8 rounded-full">
//           <Avatar className="h-8 w-8">
//             <AvatarFallback>{userInitial}</AvatarFallback>
//           </Avatar>
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent className="w-56" align="end" forceMount>
//         <DropdownMenuLabel className="font-normal">
//           <div className="flex flex-col space-y-1">
//             <p className="text-sm font-medium leading-none">{user.email}</p>
//             <p className="text-xs leading-none text-muted-foreground">
//               {user.email}
//             </p>
//           </div>
//         </DropdownMenuLabel>
//         <DropdownMenuSeparator />
//         <SignOutButton variant="ghost" />
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }