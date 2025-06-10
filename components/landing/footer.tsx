import Link from "next/link";
import { Bot } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="container py-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <Link href="/" className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Social Autonomies</span>
          </Link>
          <p className="text-base">
            Built with ❤️ for everyone - let's talk at{' '}
            <a
              href="https://x.com/defichemist95"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-green-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-2 animate-pulse hover:text-green-800"
            >
              @defichemist95
            </a>
          </p>
        </div>
        <div className="mt-12 border-t pt-8 text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
              Pricing
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Social Autonomies. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}