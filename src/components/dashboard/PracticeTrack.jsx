import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const PracticeCard = ({ number, title, subtitle, color, delay, onClick }) => {
    const isMain = color === 'orange';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay, duration: 0.5 }}
            onClick={onClick}
            className={`relative flex flex-col justify-between p-6 rounded-[32px] cursor-pointer transition-all duration-300 group h-[220px] border
                ${isMain 
                    ? 'bg-[#F44A22] border-[#F44A22] text-white' 
                    : 'bg-white border-[#E4E2E3] text-[#161616] hover:border-[#F44A22]/30'
                }
                hover:shadow-xl hover:-translate-y-1
            `}
        >
            <div>
                <span className={`text-xs font-bold uppercase tracking-widest opacity-80 ${isMain ? 'text-white' : 'text-[#F44A22]'}`}>
                    {number}
                </span>
                <h3 className="text-2xl font-bold mt-4 leading-tight">
                    {title}<br />
                    <span className="opacity-70 font-normal text-lg">{subtitle}</span>
                </h3>
            </div>

            <div className="flex justify-end">
                <div className={`p-2 rounded-full transition-transform group-hover:translate-x-1 ${isMain ? 'bg-white/20' : 'bg-[#F44A22]/5 text-[#F44A22]'}`}>
                    <ArrowRight size={20} />
                </div>
            </div>
        </motion.div>
    );
};

export default function PracticeTrack({ onNavigate }) {
    const tracks = [
        { number: '01', title: 'Listening', subtitle: 'Practice', color: 'white' },
        { number: '02', title: 'Reading', subtitle: 'Practice', color: 'orange' },
        { number: '03', title: 'Writing', subtitle: 'Practice', color: 'white' },
    ];

    return (
        <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {tracks.map((track, i) => (
                    <PracticeCard 
                        key={i} 
                        {...track} 
                        delay={i * 0.1} 
                        onClick={() => onNavigate(track.title.toLowerCase())}
                    />
                ))}
            </div>
        </div>
    );
}
