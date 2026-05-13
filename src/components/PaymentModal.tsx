import React, { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, QrCode, CreditCard, Clock, Building } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onPaymentSubmitted: () => void;
}

export function PaymentModal({ isOpen, onClose, booking, onPaymentSubmitted }: PaymentModalProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<'qr' | 'duitnow' | 'bank'>('qr');
  const [transactionId, setTransactionId] = useState('');
  const [transactionFile, setTransactionFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen || !booking || !booking.paymentExpiresAt || booking.status !== 'accepted') {
        setTimeLeft('');
        return;
    }

    const calcTime = () => {
      const now = new Date().getTime();
      
      let expiresAtTime = 0;
      if (typeof booking.paymentExpiresAt?.toDate === 'function') {
        expiresAtTime = booking.paymentExpiresAt.toDate().getTime();
      } else if (booking.paymentExpiresAt?.seconds) {
        expiresAtTime = booking.paymentExpiresAt.seconds * 1000;
      } else {
        expiresAtTime = new Date(booking.paymentExpiresAt).getTime();
      }
        
      const distance = expiresAtTime - now;

      if (distance <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00');
        handleExpire();
        return false;
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return true;
      }
    };

    const keepGoing = calcTime();
    if (!keepGoing) return;

    const timer = setInterval(() => {
      const shouldContinue = calcTime();
      if (!shouldContinue) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, booking]);

  const handleExpire = async () => {
    try {
      if (booking.status === 'accepted') {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: 'cancelled',
          cancelReason: 'Payment timeout'
        });
        onPaymentSubmitted(); // refresh parent
      }
    } catch (err) {
      console.error("Error setting expired:", err);
    }
  };

  const compressImage = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleSubmitPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!transactionId && !transactionFile) {
        alert("Please provide either a Transaction ID or upload a screenshot of your payment.");
        return;
    }
    setSubmitting(true);
    try {
      let screenshotBase64 = null;
      if (transactionFile) {
        screenshotBase64 = await compressImage(transactionFile);
      }

      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'pending_verification',
        paymentMethod: method,
        transactionId: transactionId,
        paymentScreenshot: screenshotBase64,
        paidAt: Timestamp.now()
      });

      // Send email
      // @ts-ignore
      const web3FormsKey = import.meta.env.VITE_WEB3FORMS_KEY;
      if (web3FormsKey) {
        // We do not send the file via Fetch FormData because Web3Forms AJAX does not support File attachments on the free tier via JS fetch.
        // Instead we send a normal JSON request just to notify the Admin. The image is saved in Firestore!
        const payload = {
          access_key: web3FormsKey,
          subject: `Payment Verification: ${booking.car}`,
          from_name: "VELO Rentals",
          email: booking.userEmail || "noreply@velorentals.com",
          message: `Booking Date: ${booking.start?.toDate().toLocaleString()}
User: ${booking.userName} (${booking.userEmail})
Car: ${booking.car}
Payment Method: ${method}
Transaction ID: ${transactionId || 'Uploaded Screenshot (View in Admin Panel)'}

Please check the Admin panel to verify the payment and confirm the booking!`
        };

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                console.error("Web3Forms error:", result);
                alert("Payment details saved, but failed to send email. " + (result.message || ""));
            }
        } catch (emailErr) {
            console.error("Failed to send payment email:", emailErr);
            alert("Payment details saved, but failed to send email due to a network error.");
        }
      } else {
        console.warn("VITE_WEB3FORMS_KEY is not configured. Admin email will not be sent.");
      }

      onPaymentSubmitted();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Error submitting payment request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-medium mb-2 tracking-tight">Complete Payment</h2>
        
        {isExpired ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-medium mb-2 text-white">Payment time expired</h3>
            <p className="text-zinc-400 text-sm mb-6">Your booking request has been cancelled due to payment timeout. Please create a new booking.</p>
            <button 
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center justify-between mb-6">
              <span className="text-sm font-medium">Time remaining to pay:</span>
              <span className="text-lg font-mono font-bold tracking-wider">{timeLeft}</span>
            </div>

            <div className="flex gap-2 p-1 bg-white/5 rounded-lg mb-6">
              <button 
                onClick={() => setMethod('qr')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${method === 'qr' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                DuitNow QR
              </button>
              <button 
                onClick={() => setMethod('duitnow')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${method === 'duitnow' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                DuitNow ID
              </button>
              <button 
                onClick={() => setMethod('bank')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${method === 'bank' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                Maybank
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center min-h-[240px] mb-6">
              {method === 'qr' && (
                <div className="text-center">
                  <div className="w-40 h-40 bg-white rounded-xl mx-auto flex items-center justify-center p-2 mb-4">
                    <QrCode size={120} className="text-black" />
                  </div>
                  <p className="text-sm text-zinc-400">Scan with any e-Wallet or Banking app</p>
                </div>
              )}
              {method === 'duitnow' && (
                <div className="text-center w-full">
                  <CreditCard size={48} className="mx-auto text-zinc-500 mb-4" />
                  <p className="text-sm text-zinc-400 mb-2">Transfer to DuitNow ID / Company Reg No</p>
                  <div className="bg-black/40 border border-white/10 p-4 rounded-lg flex items-center justify-between mt-2">
                    <span className="font-mono text-xl tracking-wider font-semibold">12345678V</span>
                    <button onClick={() => navigator.clipboard.writeText('12345678V')} className="text-xs bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors">Copy</button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4">Name: VELO Premium Rentals S/B</p>
                </div>
              )}
              {method === 'bank' && (
                <div className="text-center w-full">
                  <Building size={48} className="mx-auto text-zinc-500 mb-4" />
                  <p className="text-sm text-zinc-400 mb-2">Maybank Account Details</p>
                  <div className="bg-black/40 border border-white/10 p-4 rounded-lg flex items-center justify-between mt-2">
                    <span className="font-mono text-xl tracking-wider font-semibold">5123 4567 8901</span>
                    <button onClick={() => navigator.clipboard.writeText('512345678901')} className="text-xs bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors">Copy</button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4">Name: VELO Premium Rentals S/B</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 mt-auto">
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-400 mb-2">Transaction ID / Reference No.</label>
                <input 
                  type="text" 
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 1234567890" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#d4ff32] transition-colors text-sm"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-medium text-zinc-400 mb-2">Or Upload Screenshot</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setTransactionFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#d4ff32] file:text-black hover:file:bg-[#c0eb20]"
                />
              </div>
              
              <p className="text-[10px] text-zinc-500 mb-4 text-center">
                Please ensure you have completed the transfer and provided proof before submitting.
              </p>
              <button 
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="w-full bg-[#d4ff32] hover:bg-[#c0eb20] text-black font-semibold py-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Payment Proof'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
