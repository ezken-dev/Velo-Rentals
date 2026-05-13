import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Send, User, MessageCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AdminChat() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/Velo%20notification.mp3');
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'chat_sessions'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);

      if (!initialLoadRef.current) {
        const newUnreadDocs = snapshot.docChanges().filter(change => 
          (change.type === 'added' || change.type === 'modified') && 
          change.doc.data().unreadAdmin === true
        );
        
        if (newUnreadDocs.length > 0) {
          audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
          
          newUnreadDocs.forEach(change => {
            const userName = change.doc.data().name || 'Anonymous User';
            const msg = `New message from ${userName}`;
            toast(msg, { icon: '💬' });
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('VELO Admin', { body: msg });
            }
          });
        }
      } else {
        initialLoadRef.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    
    // Mark as read
    updateDoc(doc(db, 'chat_sessions', activeSessionId), { unreadAdmin: false }).catch(console.error);

    const q = query(collection(db, 'chat_sessions', activeSessionId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeSessionId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !activeSessionId) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const msg = reply.trim();
    setReply('');

    try {
      await addDoc(collection(db, 'chat_sessions', activeSessionId, 'messages'), {
        text: msg,
        sender: 'admin',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chat_sessions', activeSessionId), {
        lastMessageAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending reply:", err);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[600px] relative">
      {/* Sidebar */}
      <div className={`w-full md:w-1/3 border-r border-white/5 flex flex-col bg-[#0a0a0a] ${activeSessionId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5">
          <h3 className="font-medium">Active Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sessions.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No active chats</div>
          )}
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${activeSessionId === session.id ? 'bg-white/10' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-sm truncate pr-2 w-3/4">
                  {session.name || 'Anonymous User'}
                </div>
                {session.unreadAdmin && (
                  <div className="w-2 h-2 rounded-full bg-[#d4ff32]" />
                )}
              </div>
              <div className="text-xs text-zinc-500 truncate">{session.email || 'No email provided'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#111] w-full md:w-2/3 ${!activeSessionId ? 'hidden md:flex' : 'flex'}`}>
        {!activeSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/5 bg-[#1a1a1a] flex items-center gap-3">
              <button 
                className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                onClick={() => setActiveSessionId(null)}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <User size={20} className="text-zinc-400" />
              </div>
              <div>
                <h3 className="font-medium truncate">{sessions.find(s => s.id === activeSessionId)?.name || 'User'}</h3>
                <p className="text-xs text-zinc-500 truncate">{sessions.find(s => s.id === activeSessionId)?.email}</p>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                    msg.sender === 'admin' 
                      ? 'bg-zinc-800 text-white rounded-br-sm' 
                      : 'bg-[#d4ff32] text-black rounded-bl-sm border border-transparent'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-[#1a1a1a] border-t border-white/5 flex gap-3">
              <input 
                type="text" 
                placeholder="Type your reply..." 
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4ff32] transition-colors min-w-0"
              />
              <button 
                type="submit" 
                disabled={!reply.trim()}
                className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#d4ff32] text-black flex items-center justify-center disabled:opacity-50 hover:bg-[#c0eb20] transition-colors"
                title="Send Reply"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
