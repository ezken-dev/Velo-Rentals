import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageCircle, X, Send } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'react-hot-toast';

interface LiveChatProps {
  user: FirebaseUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LiveChat({ user, isOpen, onOpenChange }: LiveChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/Velo%20notification.mp3');
  }, []);

  const handleOpenToggle = () => {
    if (!isOpen) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
    onOpenChange(!isOpen);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 800);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    
    const messagesRef = collection(db, 'chat_sessions', user.uid, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMessages(msgs);
      
      if (!initialLoadRef.current) {
        const newAdminMessages = snapshot.docChanges().filter(change => 
          change.type === 'added' && change.doc.data().sender === 'admin'
        );
        
        if (newAdminMessages.length > 0) {
          audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
          newAdminMessages.forEach(change => {
            const msg = change.doc.data().text || 'New message from VELO';
            toast('VELO Concierge', { icon: '💬', style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('VELO Concierge', { body: msg });
            }
          });
        }
      } else {
        initialLoadRef.current = false;
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const sessionRef = doc(db, 'chat_sessions', user.uid);
      const sessionData = {
        userId: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        unreadAdmin: true,
        status: 'active'
      };

      // Always ensure the session doc exists/is up-to-date
      await setDoc(sessionRef, sessionData, { merge: true });

      // Add the message to subcollection
      await addDoc(collection(db, 'chat_sessions', user.uid, 'messages'), {
        text: msgText,
        sender: 'user',
        createdAt: serverTimestamp()
      });

      // If it's the very first message they send, optionally notify admin
      if (messages.length === 0) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            to: 'velocarrentals@gmail.com', 
            subject: 'New Live Chat Request from ' + (user.displayName || 'User'), 
            text: `A new user wants to chat.\n\nName: ${user.displayName || 'User'}\nEmail: ${user.email}\n\nLog in to the Admin Panel to reply.` 
          })
        }).catch(err => console.error("Could not send admin notification:", err));
      }

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Do not render the chat bubble at all if user is not logged in
  if (!user) return null;

  return (
    <>
      <button 
        onClick={handleOpenToggle}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-[#d4ff32] text-black rounded-full shadow-2xl hover:scale-105 transition-all duration-500 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        } ${isScrolling && !isOpen ? 'translate-y-[150%] opacity-0' : 'translate-y-0'}`}
      >
        <MessageCircle size={24} />
      </button>

      {isOpen && (
        <div className="fixed sm:bottom-24 bottom-4 right-4 sm:right-6 left-4 sm:left-auto z-50 sm:w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] max-h-[80vh] animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-[#1a1a1a] p-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#d4ff32]/20 flex items-center justify-center">
                <MessageCircle size={20} className="text-[#d4ff32]" />
              </div>
              <div>
                <h3 className="font-medium text-sm">VELO Concierge</h3>
                <p className="text-[10px] text-zinc-400">Typically replies in 5 minutes</p>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#0a0a0a] flex flex-col gap-3 custom-scrollbar">
            <div className="text-center text-xs text-zinc-600 my-2">Chat started</div>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[#d4ff32] text-black rounded-br-sm' 
                    : 'bg-[#222] text-white rounded-bl-sm border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 bg-[#1a1a1a] border-t border-white/5 flex gap-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-[#111] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-[#d4ff32] text-sm"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="w-10 h-10 rounded-full bg-[#d4ff32] text-black flex items-center justify-center disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
