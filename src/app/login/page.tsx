'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        alert('Success! Check your email for the confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Successful login: check if there's a pending booking to return to
        const pending = localStorage.getItem('pendingBooking')
        if (pending) {
          try {
            const parsed = JSON.parse(pending)
            router.push(`/book/${parsed.slug}`)
          } catch (e) {
            router.push('/dashboard')
          }
        } else {
          router.push('/dashboard')
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">BookMe.io</h1>
          <p className="text-sm text-indigo-200 mt-1">
            {isSignUp ? 'Create your free account' : 'Sign in to your client portal'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white placeholder-gray-400 text-sm transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white placeholder-gray-400 text-sm transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition font-semibold rounded-xl shadow-lg shadow-indigo-600/30 text-sm disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-indigo-300 hover:text-white transition underline underline-offset-4"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up for Free"}
          </button>
        </div>
      </div>
    </div>
  )
}