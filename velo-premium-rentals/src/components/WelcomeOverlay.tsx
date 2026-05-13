import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeOverlayProps {
  isVisible: boolean;
  role: 'admin' | 'user';
  name: string;
  onComplete: () => void;
}

export function WelcomeOverlay({ isVisible, role, name, onComplete }: WelcomeOverlayProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070707] overflow-hidden"
        >
          {/* Animated Background Elements */}
          {role === 'admin' && (
            <>
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.2, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#d4ff32] rounded-full blur-[150px] mix-blend-screen"
              />
              <motion.div
                initial={{ opacity: 0, rotate: -45, y: '100%' }}
                animate={{ opacity: 0.05, rotate: -45, y: '-100%' }}
                transition={{ duration: 3, ease: "easeInOut" }}
                className="absolute w-[200%] h-32 bg-white skew-y-12"
              />
            </>
          )}

          {role === 'user' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-[120px] mix-blend-screen"
            />
          )}

          <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
            {role === 'admin' ? (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-[#d4ff32] rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(212,255,50,0.5)]">
                  <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-4">
                  Welcome to Command, <span className="text-[#d4ff32]">Admin</span>
                </h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="text-zinc-400 tracking-widest uppercase text-sm"
                >
                  Authenticating secure dashboard...
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <img src="https://raw.githubusercontent.com/ezken-dev/Velo-pics/main/Velo%20Logo%20Final.png" alt="VELO Logo" className="h-16 mb-8 brightness-0 invert" />
                <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-3">
                  Welcome back, <span className="font-semibold">{name}</span>
                </h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="text-zinc-500 font-light"
                >
                  Preparing your premium fleet...
                </motion.p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
