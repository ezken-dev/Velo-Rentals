import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { X, Calendar as CalendarIcon, Clock, Car, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCar?: string;
  availableCars?: any[];
}

function CustomSelect({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (v: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3.5 text-white cursor-pointer flex items-center justify-between hover:border-white/20 transition-colors"
      >
        <span className={value ? 'text-white' : 'text-zinc-500'}>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute top-full mt-2 w-full bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 max-h-60 overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
          {options.map((opt, i) => (
            <div 
              key={i}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`p-3.5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${value === opt ? 'bg-[#d4ff32]/10 text-[#d4ff32]' : 'text-zinc-300'}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // Use today's date if no value is set, to display current calendar month
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [currentView, setCurrentView] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentView.getFullYear(), currentView.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentView.getFullYear(), currentView.getMonth(), 1).getDay();
  
  const handleSelectDate = (day: number) => {
    const d = new Date(currentView.getFullYear(), currentView.getMonth(), day);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    onChange(`${yr}-${mo}-${da}`);
    setOpen(false);
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() + 1, 1));
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() - 1, 1));
  };

  const formatDisplay = (val: string) => {
    if (!val) return placeholder;
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3.5 text-white cursor-pointer flex items-center justify-between hover:border-white/20 transition-colors"
      >
        <span className={value ? 'text-white' : 'text-zinc-500'}>{formatDisplay(value)}</span>
        <CalendarIcon size={16} className={`text-zinc-500 transition-colors ${open ? 'text-[#d4ff32]' : ''}`} />
      </div>
      {open && (
        <div className="absolute top-full mt-2 left-0 min-w-[280px] sm:w-80 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="font-semibold text-white">
              {currentView.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-zinc-500 py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(currentView.getFullYear(), currentView.getMonth(), day);
              const isPast = dateObj < today;
              
              let isSelected = false;
              if (value) {
                const valDate = new Date(value + 'T00:00:00');
                isSelected = dateObj.getTime() === valDate.getTime();
              }

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDate(day)}
                  className={`
                    w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                    ${isPast ? 'text-zinc-700 cursor-not-allowed' : 'hover:bg-white/10 text-white cursor-pointer'}
                    ${isSelected ? 'bg-[#d4ff32] text-black font-semibold hover:bg-[#c0eb20]' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Generate times from 00:00 to 23:30
const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hr = String(h).padStart(2, '0');
      const min = String(m).padStart(2, '0');
      times.push(`${hr}:${min}`);
    }
  }
  return times;
};
const TIME_OPTIONS = generateTimeOptions();

// Helper to format 24h to 12h for display
const formatTimeLabel = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 || 12;
  return `${displayHr}:${m} ${ampm}`;
};

function CustomTimePicker({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3.5 text-white cursor-pointer flex items-center justify-between hover:border-white/20 transition-colors"
      >
        <span className={value ? 'text-white' : 'text-zinc-500'}>{value ? formatTimeLabel(value) : placeholder}</span>
        <Clock size={16} className={`text-zinc-500 transition-colors ${open ? 'text-[#d4ff32]' : ''}`} />
      </div>
      {open && (
        <div className="absolute top-full mt-2 w-full bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 max-h-60 overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
          {TIME_OPTIONS.map((time, i) => (
            <div 
              key={i}
              onClick={() => { onChange(time); setOpen(false); }}
              className={`p-3.5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${value === time ? 'bg-[#d4ff32]/10 text-[#d4ff32]' : 'text-zinc-300'}`}
            >
              {formatTimeLabel(time)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookingModal({ isOpen, onClose, initialCar, availableCars = [] }: BookingModalProps) {
  const defaultCarNames = availableCars.map(c => c.name);
  const [car, setCar] = useState(initialCar || (defaultCarNames[0] || ''));
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) {
      setError('Please select a vehicle');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select both pick-up and drop-off dates');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please select both pick-up and drop-off times');
      return;
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (start >= end) {
      setError('End date and time must be after start date and time');
      return;
    }

    if (start < new Date()) {
      setError('Start date cannot be in the past');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check for clashes
      const bookingsRef = collection(db, 'bookings');
      // We need to check if there is any booking for this car that overlaps.
      // Overlap condition: existing.start < new.end AND existing.end > new.start
      
      const q = query(bookingsRef, where("car", "==", car));
      const querySnapshot = await getDocs(q);
      
      let hasClash = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const existingStart = data.start.toDate();
        const existingEnd = data.end.toDate();
        
        if (existingStart < end && existingEnd > start) {
          hasClash = true;
        }
      });

      if (hasClash) {
        setError('This car is already booked for the selected dates. Please choose different dates or another car.');
        setLoading(false);
        return;
      }

      // No clash, create booking
      await addDoc(bookingsRef, {
        car,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        userName: auth.currentUser?.displayName,
        createdAt: Timestamp.now(),
        status: 'pending'
      });

      setSuccess(true);
      
      // Send email using Web3Forms (Free tier, no backend required)
      // The user needs to add their Web3Forms Access Key to .env
      // @ts-ignore
      const web3FormsKey = import.meta.env.VITE_WEB3FORMS_KEY;
      
      if (web3FormsKey) {
        const subject = `New Booking Request: ${car}`;
        let body = `Hello VELO Rentals,\n\nI would like to request a booking for the following:\n\n`;
        body += `Car: ${car}\n`;
        body += `Pickup: ${start.toLocaleString()}\n`;
        body += `Drop-off: ${end.toLocaleString()}\n\n`;
        body += `Name: ${auth.currentUser?.displayName || 'N/A'}\n`;
        body += `Email: ${auth.currentUser?.email || 'N/A'}\n\n`;
        body += `Please confirm availability and send payment details to my email.\n\nThank you.`;

        try {
          await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              access_key: web3FormsKey,
              subject: subject,
              from_name: "VELO Rentals System",
              from_email: auth.currentUser?.email || "noreply@velorentals.com",
              message: body,
            }),
          });
        } catch (emailErr) {
          console.error("Failed to send automatic email:", emailErr);
          // We don't fail the booking if email fails, as we already recorded it in the database
        }
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message === "Missing or insufficient permissions." 
        ? "Permission Denied: Please update your Firestore Rules to allow creating bookings." 
        : err.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm p-4 text-center">
      <div className="fixed inset-0" onClick={onClose} />
      {/* Trick to center vertically but allow scrolling */}
      <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div className="relative inline-flex text-left align-middle bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg flex-col p-6 shadow-2xl my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-medium mb-6 tracking-tight flex items-center gap-2">
          Request Booking
        </h2>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#d4ff32]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#d4ff32]">
              <CalendarIcon size={32} />
            </div>
            <h3 className="text-xl font-medium mb-2">Request Sent!</h3>
            <p className="text-zinc-400 mb-6">
              Your booking request has been securely recorded. You will automatically receive a confirmation email shortly. We will contact you soon!
            </p>
            <button 
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Car size={16} /> Selected Vehicle
              </label>
              <CustomSelect
                options={defaultCarNames}
                value={car}
                onChange={setCar}
                placeholder="Select a car"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-50">
              <div className="space-y-2 relative z-50">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <CalendarIcon size={16} /> Pick-up Date
                </label>
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select Date"
                />
              </div>
              <div className="space-y-2 relative z-40">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Clock size={16} /> Time
                </label>
                <CustomTimePicker
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="Select Time"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-40">
              <div className="space-y-2 relative z-30">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <CalendarIcon size={16} /> Drop-off Date
                </label>
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select Date"
                />
              </div>
              <div className="space-y-2 relative z-20">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Clock size={16} /> Time
                </label>
                <CustomTimePicker
                  value={endTime}
                  onChange={setEndTime}
                  placeholder="Select Time"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#d4ff32] hover:bg-[#c0eb20] text-black font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? 'Checking Availability...' : 'Request Booking'}
            </button>
            <p className="text-xs text-center text-zinc-500">
              You will not be charged yet.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
