'use client';

import Script from 'next/script';

const CLOUDFLARE_TOKEN = process.env.NEXT_PUBLIC_CLOUDFLARE_TOKEN;

export const CloudflareAnalytics = () => {
  if (!CLOUDFLARE_TOKEN) {
    // It's good practice to log a warning if the token is missing,
    // but only in development to avoid console noise in production.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Cloudflare Analytics token is missing. Set NEXT_PUBLIC_CLOUDFLARE_TOKEN environment variable.'
      );
    }
    return null;
  }

  return (
    <>
      {/* Cloudflare Web Analytics */}
      <Script
        strategy="afterInteractive"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={`{"token": "${CLOUDFLARE_TOKEN}"}`}
        defer // The defer attribute is handled by the strategy, but explicit for clarity
      />
      {/* End Cloudflare Web Analytics */}
    </>
  );
};
