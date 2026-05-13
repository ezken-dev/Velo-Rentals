import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, signInWithGoogle, logOut, signInWithEmail, db } from './lib/firebase';
import { BookingModal } from './components/BookingModal';
import { AdminPanel } from './components/AdminPanel';
import { MyBookings } from './components/MyBookings';
import { Car } from './components/FleetManager';
import { LiveChat } from './components/LiveChat';
import { Toaster, toast } from 'react-hot-toast';
import { 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Search, 
  Star, 
  User, 
  Settings, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Headset,
  CheckCircle2,
  Lock,
  Plus,
  Minus,
  XCircle,
  Menu,
  X
} from 'lucide-react';

import { WelcomeOverlay } from './components/WelcomeOverlay';

type ViewMode = 'home' | 'bookings' | 'admin';

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<string>('');
  const [selectedCarDetails, setSelectedCarDetails] = useState<Car | null>(null);
  
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [welcomeRole, setWelcomeRole] = useState<'admin' | 'user'>('user');
  const [welcomeName, setWelcomeName] = useState('');

  const [view, setView] = useState<ViewMode>('home');
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [authError, setAuthError] = useState('');

  const [cars, setCars] = useState<Car[]>([]);
  const [fleetFilter, setFleetFilter] = useState('All');
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'cars'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCars(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Car)));
    }, (error) => {
      console.error("Error fetching cars:", error);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'ken@velorentals.com' || user?.email === 'velocarrentals@gmail.com';

  const handleBookAction = (eOrCarName?: React.MouseEvent | string) => {
    if (typeof eOrCarName === 'object' && eOrCarName.preventDefault) {
      eOrCarName.preventDefault();
    }
    
    if (view !== 'home') {
      setView('home');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return;
    }
    
    const carName = typeof eOrCarName === 'string' ? eOrCarName : '';
    
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setSelectedCar(carName);
      setIsBookingModalOpen(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const welcomeKey = `velo_welcomed_${currentUser.uid}`;
        if (!sessionStorage.getItem(welcomeKey)) {
          sessionStorage.setItem(welcomeKey, 'true');
          const adminEmail = currentUser.email === 'ken@velorentals.com' || currentUser.email === 'velocarrentals@gmail.com';
          setWelcomeRole(adminEmail ? 'admin' : 'user');
          setWelcomeName(currentUser.displayName || currentUser.email?.split('@')[0] || 'Member');
          setShowWelcomeOverlay(true);
        }
      } else {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('velo_welcomed_')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      setUser(currentUser);
      setIsAuthLoading(false);
      if (!currentUser && view !== 'home') {
        setView('home');
      }
      if ((currentUser?.email === 'ken@velorentals.com' || currentUser?.email === 'velocarrentals@gmail.com') && view === 'home') {
          // Could redirect, but optional. Admin tab will appear instead.
      }
    });
    return () => unsubscribe();
  }, [view]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    if (view !== 'home') {
      setView('home');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 100);
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 80; // approximate navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navHeight;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmail(emailAuth, passwordAuth);
      setIsAuthModalOpen(false);
      setEmailAuth('');
      setPasswordAuth('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in');
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#070707]" />;
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#070707] text-white selection:bg-[#d4ff32] selection:text-black">
        <WelcomeOverlay isVisible={showWelcomeOverlay} role={welcomeRole} name={welcomeName} onComplete={() => setShowWelcomeOverlay(false)} />
        <div className={`transition-opacity ${showWelcomeOverlay ? 'opacity-0 duration-0 pointer-events-none' : 'opacity-100 duration-1000 delay-500'}`}>
          <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-[#070707]/90 backdrop-blur-md border-b border-white/5 py-3">
          <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-3 items-center">
            <div className="flex items-center justify-start">
              <a href="#" onClick={(e) => { e.preventDefault(); }} className="flex items-center cursor-pointer transition-all">
                <img src="https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/Velo%20Logo%20Final.png" alt="VELO Logo" className="h-10 sm:h-12 object-contain brightness-0 invert transform scale-150 origin-left" />
              </a>
            </div>
            <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium text-zinc-300">
              <span className="text-zinc-500 text-sm tracking-wide uppercase">Admin Dashboard</span>
            </div>
            <div className="flex items-center justify-end gap-6">
              <button 
                onClick={logOut}
                className="text-sm font-medium hover:text-white transition-colors text-zinc-400"
              >
                Sign out
              </button>
            </div>
          </div>
        </nav>
        <div className="pt-20 min-h-screen">
          <AdminPanel />
        </div>
        </div>
        <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070707] text-white selection:bg-[#d4ff32] selection:text-black">
      <WelcomeOverlay isVisible={showWelcomeOverlay} role={welcomeRole} name={welcomeName} onComplete={() => setShowWelcomeOverlay(false)} />
      <div className={`transition-opacity ${showWelcomeOverlay ? 'opacity-0 duration-0 pointer-events-none' : 'opacity-100 duration-1000 delay-500'}`}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled || view !== 'home' ? 'bg-[#070707]/90 backdrop-blur-md border-b border-white/5 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-3 items-center">
          <div className="flex items-center justify-start">
            <a href="#" onClick={(e) => { e.preventDefault(); setView('home'); }} className="flex items-center cursor-pointer hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">
              <img src="https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/Velo%20Logo%20Final.png" alt="VELO Logo" className="h-10 sm:h-12 object-contain brightness-0 invert transform scale-150 origin-left" />
            </a>
          </div>
            
          {view !== 'admin' && view !== 'bookings' && (
            <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium text-zinc-300">
              <a href="#fleet" onClick={(e) => scrollToSection(e, 'fleet')} className="cursor-pointer hover:text-[#d4ff32] hover:drop-shadow-[0_0_8px_rgba(212,255,50,0.5)] transition-all">Fleet</a>
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="cursor-pointer hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">How it works</a>
              <a href="#why-velo" onClick={(e) => scrollToSection(e, 'why-velo')} className="cursor-pointer hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Why VELO</a>
              <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="cursor-pointer hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">FAQ</a>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('bookings')} 
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${view === 'bookings' ? 'bg-[#d4ff32] text-black shadow-[0_0_15px_rgba(212,255,50,0.3)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    My Bookings
                  </button>
                <button 
                  onClick={logOut}
                  className="text-sm font-medium hover:text-white transition-colors text-zinc-400 hidden sm:block"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="text-sm font-medium hover:text-white transition-colors hidden sm:block"
              >
                Sign in
              </button>
            )}
            {view !== 'admin' && (
              <button onClick={handleBookAction} className="bg-[#d4ff32] text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#c0eb20] hover:shadow-[0_0_15px_rgba(212,255,50,0.5)] cursor-pointer transition-all active:scale-95 hidden sm:block">
                Book now
              </button>
            )}
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden text-white" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#070707]/95 backdrop-blur-md border-b border-white/5 py-4 px-6 flex flex-col gap-4 animate-in slide-in-from-top-4">
            {view !== 'admin' && view !== 'bookings' && (
              <>
                <a href="#fleet" onClick={(e) => { scrollToSection(e, 'fleet'); setIsMobileMenuOpen(false); }} className="text-lg font-medium text-white py-2 border-b border-white/5">Fleet</a>
                <a href="#how-it-works" onClick={(e) => { scrollToSection(e, 'how-it-works'); setIsMobileMenuOpen(false); }} className="text-lg font-medium text-white py-2 border-b border-white/5">How it works</a>
                <a href="#why-velo" onClick={(e) => { scrollToSection(e, 'why-velo'); setIsMobileMenuOpen(false); }} className="text-lg font-medium text-white py-2 border-b border-white/5">Why VELO</a>
                <a href="#faq" onClick={(e) => { scrollToSection(e, 'faq'); setIsMobileMenuOpen(false); }} className="text-lg font-medium text-white py-2 border-b border-white/5">FAQ</a>
              </>
            )}
            {!user ? (
               <button 
                 onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                 className="text-lg font-medium text-white py-2 border-b border-white/5 text-left"
               >
                 Sign in
               </button>
            ) : (
                <button 
                  onClick={() => { logOut(); setIsMobileMenuOpen(false); }}
                  className="text-lg font-medium text-white py-2 border-b border-white/5 text-left"
                >
                  Sign out
                </button>
            )}
            {view !== 'admin' && (
              <button onClick={(e) => { handleBookAction(e); setIsMobileMenuOpen(false); }} className="bg-[#d4ff32] text-black px-5 py-3 mt-2 rounded-xl text-base font-semibold transition-all">
                Book now
              </button>
            )}
          </div>
        )}
      </nav>

      {view === 'bookings' && user ? (
        <MyBookings user={user} />
      ) : (
        <>
          {/* Hero Section */}
          <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Image/Gradient */}
        <div className="absolute inset-0 z-0 bg-[#070707]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#070707] via-transparent to-[#070707] z-10 opacity-50 md:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent to-[#070707] z-10 opacity-40 md:opacity-80" />
          <img 
            src="https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/hero-car.png" 
            alt="Luxury supercar at night" 
            className="w-full h-full object-cover object-[70%_center] md:object-center opacity-70 md:opacity-40 mix-blend-normal md:mix-blend-luminosity lg:mix-blend-luminosity"
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-[1px] w-8 bg-[#d4ff32]" />
              <span className="text-[10px] tracking-[0.2em] font-medium text-[#a39a83] uppercase">Premium Car Rentals</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-[110px] font-medium tracking-tight leading-[0.95] mb-8">
              <span className="block text-[#888888]">Premium.</span>
              <span className="block font-serif italic text-white pr-4">Effortless.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#9ca8b8] mb-10 max-w-xl font-light leading-relaxed">
              From city cruisers to weekend supercars — premium vehicles at your fingertips. No queues, no paperwork. Just drive.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={handleBookAction} className="bg-velo text-black px-6 py-3.5 rounded-full text-sm font-semibold hover:bg-[#c0eb20] transition-colors flex items-center gap-2">
                Book a car <ChevronRight size={16} />
              </button>
              <button className="bg-white/5 backdrop-blur-md border border-white/10 text-white px-6 py-3.5 rounded-full text-sm font-medium hover:bg-white/10 transition-colors">
                Discover the fleet
              </button>
              
              <div className="flex items-center gap-2 ml-2 sm:ml-6 text-sm text-zinc-400">
                <div className="flex items-center text-[#d4ff32]">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                </div>
                <span className="text-white font-medium">4.9</span>
                <span>2,118 verified reviews</span>
              </div>
            </div>
          </motion.div>

          {/* Booking Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-20 md:mt-32"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 md:p-4 inline-flex flex-col md:flex-row items-center w-full shadow-2xl">
              <div className="flex flex-col w-full md:w-auto md:flex-1 py-3 px-4 md:border-r border-white/10 relative group hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 uppercase font-medium tracking-wider">
                  <MapPin size={12} className="text-[#d4ff32]" /> Pick-up
                </div>
                <div className="text-white font-medium text-lg">Subang Jaya HQ</div>
                <div className="text-xs text-zinc-500 mt-1">Free cancellation up to 24h</div>
              </div>
              
              <div className="flex flex-col w-full md:w-auto md:flex-1 py-3 px-4 md:border-r border-white/10 relative group hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 uppercase font-medium tracking-wider">
                  <MapPin size={12} /> Drop-off
                </div>
                <div className="text-white font-medium text-lg">Subang Jaya HQ</div>
                <div className="text-xs text-zinc-500 mt-1">Comprehensive insurance included</div>
              </div>
              
              <div className="flex flex-col w-full sm:w-1/2 md:w-auto md:flex-1 py-3 px-4 relative group hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 uppercase font-medium tracking-wider">
                  <Calendar size={12} className="text-[#d4ff32]" /> Pick-up date
                </div>
                <div className="text-white font-medium text-lg">05/13/2026</div>
                <div className="text-xs text-zinc-500 mt-1">Instant confirmation</div>
              </div>
              
              <div className="flex flex-col w-full sm:w-1/2 md:w-auto md:flex-1 py-3 px-4 relative group hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 uppercase font-medium tracking-wider">
                  <Calendar size={12} /> Return
                </div>
                <div className="text-white font-medium text-lg">05/16/2026</div>
                <div className="text-xs text-zinc-500 mt-1 md:opacity-0">&nbsp;</div>
              </div>
              
              <div className="w-full md:w-auto mt-4 md:mt-0 px-2 md:px-0">
                <button onClick={handleBookAction} className="w-full md:w-auto bg-velo text-black px-8 py-5 md:py-4 rounded-xl text-base md:text-sm font-semibold hover:bg-[#c0eb20] transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                  Search <Search size={16} />
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-zinc-500 font-medium">
              <span className="uppercase tracking-wider text-[10px] text-zinc-400">Our fleet includes</span>
              <span className="hover:text-white transition-colors cursor-pointer">BMW</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span className="hover:text-white transition-colors cursor-pointer">Mercedes-Benz</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span className="hover:text-white transition-colors cursor-pointer">Porsche</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span className="hover:text-white transition-colors cursor-pointer">Tesla</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span className="hover:text-white transition-colors cursor-pointer">Range Rover</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span className="hover:text-white transition-colors cursor-pointer">Ferrari</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#d4ff32] text-black py-12 border-y border-[#c0eb20]">
        <motion.div 
          className="max-w-7xl mx-auto px-6 md:px-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x divide-black/10">
            <motion.div variants={fadeInUp} className="px-4">
              <div className="text-4xl md:text-5xl font-medium tracking-tight mb-2">4+</div>
              <div className="text-sm font-medium opacity-70">Vehicles in fleet</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="px-4 md:px-8">
              <div className="text-4xl md:text-5xl font-medium tracking-tight mb-2">100%</div>
              <div className="text-sm font-medium opacity-70">Coverage in Malaysia</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="px-4 md:px-8">
              <div className="text-4xl md:text-5xl font-medium tracking-tight mb-2">4.9</div>
              <div className="text-sm font-medium opacity-70">Customer rating</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="px-4 md:px-8">
              <div className="text-4xl md:text-5xl font-medium tracking-tight mb-2">12 mins</div>
              <div className="text-sm font-medium opacity-70">Avg. booking time</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Fleet Section */}
      <section id="fleet" className="py-24 md:py-32 overflow-hidden">
        <motion.div 
          className="max-w-7xl mx-auto px-6 md:px-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <motion.div variants={fadeInUp} className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[1px] w-8 bg-zinc-700" />
                <span className="text-[10px] tracking-[0.2em] font-medium text-zinc-400 uppercase">Our Fleet</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">
                Pick <span className="font-serif italic text-zinc-300">your ride.</span>
              </h2>
              <p className="text-lg text-zinc-400 font-light">
                Premium categories, 4+ vehicles. Every one fully insured, freshly detailed, and ready when you are.
              </p>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <a href="#" className="inline-flex items-center gap-2 text-sm font-medium hover:text-[#d4ff32] transition-colors pb-1 border-b border-white/20 hover:border-[#d4ff32]/50">
                View full fleet <ChevronRight size={14} />
              </a>
            </motion.div>
          </div>

          {/* Filters */}
          <motion.div variants={fadeInUp} className="flex overflow-x-auto pb-4 mb-8 -mx-6 px-6 md:mx-0 md:px-0 gap-3 tailwind-scrollbar-hide">
             {['All', 'Sports', 'SUV', 'Electric', 'Luxury', 'Convertible', 'Featured'].map((filter) => (
              <button 
                key={filter}
                onClick={() => setFleetFilter(filter)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  fleetFilter === filter 
                  ? 'bg-[#d4ff32] text-black' 
                  : 'bg-white/5 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {filter}
              </button>
            ))}
          </motion.div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cars.length > 0 ? (
              cars.filter((car) => fleetFilter === 'All' || car.category === fleetFilter).map((car) => (
                <motion.div 
                  key={car.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <CarCard 
                    name={car.name}
                    category={car.category}
                    year={car.year}
                    transmission={car.transmission}
                    seats={car.seats}
                    hp={car.hp}
                    speed={car.speed}
                    price={car.price}
                    rating="4.9"
                    reviews="0"
                    image={car.images && car.images[0] ? car.images[0] : ''}
                    onBook={() => handleBookAction(car.name)}
                    onClick={() => setSelectedCarDetails(car)}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 py-12 text-center text-zinc-500">
                Cars are currently being uploaded by the administration. Check back soon!
              </div>
            )}
          </div>

          {/* Concierge CTA */}
          <motion.div variants={fadeInUp} className="mt-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-medium mb-1">Not sure which fits?</h3>
              <p className="text-sm text-zinc-400">Tell us about your trip — we'll match you in under a minute.</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button onClick={() => setIsLiveChatOpen(true)} className="flex-1 md:flex-none px-6 py-3 rounded-full text-sm font-medium bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
                Talk to concierge
              </button>
              <button className="flex-1 md:flex-none bg-velo text-black px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#c0eb20] transition-colors">
                Get matched
              </button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-[#111] py-24 md:py-32 border-t border-white/5 overflow-hidden">
        <motion.div 
          className="max-w-7xl mx-auto px-6 md:px-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="flex items-center justify-between mb-16 md:mb-24">
            <motion.div variants={fadeInUp} className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[1px] w-8 bg-zinc-700" />
                <span className="text-[10px] tracking-[0.2em] font-medium text-zinc-400 uppercase">Process</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
                From browse to <span className="font-serif italic text-zinc-300">drive</span><br />
                in three steps.
              </h2>
            </motion.div>
            <motion.div variants={fadeInUp} className="hidden md:block">
              <a href="#" onClick={handleBookAction} className="inline-flex items-center gap-2 text-sm font-medium hover:text-[#d4ff32] transition-colors pb-1 border-b border-white/20 hover:border-[#d4ff32]/50">
                Start your booking <ChevronRight size={14} />
              </a>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line - desktop only */}
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
              className="hidden md:block absolute top-[110px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent origin-left" 
            />

            <motion.div variants={fadeInUp} className="relative group">
             <div className="mb-8 relative w-fit">
                <div className="text-[80px] md:text-[120px] font-serif italic leading-none text-white/5 select-none transition-colors group-hover:text-white/10">01</div>
              </div>
              <h3 className="text-2xl font-medium mb-4">Choose your car</h3>
              <p className="text-zinc-400 font-light leading-relaxed">
                Browse 4+ premium vehicles. Filter by type, brand, or price. Every car is fully insured and verified.
              </p>
              <div className="h-0.5 w-12 bg-zinc-800 mt-8 transition-colors group-hover:bg-[#d4ff32]" />
            </motion.div>

            <motion.div variants={fadeInUp} className="relative group">
              <div className="mb-8 relative w-fit">
                <div className="text-[80px] md:text-[120px] font-serif italic leading-none text-[#d4ff32]/10 select-none transition-colors group-hover:text-[#d4ff32]/20">02</div>
              </div>
              <h3 className="text-2xl font-medium mb-4">Book in 12 mins</h3>
              <p className="text-zinc-400 font-light leading-relaxed">
                Pick your dates, location, and extras. Pay securely online. Instant confirmation, no paperwork.
              </p>
              <div className="h-0.5 w-12 bg-zinc-800 mt-8 transition-colors group-hover:bg-[#d4ff32]" />
            </motion.div>

            <motion.div variants={fadeInUp} className="relative group">
              <div className="mb-8 relative w-fit">
                <div className="text-[80px] md:text-[120px] font-serif italic leading-none text-white/5 select-none transition-colors group-hover:text-white/10">03</div>
              </div>
              <h3 className="text-2xl font-medium mb-4">Drive away</h3>
              <p className="text-zinc-400 font-light leading-relaxed">
                Keys are ready when you are. Collect from our Subang Jaya HQ, or opt for doorstep delivery anywhere in Klang Valley.
              </p>
              <div className="h-0.5 w-12 bg-zinc-800 mt-8 transition-colors group-hover:bg-[#d4ff32]" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Advantage Section */}
      <section id="why-velo" className="py-24 md:py-32 overflow-hidden">
        <motion.div 
          className="max-w-7xl mx-auto px-6 md:px-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
            <motion.div variants={fadeInUp} className="lg:w-1/3">
              <div className="sticky top-32">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[1px] w-8 bg-zinc-700" />
                  <span className="text-[10px] tracking-[0.2em] font-medium text-zinc-400 uppercase">Advantage</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] mb-6">
                  Why drive with <span className="font-serif italic text-zinc-300">VELO.</span>
                </h2>
                <p className="text-zinc-400 font-light leading-relaxed mb-10">
                  Built for travellers, weekenders, and anyone who values their time. Premium fleet, transparent pricing, real humans on the other end.
                </p>
                <button onClick={handleBookAction} className="bg-velo text-black px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#c0eb20] transition-colors flex items-center gap-2">
                  Reserve your car <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
            
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <ShieldCheck className="h-6 w-6 text-[#d4ff32] mb-6" />
                <div className="text-[10px] tracking-[0.2em] font-medium text-zinc-500 uppercase mb-2">Safety</div>
                <h3 className="text-xl font-medium mb-3">Fully insured</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Every vehicle carries comprehensive cover. Drive with complete peace of mind from the moment you take the wheel.
                </p>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <Zap className="h-6 w-6 text-[#d4ff32] mb-6" />
                <div className="text-[10px] tracking-[0.2em] font-medium text-zinc-500 uppercase mb-2">Speed</div>
                <h3 className="text-xl font-medium mb-3">Instant booking</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  From search to keys in around 12 minutes. No phone calls, no waiting. Fully digital, fully seamless.
                </p>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <MapPin className="h-6 w-6 text-[#d4ff32] mb-6" />
                <div className="text-[10px] tracking-[0.2em] font-medium text-zinc-500 uppercase mb-2">Coverage</div>
                <h3 className="text-xl font-medium mb-3">Drive Anywhere</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Based in Subang Jaya, but our cars can go anywhere within Malaysia. Enjoy the journey, just cover the fuel.
                </p>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <Headset className="h-6 w-6 text-[#d4ff32] mb-6" />
                <div className="text-[10px] tracking-[0.2em] font-medium text-zinc-500 uppercase mb-2">Support</div>
                <h3 className="text-xl font-medium mb-3">24/7 concierge</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Real humans, available around the clock. Whether you need roadside help or a last-minute change.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Testimonial */}
      <section className="bg-[#f2f2f2] text-black py-24 md:py-32 overflow-hidden">
        <motion.div 
          className="max-w-6xl mx-auto px-6 md:px-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
          }}
        >
          <motion.div 
            className="text-6xl text-[#d4ff32] font-serif leading-none mb-8 opacity-80 decoration-black font-bold"
            variants={{
              hidden: { scale: 0, opacity: 0 },
              visible: { scale: 1, opacity: 0.8, transition: { type: 'spring', bounce: 0.5 } }
            }}
          >
            "
          </motion.div>
          <motion.h2 
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight mb-12 max-w-4xl mx-auto text-[#070707]"
          >
            VELO didn't rent me a car. They gave me the weekend I'll <span className="font-serif italic font-normal text-zinc-500">never forget.</span>
          </motion.h2>
          <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#d4ff32] flex items-center justify-center text-sm font-semibold">
              AT
            </div>
            <div className="text-left">
              <div className="font-medium">Alex T.</div>
              <div className="text-xs text-zinc-600">Porsche 911 GT3 · Mar 2026</div>
            </div>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex justify-center gap-2 mt-12">
            <div className="w-8 h-1 bg-black rounded-full" />
            <div className="w-2 h-1 bg-black/20 rounded-full cursor-pointer hover:bg-black/40 transition-colors" />
            <div className="w-2 h-1 bg-black/20 rounded-full cursor-pointer hover:bg-black/40 transition-colors" />
            <div className="w-2 h-1 bg-black/20 rounded-full cursor-pointer hover:bg-black/40 transition-colors" />
          </motion.div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 overflow-hidden">
        <motion.div 
          className="max-w-3xl mx-auto px-6 md:px-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={fadeInUp} className="flex flex-col items-center text-center mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-[1px] w-8 bg-zinc-700" />
              <span className="text-[10px] tracking-[0.2em] font-medium text-zinc-400 uppercase">FAQ</span>
              <div className="h-[1px] w-8 bg-zinc-700" />
            </div>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
              Questions, <span className="font-serif italic text-zinc-400">answered.</span>
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp} className="space-y-4">
            <FaqItem 
              question="Do I need to be a member?" 
              answer="No membership required. Book once, drive away. Sign up for VELO Plus if you want priority access and loyalty pricing on stays of 3+ days."
              isOpen={true}
            />
            <FaqItem question="What's included in the price?" answer="Comprehensive insurance and unlimited mileage are included. Fuel costs are your responsibility." />
            <FaqItem question="Can I extend my rental?" answer="Yes, simply let our concierge know via chat or call. Subject to availability." />
            <FaqItem question="Where can I pick up?" answer="Pick up directly from our Subang Jaya HQ, or select our delivery option and we'll bring the car to you anywhere within the Klang Valley." />
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-12 text-center flex flex-col sm:flex-row items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="text-left mb-4 sm:mb-0">
              <div className="font-medium mb-1">Still got questions?</div>
              <div className="text-sm text-zinc-400">Our concierge replies in under five minutes, 24/7.</div>
            </div>
            <button onClick={() => setIsLiveChatOpen(true)} className="bg-[#d4ff32] text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#c0eb20] transition-colors whitespace-nowrap">
              Message the concierge
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer Banner */}
      <section className="bg-[#111] py-32 border-t border-white/5 text-center relative overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto px-6 md:px-10 relative z-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.1 } }
          }}
        >
          <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3 mb-8">
            <div className="h-[1px] w-8 bg-zinc-700" />
            <span className="text-[10px] tracking-[0.2em] font-medium text-zinc-400 uppercase">The Open Road</span>
            <div className="h-[1px] w-8 bg-zinc-700" />
          </motion.div>
          
          <motion.h2 variants={fadeInUp} className="text-5xl md:text-8xl font-medium tracking-tight leading-[0.95] mb-8 text-zinc-600">
            Your next<br />
            <span className="font-serif italic text-white">drive awaits.</span>
          </motion.h2>
          
          <motion.p variants={fadeInUp} className="text-zinc-400 text-lg mb-10 font-light">
            Pick a city, pick a car, hit the road. We'll handle the rest.
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={handleBookAction} className="w-full sm:w-auto bg-velo text-black px-8 py-4 rounded-full text-sm font-semibold hover:bg-[#c0eb20] transition-colors">
              Book now
            </button>
            <button onClick={() => setIsLiveChatOpen(true)} className="w-full sm:w-auto text-white border border-white/20 px-8 py-4 rounded-full text-sm font-medium hover:bg-white/5 transition-colors">
              Talk to concierge
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-10 px-6 md:px-10 border-t border-white/10 bg-[#070707]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-20">
            <div className="md:col-span-1">
              <a href="#" className="flex items-center mb-6 mt-4">
                <img src="https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/Velo%20Logo%20Final.png" alt="VELO Logo" className="h-8 object-contain brightness-0 invert transform scale-150 origin-left" />
              </a>
              <p className="text-sm text-zinc-500 mb-8 max-w-xs leading-relaxed">
                Premium vehicles, instant booking, full insurance. The thoughtful way to drive.
              </p>
              <div className="flex items-center gap-2">
                {['X', 'IG', 'YT', 'TT'].map(social => (
                  <a key={social} href="#" className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors">
                    {social}
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] tracking-widest font-medium text-zinc-500 uppercase mb-6">Fleet</h4>
              <ul className="space-y-4 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Sports</a></li>
                <li><a href="#" className="hover:text-white transition-colors">SUV</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Electric</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Luxury</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Convertible</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-[10px] tracking-widest font-medium text-zinc-500 uppercase mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Locations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sustainability</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-[10px] tracking-widest font-medium text-zinc-500 uppercase mb-6">Help</h4>
              <ul className="space-y-4 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Insurance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Policies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 text-xs text-zinc-600">
            <div>© 2026 VELO Mobility, Inc. All rights reserved.</div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
      </>
      )}

      {isBookingModalOpen && (
        <BookingModal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)} 
          initialCar={selectedCar} 
          availableCars={cars}
        />
      )}
      
      {selectedCarDetails && (
        <CarDetailsModal 
          car={selectedCarDetails}
          onClose={() => setSelectedCarDetails(null)}
          onBook={() => {
            setSelectedCarDetails(null);
            handleBookAction(selectedCarDetails.name);
          }}
        />
      )}

      {view !== 'admin' && (
        <LiveChat 
          user={user} 
          isOpen={isLiveChatOpen} 
          onOpenChange={setIsLiveChatOpen} 
        />
      )}

      {/* Auth Modal overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAuthModalOpen(false)} />
          <div className="relative bg-[#070707] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col pt-8 pb-10 px-8 items-center text-center shadow-2xl">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#d4ff32]" />
            </div>
            <h2 className="text-2xl font-medium mb-2 tracking-tight">Sign in to VELO</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Create an account or sign in to start booking premium vehicles.
            </p>
            
            <form onSubmit={handleEmailSignIn} className="w-full flex flex-col gap-3 mb-6">
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded text-xs text-left">
                  {authError}
                </div>
              )}
              <input 
                type="email" 
                placeholder="Email address" 
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#d4ff32] transition-colors text-sm"
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={passwordAuth}
                onChange={(e) => setPasswordAuth(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#d4ff32] transition-colors text-sm"
                required
              />
              <button 
                type="submit"
                className="w-full bg-[#d4ff32] hover:bg-[#c0eb20] text-black font-semibold py-3 rounded-xl transition-colors text-sm mt-2"
              >
                Sign in with Email
              </button>
            </form>
            
            <div className="w-full flex items-center justify-between mb-6">
              <div className="h-[1px] bg-white/10 flex-1"></div>
              <span className="text-xs text-zinc-500 px-4">OR</span>
              <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            <button 
              onClick={async () => {
                await signInWithGoogle();
                setIsAuthModalOpen(false);
              }}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <div className="mt-6 text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
            </div>
          </div>
        </div>
      )}
      </div>
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
    </div>
  );
}

// Subcomponents

function CarDetailsModal({ car, onClose, onBook }: { car: Car; onClose: () => void; onBook: () => void; }) {
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl my-8 overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
        >
          <XCircle size={24} />
        </button>
        
        <div className="flex flex-col md:flex-row h-full">
          {/* Images Section */}
          <div className="w-full md:w-1/2 bg-black flex flex-col">
            <div className="relative aspect-[4/3] w-full">
              {car.images && car.images.length > 0 ? (
                <img 
                  src={car.images[activeImage]} 
                  alt={car.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                  No Image Available
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-full border border-white/10">
                {car.category}
              </div>
            </div>
            {car.images && car.images.length > 1 && (
              <div className="flex overflow-x-auto gap-2 p-4 bg-[#111] tailwind-scrollbar-hide border-r border-white/5">
                {car.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-[#d4ff32] opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`${car.name} thumbnail`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Details Section */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col bg-[#0a0a0a]">
            <div className="mb-6">
              <h2 className="text-3xl font-medium tracking-tight mb-2">{car.name}</h2>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span>{car.year}</span>
                <span>•</span>
                <span>{car.transmission}</span>
                <span className="flex-1 text-right text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-white"><Star size={12} className="text-[#d4ff32]" fill="currentColor"/> 4.9</span> (12 reviews)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Seats</div>
                <div className="text-sm font-medium">{car.seats}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Power</div>
                <div className="text-sm font-medium">{car.hp}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">0-100 km/h</div>
                <div className="text-sm font-medium">{car.speed}</div>
              </div>
            </div>

            <div className="flex-1 mb-8 overflow-y-auto tailwind-scrollbar-hide">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-3">Vehicle Description</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                {car.description || "Experience the thrill of driving this premium vehicle. Perfectly maintained and ready for your next adventure. Contact our concierge for more specific details about this car model."}
              </p>
            </div>
            
            <div className="pt-6 border-t border-white/10 mt-auto flex items-end justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Daily Rate</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-medium text-[#d4ff32]">{car.price}</span>
                  <span className="text-sm text-zinc-400">/day</span>
                </div>
              </div>
              <button 
                onClick={onBook} 
                className="bg-[#d4ff32] text-black px-8 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-[#c0eb20] hover:shadow-[0_0_15px_rgba(212,255,50,0.4)] transition-all flex items-center gap-2 active:scale-95"
              >
                Book This Car <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarCard({ name, category, year, transmission, seats, hp, speed, price, rating, reviews, image, available = false, onBook, onClick }: any) {
  return (
    <div className="group rounded-2xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all flex flex-col cursor-pointer" onClick={onClick}>
      <div className="relative h-56 overflow-hidden">
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-black/50 backdrop-blur-md text-white text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-full border border-white/10">
            {category}
          </div>
        </div>
        {available && (
          <div className="absolute top-4 right-4 bg-[#d4ff32] text-black text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" /> Available
          </div>
        )}
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-medium">{name}</h3>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Star size={12} className="text-[#d4ff32]" fill="currentColor" /> {rating}
            </div>
            <div className="text-[10px] text-zinc-500">({reviews})</div>
          </div>
        </div>
        
        <div className="text-xs text-zinc-400 mb-5">{year} · {transmission}</div>
        
        <div className="flex flex-wrap gap-2 mb-8">
          <div className="text-[11px] px-2.5 py-1.5 bg-black rounded-md border border-zinc-800 text-zinc-300">{seats}</div>
          <div className="text-[11px] px-2.5 py-1.5 bg-black rounded-md border border-zinc-800 text-zinc-300">{hp}</div>
          <div className="text-[11px] px-2.5 py-1.5 bg-black rounded-md border border-zinc-800 text-zinc-300">{speed}</div>
        </div>
        
        <div className="mt-auto pt-5 border-t border-zinc-800 flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-medium">{price}</span>
              <span className="text-xs text-zinc-500">/day</span>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onBook(name); }} className="bg-[#d4ff32] text-black px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#c0eb20] transition-colors flex items-center gap-1 relative z-10">
            Book <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer, isOpen = false }: any) {
  const [open, setOpen] = useState(isOpen);
  
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
      <button 
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium">{question}</span>
        {open ? <Minus size={18} className="text-zinc-400 shrink-0" /> : <Plus size={18} className="text-zinc-400 shrink-0" />}
      </button>
      {open && answer && (
        <div className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed border-t border-white/5 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

