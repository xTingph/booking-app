'use client'
import { createClient } from '../../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'

interface Booking {
  id: string
  service_name: string
  booking_date: string
  booking_time: string
  status: string
  user_email: string
}

function DashboardContent() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [service, setService] = useState('1-on-1 Consultation')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00 AM')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const processedRef = useRef(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const userEmail = user.email ?? ''
      setUser(user)
      fetchBookings(user.id)

      // Check if redirected back from successful Stripe payment
      const success = searchParams.get('success')
      const paidService = searchParams.get('service')
      const paidDate = searchParams.get('date')
      const paidTime = searchParams.get('time')

      if (
        success === 'true' &&
        paidService &&
        paidDate &&
        paidTime &&
        !processedRef.current
      ) {
        // Mark as processed immediately so StrictMode/re-renders can't run it again
        processedRef.current = true

        // Clean the URL parameters right away
        router.replace('/dashboard')

        // 1. Save booking to Supabase
        const { error } = await supabase.from('bookings').insert([
          {
            user_id: user.id,
            user_email: userEmail,
            service_name: paidService,
            booking_date: paidDate,
            booking_time: paidTime,
            status: 'Confirmed (Paid)',
          },
        ])

        if (!error) {
          // 2. Safely trigger Google Calendar event via server API
          try {
            await fetch('/api/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceName: paidService,
                userEmail,
                bookingDate: paidDate,
                bookingTime: paidTime,
              }),
            })
          } catch (calErr) {
            console.error('Failed to trigger calendar event:', calErr)
          }

          alert('Payment successful! Your booking has been confirmed and added to your calendar.')
          fetchBookings(user.id)
        } else {
          console.error('Error inserting booking:', error.message)
        }
      }
    }

    loadData()
  }, [router, supabase, searchParams])

  const fetchBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setBookings(data)
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: service,
          bookingDate: date,
          bookingTime: time,
          userId: user.id,
          userEmail: user.email,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url // Redirect to Stripe Checkout
      } else {
        alert('Error initiating checkout: ' + (data.error || 'Unknown error'))
        setLoading(false)
      }
    } catch (err: any) {
      alert('Checkout error: ' + err.message)
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              B
            </div>
            <span className="font-bold text-lg text-slate-800">Client Portal</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 hidden sm:inline">{user?.email}</span>
            <button 
              onClick={handleSignOut}
              className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Dashboard & Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule consultations securely with Stripe checkout.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xs border border-slate-200 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              New Appointment ($50)
            </h2>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Select Service</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-800"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  <option>1-on-1 Consultation</option>
                  <option>General Support Session</option>
                  <option>Strategy Review</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-800"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Time Slot</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-800"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                >
                  <option>09:00 AM</option>
                  <option>10:00 AM</option>
                  <option>02:00 PM</option>
                  <option>04:00 PM</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-md shadow-indigo-600/20 text-sm mt-2 disabled:opacity-50"
              >
                {loading ? 'Redirecting to Stripe...' : 'Pay $50 & Book'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Your Scheduled Bookings
            </h2>
            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm font-medium">No paid bookings found yet.</p>
                <p className="text-xs text-slate-400 mt-1">Complete a payment to schedule your first appointment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition hover:border-indigo-200">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{b.service_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">📅 {b.booking_date} at 🕒 {b.booking_time}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold capitalize w-fit">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}