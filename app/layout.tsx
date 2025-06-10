import "./globals.css";
import type { Metadata } from "next";
import { Inter, Martian_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { ConditionalHeader } from "@/components/layout/conditional-header";
import { CloudflareAnalytics } from '@/components/analytics/cloudfare-analytics';
import { Analytics } from "@vercel/analytics/next"

// Global error handlers for production safety
if (typeof window === 'undefined') {
  // Server-side error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // In production, you might want to report this to your error tracking service
  });

  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    // In production, gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
} else {
  // Client-side error handlers
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    // Prevent the default behavior (logging to console)
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('🚨 Uncaught Error:', event.error);
  });
}

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const martianMono = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-martian-mono',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800']
});

// Site constants
const siteTitle = "Social Autonomies";
const siteDescription = "10x your organic growth on X";

export const metadata: Metadata = {
  title: "Social Autonomies",
  description: siteDescription,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://socialautonomies.com/"),
  
  // Open Graph metadata
  openGraph: {
    type: 'website',
    title: "Social Autonomies",
    description: siteDescription,
    siteName: "Social Autonomies",
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: '10x your organic growth on X',
    }],
  },
  
  // Twitter metadata
  twitter: {
    card: 'summary_large_image',
    title: "Social Autonomies",
    description: siteDescription,
    images: ['/og-image.png'],
  },
  
  // Additional metadata
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/android-chrome-192x192.png',
      },
    ],
  },
  
  // Apple web app metadata
  appleWebApp: {
    title: siteTitle,
    statusBarStyle: 'black-translucent',
  },
  
  // Manifest
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${martianMono.variable}`}>
      <body className={"font-sans"}>
        <AuthProvider>
          <ConditionalHeader />
          {children}
          <Toaster />
          <Analytics />
        </AuthProvider>
        {process.env.NEXT_PUBLIC_CLOUDFLARE_TOKEN && <CloudflareAnalytics />}
      </body>
    </html>
  );
}