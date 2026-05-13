import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CheckCircle2, Car, Clock, Calendar as CalendarIcon, DollarSign, XCircle, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { PaymentModal } from './PaymentModal';

interface MyBookingsProps {
  user: User;
}

export function MyBookings({ user }: MyBookingsProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const q = query(
      collection(db, 'bookings'), 
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setBookings(data);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch my bookings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancelBooking = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      setCancelConfirmId(null);
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      alert("Failed to cancel booking.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-32 min-h-screen">
      <div className="mb-12">
        <h2 className="text-4xl font-medium tracking-tight mb-2">My Bookings</h2>
        <p className="text-zinc-400">View and manage your car reservations.</p>
      </div>

      {loading ? (
        <div className="text-center text-zinc-400 py-12">Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-zinc-400">
          <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">You have no bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/10 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-medium">{b.car}</h3>
                  {b.status === 'confirmed' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] uppercase tracking-wider font-semibold">
                      <CheckCircle2 size={12} /> Confirmed
                    </div>
                  ) : b.status === 'pending_verification' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] uppercase tracking-wider font-semibold">
                      <DollarSign size={12} /> Verifying Payment
                    </div>
                  ) : b.status === 'accepted' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d4ff32]/10 text-[#d4ff32] text-[10px] uppercase tracking-wider font-semibold">
                      <DollarSign size={12} /> Payment Required
                    </div>
                  ) : b.status === 'cancelled' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] uppercase tracking-wider font-semibold">
                      <XCircle size={12} /> Cancelled
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-wider font-semibold">
                      <Clock size={12} /> Pending Request
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-zinc-400 mt-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-zinc-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Pick-up</div>
                      <div className="text-white font-medium">{b.start?.toDate().toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-zinc-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Drop-off</div>
                      <div className="text-white font-medium">{b.end?.toDate().toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-auto p-4 bg-black/20 rounded-xl border border-white/5 flex flex-col items-center justify-center shrink-0 min-w-[200px]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Status</div>
                <div className="text-white font-medium capitalize mb-2 text-center text-sm">{b.status?.replace('_', ' ') || 'Pending'}</div>
                {b.status === 'accepted' && (
                  <button 
                    onClick={() => setSelectedBooking(b)}
                    className="w-full bg-[#d4ff32] hover:bg-[#c0eb20] text-black font-semibold py-2 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2"
                  >
                    Pay Now <Clock size={12} />
                  </button>
                )}
                {b.status === 'pending_verification' && (
                  <p className="text-xs text-orange-400 mt-1 text-center">Admin checking payment...</p>
                )}
                {b.status === 'confirmed' && (
                  <p className="text-xs text-green-400 mt-1 text-center">Ready for pickup!</p>
                )}
                {b.status === 'refunded' && (
                  <p className="text-xs text-zinc-400 mt-1 text-center">Payment refunded</p>
                )}
                {b.status === 'cancelled' && (
                  <p className="text-xs text-red-500 mt-1 text-center">Cancelled</p>
                )}
                
                {b.status !== 'cancelled' && b.status !== 'refunded' && b.status !== 'confirmed' && (
                  <div className="mt-3">
                    {processingId === b.id ? (
                      <div className="flex items-center gap-2 text-zinc-400 text-xs px-2 py-1.5">
                        <Loader2 size={14} className="animate-spin" /> Processing...
                      </div>
                    ) : cancelConfirmId === b.id ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Are you sure?</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCancelBooking(b.id)}
                            className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all active:scale-95"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={() => setCancelConfirmId(null)}
                            className="bg-white/10 text-white hover:bg-white/20 px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all active:scale-95"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setCancelConfirmId(b.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-medium uppercase tracking-wider transition-all active:scale-95"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBooking && (
        <PaymentModal 
          isOpen={!!selectedBooking}
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onPaymentSubmitted={() => {
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}
