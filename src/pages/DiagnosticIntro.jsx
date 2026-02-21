import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function DiagnosticIntro() {
    const navigate = useNavigate();
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        // Generate random particles
        const particleCount = 40;
        const newParticles = Array.from({ length: particleCount }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // percentage string
            y: Math.random() * 100, // Random starting Y
            size: Math.random() * 3 + 1, // 1px to 4px
            duration: Math.random() * 15 + 10, // 10s to 25s
            delay: Math.random() * 5,
        }));
        setParticles(newParticles);
    }, []);

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-[#020b1c] to-[#06193b] text-white font-sans">
            {/* Embedded specific CSS for the design */}
            <style>{`
                .diag-stars {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-image:
                        radial-gradient(1px 1px at 50px 50px, #ffffff, transparent),
                        radial-gradient(1.5px 1.5px at 150px 100px, rgba(255,255,255,0.8), transparent),
                        radial-gradient(1px 1px at 250px 200px, #ffffff, transparent),
                        radial-gradient(2px 2px at 350px 50px, rgba(255,255,255,0.6), transparent),
                        radial-gradient(1px 1px at 100px 300px, #ffffff, transparent),
                        radial-gradient(1px 1px at 400px 250px, rgba(255,255,255,0.9), transparent),
                        radial-gradient(1.5px 1.5px at 500px 150px, #ffffff, transparent),
                        radial-gradient(1px 1px at 50px 400px, rgba(255,255,255,0.7), transparent);
                    background-size: 550px 450px;
                    opacity: 0.7;
                    z-index: 1;
                }

                .diag-content {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 22vh;
                    padding-bottom: 25vh;
                    z-index: 10;
                }

                .diag-header-group {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .diag-title {
                    font-weight: 600;
                    font-size: clamp(3rem, 5vw + 1rem, 5.5rem);
                    line-height: 1.1;
                    letter-spacing: -2px;
                    background: linear-gradient(180deg, #ffffff 20%, #8ca1c4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    color: transparent;
                    filter: drop-shadow(0 4px 15px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(100, 200, 255, 0.2)); 
                }

                .diag-subtitle {
                    font-weight: 400;
                    font-size: clamp(1rem, 2vw, 1.15rem);
                    color: rgba(255, 255, 255, 0.65);
                    letter-spacing: 0px;
                    padding: 0 20px;
                }

                .diag-btn {
                    border: 1px solid #ffffff;
                    border-radius: 50px;
                    background: transparent;
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    padding: 15px 40px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    letter-spacing: 1.5px;
                    cursor: pointer;
                    backdrop-filter: blur(5px);
                }

                .diag-btn:hover {
                    background: #ffffff;
                    color: #06193b;
                    box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
                }

                .diag-planet {
                    position: absolute;
                    top: 80vh;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 200vw;
                    height: 200vw;
                    border-radius: 50%;
                    background: radial-gradient(circle, #000000 75%, #03122b 88%, #0a3580 95%, rgba(0, 150, 255, 0.8) 100%);
                    box-shadow:
                        inset 0 0 80px rgba(0, 150, 255, 0.7),
                        0 -3px 10px rgba(255, 255, 255, 0.7),
                        0 -10px 30px rgba(0, 150, 255, 0.6),
                        0 -30px 80px rgba(0, 100, 255, 0.4),
                        0 -80px 150px rgba(0, 50, 150, 0.2);
                    z-index: 2;
                    animation: diag-pulseGlow 6s infinite ease-in-out;
                }

                @keyframes diag-pulseGlow {
                    0% { 
                        box-shadow: inset 0 0 80px rgba(0, 150, 255, 0.7), 0 -3px 10px rgba(255,255,255,0.7), 0 -10px 30px rgba(0,150,255,0.6), 0 -30px 80px rgba(0,100,255,0.4), 0 -80px 150px rgba(0,50,150,0.2); 
                    }
                    50% { 
                        box-shadow: inset 0 0 120px rgba(0, 150, 255, 0.9), 0 -3px 12px rgba(255,255,255,0.9), 0 -15px 40px rgba(0,150,255,0.8), 0 -40px 100px rgba(0,100,255,0.5), 0 -100px 180px rgba(0,50,150,0.3); 
                    }
                    100% { 
                        box-shadow: inset 0 0 80px rgba(0, 150, 255, 0.7), 0 -3px 10px rgba(255,255,255,0.7), 0 -10px 30px rgba(0,150,255,0.6), 0 -30px 80px rgba(0,100,255,0.4), 0 -80px 150px rgba(0,50,150,0.2); 
                    }
                }

                @media (max-width: 768px) {
                    .diag-planet {
                        width: 300vw;
                        height: 300vw;
                        top: 75vh;
                    }
                    .diag-content {
                        padding-bottom: 28vh;
                    }
                }
            `}</style>

            <div className="diag-stars"></div>

            {/* Light Blue Rising Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[3]">
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        className="absolute rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"
                        style={{
                            width: p.size,
                            height: p.size,
                            left: `${p.x}%`,
                            bottom: `-10%`, // Start slightly below screen
                        }}
                        animate={{
                            y: [0, -1200], // Move up
                            opacity: [0, 0.8, 0], // Fade in then out
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            <div className="diag-content">
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="diag-header-group"
                >
                    <h1 className="diag-title">Calibrate Your Path</h1>
                    <p className="diag-subtitle">start the test and let us prepare lesson plan for you</p>
                </motion.div>

                <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    onClick={() => navigate('/diagnostic-test/59QK6HgHf12W7TjHlABj')}
                    className="diag-btn"
                >
                    START DIAGNOSTICS
                </motion.button>
            </div>

            <div className="diag-planet"></div>

        </div>
    );
}
