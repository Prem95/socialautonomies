"use client";

import NextLink from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface LinkProps extends React.ComponentPropsWithoutRef<typeof NextLink> {
  className?: string;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <NextLink
        className={cn(
          "inline-flex items-center hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Link.displayName = "Link";

export { Link }; 