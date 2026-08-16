import React from 'react';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import Logo from '../common/Logo';

export default function PodcastSplash() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Glow */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0.3 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#1ed760]/20 blur-[120px] rounded-full" 
      />
      
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1
          }}
          className="w-24 h-24 bg-gradient-to-tr from-[#1ed760] to-[#1db954] rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(30,215,96,0.3)]"
        >
          <Headphones className="text-black" size={48} strokeWidth={2.5} />
        </motion.div>
        
        <div className="overflow-hidden">
          <motion.h1 
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-white"
          >
            <Logo size="xl" tone="light" suffix="Podcast" />
          </motion.h1>
        </div>
        
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ delay: 0.6, duration: 1, ease: "circOut" }}
          className="h-[1px] bg-gradient-to-r from-transparent via-[#1ed760] to-transparent mt-6 w-48"
        />
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.8 }}
          className="text-[#1ed760] text-[10px] font-black uppercase tracking-[0.3em] mt-4"
        >
          Premium Audio Experience
        </motion.p>
      </motion.div>
      
      {/* Sound Waves Animation */}
      <div className="absolute bottom-16 flex items-center gap-1.5 h-8">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              height: [4, 16, 8, 24, 4],
              opacity: [0.3, 1, 0.5, 1, 0.3]
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              delay: i * 0.1,
              ease: "easeInOut"
            }}
            className="w-1 bg-[#1ed760] rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}
