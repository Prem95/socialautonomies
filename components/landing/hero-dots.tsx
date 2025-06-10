"use client";

export function HeroDots() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-0 ml-[-38rem] h-[25rem] w-[81.25rem] dark:[mask-image:linear-gradient(white,transparent)]">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/20 opacity-100">
          <svg
            viewBox="0 0 1113 440"
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 ml-[-19rem] w-[69.5625rem] -translate-x-1/2 -translate-y-1/2 transform-gpu blur-2xl"
          >
            <path
              fill="url(#dot-pattern)"
              fillOpacity=".4"
              d="M.016 439.5s-9.5-300 434-300S882.516 20 882.516 20V0h230.004v439.5H.016Z"
            />
          </svg>
        </div>
        <div className="absolute inset-0 bg-grid-primary/10 [mask-image:linear-gradient(transparent,white)]" />
      </div>
      <div className="grid grid-cols-8 gap-4 md:grid-cols-12 lg:grid-cols-16">
        {Array.from({ length: 192 }).map((_, i) => (
          <div key={i} className="hero-dot animate-float" style={{
            animationDelay: `${Math.random() * 2}s`
          }} />
        ))}
      </div>
    </div>
  );
}