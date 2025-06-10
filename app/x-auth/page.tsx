'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'

// Create a wrapper component for the search params
function XAuthContent() {
  const params = useSearchParams()
  const router = useRouter()
  const success = params.get('oauth_success')
  const error = params.get('oauth_error')

  useEffect(() => {
    if (success) console.log('✅ OAuth succeeded')
    if (error) console.error('❌ OAuth error:', error)
  }, [success, error])

  async function handleLogin() {
    try {
      // Hit our Next.js API route to get the authUrl
      const res = await fetch('/api/x-auth/initiate');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to initiate: ${res.statusText}`);
      }
      const { authUrl } = await res.json();
      if (!authUrl) {
        throw new Error("No authorization URL received from server.");
      }
      // Redirect the current window to the X authorization page
      window.location.href = authUrl;
    } catch (err) {
      console.error("Failed to start login process:", err);
      // Display error to user?
      alert(`Error starting login: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">X Authentication</h1>
      {success ? (
        <div className="text-green-500 mb-4">✅ Authentication successful</div>
      ) : error ? (
        <div className="text-red-500 mb-4">❌ Error: {error}</div>
      ) : (
        <Button onClick={handleLogin}>Connect with X</Button>
      )}
    </div>
  )
}

// Wrap with Suspense in the main component
export default function XAuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <XAuthContent />
    </Suspense>
  )
} 