import React from 'react';
import { motion } from 'framer-motion';

export default function ListeningHeroBanner() {
  return (
    <div className="w-full bg-[#050505] h-[180px] md:h-[240px] flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-purple-600/20" />
      </div>
      <div className="w-full max-w-[800px] h-full flex items-center justify-center gap-1.5 px-4 relative z-10">
          {/* Smooth glowing background light */}
          <div className="absolute w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[60px]" />
          <div className="absolute w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-[80px]" />
      </div>

      {/* BACKGROUND ANIMATED TEXT */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <motion.h2 
              initial={{ opacity: 0, filter: 'blur(20px)', scale: 0.8 }}
              animate={{ 
                  opacity: 0.12,
                  filter: 'blur(5px)',
                  scale: 1
              }}
              transition={{ 
                  duration: 4, 
                  ease: "easeOut",
                  delay: 0.5
              }}
              className="text-white text-[10vw] md:text-[6vw] font-black uppercase tracking-tighter text-center leading-none select-none"
          >
              Where Curiosity <br />
              <span className="text-[8vw] md:text-[5vw] opacity-80">Meets Excellence</span>
          </motion.h2>
      </div>
      
      {/* TEXT OVERLAY */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center z-10">
          <h1 className="text-white text-2xl md:text-4xl font-bold tracking-tight mb-2 drop-shadow-2xl">
              IELTS Listening Mastery
          </h1>
          <p className="text-white/60 text-sm md:text-base font-medium">
              Practice with real-exam format materials
          </p>
      </div>
    </div>
  );
}
