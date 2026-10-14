'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '../../../lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

function PublicBookingContent() {
  const params = useParams()
  const slug = params?.slug as string
  const router = useRouter()
  const supabase = createClient()

  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [bookingTime, setBookingTime] = useState('10:00')
  const [submitting, setSubmitting] = useState(true) // Start true to check session first
  const [currentDate, setCurrentDate] = useState(new Date())

  // Trigger Stripe / GCash Checkout
  const triggerCheckout = async (serviceObj: any, date: string, time: string, email: string) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: serviceObj.name,
          bookingDate: date,
          bookingTime: time,
          price: serviceObj.price,
          userEmail: email,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Checkout error: ' + data.error)
        setSubmitting(false)
      }
    } catch (err: any) {
      alert('Error initiating checkout: ' + err.message)
      setSubmitting(false)
    }
  }

  useEffect(() => {
    async function init() {
      // 1. Fetch service details
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('slug', slug)
        .single()

      if (serviceData) {
        setService(serviceData)
      }
      setLoading(false)

      // 2. Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      const pending = localStorage.getItem('pendingBooking')

      if (user && pending) {
        try {
          const parsed = JSON.parse(pending)
          if (parsed.slug === slug && parsed.selectedDate) {
            // Clear pending storage so it doesn't loop
            localStorage.removeItem('pendingBooking')
            
            // Automatically redirect straight to payment page!
            triggerCheckout(serviceData, parsed.selectedDate, parsed.bookingTime, user.email ?? '')
            return
          }
        } catch (e) {
          console.error(e)
        }
      } else if (pending) {
        // If pending exists but user is still not logged in, restore inputs
        try {
          const parsed = JSON.parse(pending)
          if (parsed.slug === slug) {
            if (parsed.selectedDate) setSelectedDate(parsed.selectedDate)
            if (parsed.bookingTime) setBookingTime(parsed.bookingTime)
          }
        } catch (e) {}
      }
      setSubmitting(false)
    }

    if (slug) init()
  }, [slug, supabase])

  // Calendar Navigation Logic
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const todayStr = new Date().toISOString().split('T')[0]

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate) {
      alert('Please select a date from the calendar.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Save details and redirect to login
      localStorage.setItem('pendingBooking', JSON.stringify({ slug, selectedDate, bookingTime }))
      router.push('/login')
      return
    }

    // If already logged in, go straight to payment
    triggerCheckout(service, selectedDate, bookingTime, user.email ?? '')
  }

  if (loading || (submitting && localStorage.getItem('pendingBooking'))) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-3 font-medium">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Redirecting you to secure payment...</p>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-medium">
        Booking service not found or link is invalid.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-8">
        
        {/* Service Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Secure Booking Portal
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3">{service.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose an available date from the calendar and pick your preferred time slot to schedule your appointment.
          </p>
        </div>

        {/* Pricing & Availability Banner */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Available Working Schedule</span>
            <span className="text-sm font-semibold text-slate-200">🕒 {service.available_days} ({service.start_time} - {service.end_time})</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Service Fee</span>
            <span className="text-lg font-extrabold text-emerald-400">₱{service.price?.toLocaleString()} PHP</span>
          </div>
        </div>

        {/* Interactive Calendar Date Picker */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              📅 Selected Date: <span className="text-indigo-400 font-extrabold">{selectedDate || 'None chosen'}</span>
            </h3>
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition">◀</button>
              <span className="text-sm font-bold text-white min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition">▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12 rounded-xl bg-slate-900/20 border border-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const isSelected = selectedDate === formattedDate
              const isPast = formattedDate < todayStr

              return (
                <button
                  key={formattedDate}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(formattedDate)}
                  className={`h-12 rounded-xl border font-bold text-xs flex items-center justify-center transition ${
                    isPast
                      ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/40'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-slate-700'
                  }`}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Slot & Payment Form */}
        <form onSubmit={handleProceed} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Appointment Time Slot</label>
            <input
              type="time"
              value={bookingTime}
              min={service.start_time}
              max={service.end_time}
              onChange={(e) => setBookingTime(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
            <span className="block text-xs text-slate-400 mt-1.5">Permitted working hours: {service.start_time} to {service.end_time}</span>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedDate}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base shadow-xl shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting 
              ? 'Processing...' 
              : selectedDate 
              ? `Proceed to Payment & Book for ${selectedDate}` 
              : 'Please Select a Date from Calendar'}
          </button>
        </form>

      </div>
    </div>
  )
}

export default function PublicBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-medium">Loading booking portal...</div>}>
      <PublicBookingContent />
    </Suspense>
  )
}