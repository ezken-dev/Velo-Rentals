import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, Timestamp, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, Search as SearchIcon, Users, Car, Clock, XCircle, DollarSign, Loader2, MessageCircle } from 'lucide-react';
import { FleetManager } from './FleetManager';
import { AdminChat } from './AdminChat';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'fleet' | 'chat'>('bookings');
  
  const [bookings, setBookings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [refundConfirmId, setRefundConfirmId] = useState<string | null>(null);
  const [paymentFailedConfirmId, setPaymentFailedConfirmId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'bookings') {
      setLoading(true);
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookings(data);
        setLoading(false);
      }, (error) => {
        console.error("Failed to fetch bookings:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [activeTab]);

  const handleAccept = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins for payment
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'accepted',
        paymentExpiresAt: Timestamp.fromDate(expiresAt)
      });
    } catch (err: any) {
      console.error("Error accepting booking:", err);
      alert("Failed to accept booking. Check your Firebase Security Rules.\nError: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmPayment = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed'
      });
    } catch (err: any) {
      console.error("Error confirming payment:", err);
      alert("Failed to confirm payment.");
    } finally {
      setProcessingId(null);
    }
  };

  const sendAutomatedEmail = async (to: string, subject: string, text: string) => {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('Failed to send email via backend API (ensure SMTP env vars are set).');
        alert('Email sending failed: ' + (data.error || 'Check server logs'));
      }
    } catch (e) {
      console.error('Network error calling email API:', e);
      alert('Network error when attempting to send email.');
    }
  };

  const handleCancel = async (bookingId: string) => {
    setProcessingId(bookingId);
    const booking = bookings.find(b => b.id === bookingId);
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      setCancelConfirmId(null);
      if (booking?.userEmail) {
        const subject = `Booking Cancelled: ${booking.car} at VELO Rentals`;
        const body = `Hello ${booking.userName || 'Customer'},\n\nUnfortunately, your booking for the ${booking.car} has been cancelled.\n\nIf you have any questions, please reply to this email.\n\nBest regards,\nVELO Rentals Team`;
        await sendAutomatedEmail(booking.userEmail, subject, body);
      }
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      alert("Failed to cancel booking.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefund = async (bookingId: string) => {
    setProcessingId(bookingId);
    const booking = bookings.find(b => b.id === bookingId);
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      setRefundConfirmId(null);
      if (booking?.userEmail) {
        const subject = `Booking Refunded: ${booking.car} at VELO Rentals`;
        const body = `Hello ${booking.userName || 'Customer'},\n\nYour booking for the ${booking.car} has been refunded successfully.\n\nIf you have any questions, please reply to this email.\n\nBest regards,\nVELO Rentals Team`;
        await sendAutomatedEmail(booking.userEmail, subject, body);
      }
    } catch (err: any) {
      console.error("Error refunding booking:", err);
      alert("Failed to refund booking.");
    } finally {
      setProcessingId(null);
    }
  };

  const handlePaymentFailed = async (bookingId: string) => {
    setProcessingId(bookingId);
    const booking = bookings.find(b => b.id === bookingId);
    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins for payment again
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'accepted',
        paymentExpiresAt: Timestamp.fromDate(expiresAt),
        transactionId: null
      });
      setPaymentFailedConfirmId(null);
      if (booking?.userEmail) {
        const subject = `Payment Issue: ${booking.car} Booking at VELO Rentals`;
        const body = `Hello ${booking.userName || 'Customer'},\n\nWe encountered an issue verifying your payment for the ${booking.car}. Please check your payment details and submit again. You have 15 minutes to retry the payment.\n\nIf you have any questions, please reply to this email.\n\nBest regards,\nVELO Rentals Team`;
        await sendAutomatedEmail(booking.userEmail, subject, body);
      }
    } catch (err: any) {
      console.error("Error marking payment failed:", err);
      alert("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.car?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-12 min-h-screen">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 w-full max-w-full overflow-hidden">
        <div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-2">Admin Dashboard</h2>
          <p className="text-sm md:text-base text-zinc-400">Manage your business operations.</p>
        </div>
        
        <div className="flex overflow-x-auto tailwind-scrollbar-hide bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 w-full relative touch-pan-x snap-x snap-mandatory">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`whitespace-nowrap shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-colors snap-start ${activeTab === 'bookings' ? 'bg-[#d4ff32] text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            Bookings
          </button>
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`whitespace-nowrap shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-colors snap-start ${activeTab === 'fleet' ? 'bg-[#d4ff32] text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            Fleet Management
          </button>
          <button 
            onClick={() => {
              setActiveTab('chat');
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
              }
            }}
            className={`whitespace-nowrap shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-colors snap-start ${activeTab === 'chat' ? 'bg-[#d4ff32] text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            Live Chat
          </button>
        </div>
      </div>

      {activeTab === 'bookings' ? (
        <>
          <div className="flex flex-col md:flex-row justify-end mb-6">
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Search bookings by email, name or car..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#d4ff32] transition-colors"
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            {loading ? (
          <div className="p-12 text-center text-zinc-400">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">User</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Car</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Duration</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{b.userName || 'N/A'}</div>
                      <div className="text-xs text-zinc-500">{b.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Car size={14} className="text-zinc-500" />
                        <span>{b.car}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <span className="w-12">From:</span>
                          <span className="text-white">{b.start?.toDate().toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-12">To:</span>
                          <span className="text-white">{b.end?.toDate().toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {b.status === 'confirmed' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                          <CheckCircle2 size={12} /> Confirmed
                        </div>
                      ) : b.status === 'pending_verification' ? (
                        <div className="flex flex-col gap-1 items-start">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">
                            <DollarSign size={12} /> Verifying Payment
                          </div>
                          {b.transactionId && (
                            <span className="text-[10px] text-zinc-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                              Ref: {b.transactionId}
                            </span>
                          )}
                          {b.paymentScreenshot && (
                            <button 
                              onClick={() => setSelectedImage(b.paymentScreenshot)}
                              className="text-[10px] text-[#d4ff32] hover:text-[#c0eb20] mt-1 underline"
                            >
                              View Screenshot
                            </button>
                          )}
                        </div>
                      ) : b.status === 'accepted' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d4ff32]/10 text-[#d4ff32] text-xs font-medium">
                          <Clock size={12} /> Awaiting Payment
                        </div>
                      ) : b.status === 'refunded' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium">
                          <XCircle size={12} /> Refunded
                        </div>
                      ) : b.status === 'cancelled' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                          <XCircle size={12} /> Cancelled
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                          <Clock size={12} /> Pending Request
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-2 items-end">
                        {processingId === b.id ? (
                          <div className="flex items-center gap-2 text-zinc-400 text-xs px-2 py-1.5">
                            <Loader2 size={14} className="animate-spin" /> Processing...
                          </div>
                        ) : (
                          <>
                            {(b.status === 'pending' || !b.status) && (
                              <button 
                                onClick={() => handleAccept(b.id)}
                                className="bg-[#d4ff32] text-black px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-[#c0eb20] transition-all active:scale-95"
                              >
                                Accept
                              </button>
                            )}
                            {b.status === 'pending_verification' && (
                              <>
                                <button 
                                  onClick={() => handleConfirmPayment(b.id)}
                                  className="bg-green-500 text-black px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-green-400 transition-all active:scale-95"
                                >
                                  Confirm Paid
                                </button>
                                {paymentFailedConfirmId === b.id ? (
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handlePaymentFailed(b.id)}
                                      className="bg-orange-500 text-black px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-orange-400 transition-all active:scale-95"
                                    >
                                      Yes, Fail It
                                    </button>
                                    <button 
                                      onClick={() => setPaymentFailedConfirmId(null)}
                                      className="bg-zinc-600 text-white px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-500 transition-all active:scale-95"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setPaymentFailedConfirmId(b.id)}
                                    className="bg-orange-500 text-black px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-orange-400 transition-all active:scale-95"
                                  >
                                    Payment Not Received
                                  </button>
                                )}
                              </>
                            )}
                            {b.status === 'confirmed' && (
                              cancelConfirmId === b.id ? null : refundConfirmId === b.id ? (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleRefund(b.id)}
                                    className="bg-zinc-700 text-white px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-600 transition-all active:scale-95"
                                  >
                                    Confirm Refund
                                  </button>
                                  <button 
                                    onClick={() => setRefundConfirmId(null)}
                                    className="bg-zinc-600 text-white px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-500 transition-all active:scale-95"
                                  >
                                    Back
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setRefundConfirmId(b.id)}
                                  className="bg-zinc-700 text-white px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-600 transition-all active:scale-95"
                                >
                                  Refund
                                </button>
                              )
                            )}
                            {b.status !== 'cancelled' && b.status !== 'refunded' && (
                              refundConfirmId === b.id ? null : cancelConfirmId === b.id ? (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleCancel(b.id)}
                                    className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-red-600 transition-all active:scale-95"
                                  >
                                    Confirm Cancel
                                  </button>
                                  <button 
                                    onClick={() => setCancelConfirmId(null)}
                                    className="bg-zinc-600 text-white px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-500 transition-all active:scale-95"
                                  >
                                    Back
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setCancelConfirmId(b.id)}
                                  className="bg-red-500/20 text-red-500 px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider hover:bg-red-500/30 transition-all active:scale-95"
                                >
                                  Cancel
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl w-full">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-zinc-300"
            >
              <XCircle size={32} />
            </button>
            <img src={selectedImage} alt="Payment Screenshot" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
      </>
      ) : activeTab === 'fleet' ? (
        <FleetManager />
      ) : (
        <AdminChat />
      )}
    </div>
  );
}
