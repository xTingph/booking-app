'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface Booking {
  id: string
  user_email: string
  service_name: string
  booking_date: string
  booking_time: string
  status: string
  notes?: string
  created_at: string
}

function AdminDashboardContent() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  
  // Custom Services States
  const [services, setServices] = useState<any[]>([])
  const [serviceName, setServiceName] = useState('')
  const [serviceSlug, setServiceSlug] = useState('')
  const [servicePrice, setServicePrice] = useState('2500')
  const [serviceDays, setServiceDays] = useState('Monday to Friday')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const ADMIN_USER_EMAIL = 'markandrewtubog@gmail.com'

  // Fetch services on load
  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false })
    if (data) setServices(data)
  }

  useEffect(() => {
    setCurrentDate(new Date()) // Set client-side date safely

    async function verifyAdminAndFetch() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      if (user.email !== ADMIN_USER_EMAIL) {
        alert('Access Denied: You are not authorized to view the admin portal.')
        router.push('/dashboard')
        return
      }

      setAdminEmail(user.email)
      fetchAllBookings()
      fetchServices()
    }

    verifyAdminAndFetch()
  }, [router, supabase])

  const fetchAllBookings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })

    if (error) {
      console.error('Error fetching bookings:', error.message)
    } else if (data) {
      setBookings(data)
    }
    setLoading(false)
  }

  const saveNote = async (id: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ notes: noteInput })
      .eq('id', id)

    if (!error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, notes: noteInput } : b))
      )
      setEditingNoteId(null)
    } else {
      alert('Failed to save note: ' + error.message)
    }
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanSlug = serviceSlug.toLowerCase().replace(/\s+/g, '-')
    
    const { error } = await supabase.from('services').insert([
      {
        name: serviceName,
        slug: cleanSlug,
        price: parseFloat(servicePrice),
        available_days: serviceDays,
        start_time: startTime,
        end_time: endTime
      }
    ])

    if (!error) {
      alert('Booking link created successfully!')
      setServiceName('')
      setServiceSlug('')
      fetchServices()
    } else {
      alert('Error creating link: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- Date/Deadline Logic ---
  const todayStr = currentDate ? currentDate.toISOString().split('T')[0] : ''

  const getDaysUntil = (dateStr: string) => {
    if (!todayStr) return 999
    const today = new Date(todayStr).getTime()
    const target = new Date(dateStr).getTime()
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
  }

  // Urgent reminders calculation
  const urgentBookings = bookings.filter((b) => {
    const days = getDaysUntil(b.booking_date)
    return days >= 0 && days <= 2
  })

  // Calendar setup
  const year = currentDate ? currentDate.getFullYear() : new Date().getFullYear()
  const month = currentDate ? currentDate.getMonth() : new Date().getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const bookingsByDate = bookings.reduce((acc, b) => {
    if (b.booking_date) {
      acc[b.booking_date] = (acc[b.booking_date] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const filteredBookings = selectedDate
    ? bookings.filter((b) => b.booking_date === selectedDate)
    : bookings

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-12">
      {/* Navbar */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-rose-600/30">
              A
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">Admin Control Center</span>
              <span className="block text-xs text-rose-400 font-medium">Restricted Access</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-300 hidden sm:inline">{adminEmail}</span>
            <button 
              onClick={handleSignOut}
              className="text-sm font-medium text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 px-4 py-2 rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Client Bookings & Workflow</h1>
          <p className="text-sm text-slate-400 mt-1">Manage schedules, track upcoming appointment deadlines, and set reminders.</p>
        </div>

        {/* Custom Booking Links Generator Section */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">🔗 Create Custom Booking URL & Schedule</h2>
          
          <form onSubmit={handleCreateService} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Booking Name</label>
              <input
                type="text"
                placeholder="e.g. 1on1 Consultation"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">URL Slug</label>
              <input
                type="text"
                placeholder="e.g. 1on1-booking"
                value={serviceSlug}
                onChange={(e) => setServiceSlug(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Price (PHP)</label>
              <input
                type="number"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Available Days</label>
              <input
                type="text"
                value={serviceDays}
                onChange={(e) => setServiceDays(e.target.value)}
                placeholder="Monday to Friday"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time - End Time</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition"
              >
                + Generate Booking Link
              </button>
            </div>
          </form>

          {/* Active Links Table */}
          {services.length > 0 && (
            <div className="mt-6 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Active Custom Booking URLs</h3>
              <div className="space-y-2">
                {services.map((s) => {
                  const fullUrl = `${window.location.origin}/book/${s.slug}`
                  return (
                    <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 gap-2">
                      <div>
                        <span className="font-bold text-white text-sm">{s.name}</span>
                        <span className="block text-xs text-slate-400">🕒 {s.available_days} ({s.start_time} - {s.end_time}) | 💰 ₱{s.price}</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          readOnly
                          value={fullUrl}
                          className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 w-full sm:w-64"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(fullUrl)
                            alert('Copied URL to clipboard!')
                          }}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition shrink-0"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Urgent Deadlines Alert Banner */}
        {urgentBookings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Upcoming Appointment Reminders ({urgentBookings.length})
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  You have appointments scheduled today, tomorrow, or in the next 48 hours!
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {urgentBookings.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedDate(u.booking_date)}
                  className="text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-xl font-medium transition"
                >
                  📅 {u.booking_date} ({u.service_name})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Overview */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📅 Schedule Overview
              {selectedDate && (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-normal">
                  Filtered: {selectedDate}
                </span>
              )}
            </h2>

            <div className="flex items-center space-x-3">
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition"
                >
                  Clear Filter
                </button>
              )}
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition">◀</button>
                <span className="text-sm font-bold text-white min-w-[120px] text-center">
                  {monthNames[month]} {year}
                </span>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition">▶</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-900/20 border border-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const count = bookingsByDate[formattedDate] || 0
              const isSelected = selectedDate === formattedDate
              const daysDiff = getDaysUntil(formattedDate)

              return (
                <button
                  key={formattedDate}
                  onClick={() => setSelectedDate(isSelected ? null : formattedDate)}
                  className={`h-16 rounded-xl border p-2 flex flex-col justify-between text-left transition relative ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg'
                      : count > 0 && daysDiff >= 0 && daysDiff <= 2
                      ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                      : count > 0
                      ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500 text-slate-100'
                      : 'bg-slate-800/30 border-slate-700/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold">{dayNum}</span>
                  {count > 0 && (
                    <span className={`self-end text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      daysDiff >= 0 && daysDiff <= 2
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {count} {count === 1 ? 'booking' : 'bookings'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bookings & Notes Table */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">
            {selectedDate ? `Bookings for ${selectedDate}` : 'All Client Bookings'}
          </h2>
          <button
            onClick={fetchAllBookings}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            🔄 Refresh List
          </button>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading records...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm font-medium">
              No bookings found for the selected view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/90 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-4 px-6">Deadline Alert</th>
                    <th className="py-4 px-6">Client Email</th>
                    <th className="py-4 px-6">Service</th>
                    <th className="py-4 px-6">Date & Time</th>
                    <th className="py-4 px-6">Admin Reminder Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-sm">
                  {filteredBookings.map((b) => {
                    const days = getDaysUntil(b.booking_date)
                    return (
                      <tr key={b.id} className="hover:bg-slate-700/40 transition">
                        {/* Deadline Badge */}
                        <td className="py-4 px-6">
                          {days < 0 ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 font-medium">Passed</span>
                          ) : days === 0 ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold animate-pulse">🚨 Today!</span>
                          ) : days === 1 ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">⚠️ Tomorrow</span>
                          ) : days <= 3 ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">⏳ In {days} days</span>
                          ) : (
                            <span className="text-xs text-slate-400">In {days} days</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-medium text-white">{b.user_email || 'Unknown client'}</td>
                        <td className="py-4 px-6 text-slate-200">{b.service_name}</td>
                        <td className="py-4 px-6 text-slate-300">
                          <div>📅 {b.booking_date}</div>
                          <div className="text-xs text-slate-400">🕒 {b.booking_time}</div>
                        </td>

                        {/* Admin Notes/Reminder Input */}
                        <td className="py-4 px-6">
                          {editingNoteId === b.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                className="px-3 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder="Add reminder note..."
                              />
                              <button
                                onClick={() => saveNote(b.id)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-300 italic">
                                {b.notes ? `📝 ${b.notes}` : 'No note added'}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingNoteId(b.id)
                                  setNoteInput(b.notes || '')
                                }}
                                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                              >
                                {b.notes ? 'Edit' : '+ Add Note'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading admin portal...</div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}