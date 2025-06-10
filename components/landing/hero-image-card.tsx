"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface HeroImageCardProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  index: number;
  onLoad: () => void;
  onError: () => void;
  isLoaded: boolean;
  hasError: boolean;
}

export function HeroImageCard({
  src,
  alt,
  width,
  height,
  index,
  onLoad,
  onError,
  isLoaded,
  hasError,
}: HeroImageCardProps) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 overflow-hidden rounded-lg border-2 shadow-xl transition-all duration-500",
        "aspect-[16/10] w-full bg-background/80 backdrop-blur",
        index === 0 && "top-0 z-30 -rotate-6 hover:rotate-0",
        index === 1 && "top-[15%] z-20 rotate-3 hover:rotate-0",
        index === 2 && "top-[30%] z-10 -rotate-3 hover:rotate-0",
        !isLoaded && !hasError && "opacity-0 translate-y-8",
        (isLoaded || hasError) && "opacity-100 translate-y-0"
      )}
      style={{
        borderColor: `hsl(var(--${
          index === 0 ? "accent-blue" : index === 1 ? "accent-purple" : "primary"
        }))`,
      }}
    >
      <div className="group relative h-full w-full overflow-hidden">
        {hasError ? (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Image unavailable</p>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            onLoad={onLoad}
            onError={onError}
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, 640px"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PC9zdmc+"
            className={cn(
              "h-full w-full object-cover transition-all duration-700",
              "group-hover:scale-105"
            )}
          />
        )}
      </div>
    </div>
  );
}