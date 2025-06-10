import { Bot } from "lucide-react";

export function FeatureHero() {
  return (
    <div className="relative space-y-4 pb-12 pt-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent-blue/10 to-accent-purple/10 animate-gradient bg-[length:200%_auto]" />
      </div>
      
      <div className="inline-flex items-center rounded-full border bg-background/95 px-3 py-1 text-sm backdrop-blur">
        <Bot className="mr-2 h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Powered by Advanced AI</span>
      </div>

      <h1 className="font-heading text-4xl tracking-tight md:text-5xl lg:text-6xl">
        Enhance Your Social Media Management with{" "}
        <span className="text-gradient animate-gradient bg-[length:200%_auto]">
          Cutting-Edge Features
        </span>
      </h1>

      <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
        Experience the future of social media management with our comprehensive suite of AI-powered tools
        designed to boost your engagement and save you time.
      </p>
    </div>
  );
}