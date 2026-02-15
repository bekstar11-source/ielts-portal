import React, { useEffect, useRef } from 'react';

const PlanetBackground = () => {
    const particleContainerRef = useRef(null);

    useEffect(() => {
        const container = particleContainerRef.current;
        if (!container) return;

        const createParticle = () => {
            const particle = document.createElement('div');
            particle.classList.add('planet-particle');

            // Tasodifiy o'lcham
            const size = Math.random() * 3 + 1;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            // Tasodifiy joylashuv
            particle.style.left = `${Math.random() * 100}%`;

            // Tasodifiy animatsiya davomiyligi
            const duration = Math.random() * 5 + 3; // 3s dan 8s gacha
            particle.style.animationDuration = `${duration}s`;

            // Tasodifiy kechikish
            particle.style.animationDelay = `${Math.random()}s`;

            container.appendChild(particle);

            // O'chirish
            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        };

        const interval = setInterval(createParticle, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <style>{`
                /* ========================================
                   VETRA PLANET HORIZON SYSTEM (Fixed)
                   ========================================
                */
                .planet-stage {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    overflow: hidden;
                    z-index: 0; /* Behind content but in front of body bg */
                    pointer-events: none;
                }

                /* 1. The Planet Body */
                .planet-body {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 250vw;
                    height: 250vw;
                    border-radius: 50%;
                    bottom: calc(15vh - 250vw); 
                    background: #000; 
                    box-shadow: 
                        0 -2px 10px rgba(255, 122, 80, 0.9),
                        0 -20px 60px rgba(255, 85, 32, 0.6),
                        0 -80px 140px rgba(255, 85, 32, 0.3);
                    z-index: 2;
                }

                .planet-body::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 80%;
                    height: 10%; 
                    background: radial-gradient(ellipse at center top, rgba(255, 85, 32, 0.4), transparent 70%);
                    opacity: 0.8;
                    filter: blur(20px);
                }

                /* 2. The Atmosphere Glow */
                .planet-atmosphere {
                    position: absolute;
                    bottom: -20vh;
                    left: 0;
                    width: 100%;
                    height: 60vh;
                    background: radial-gradient(ellipse at bottom center, rgba(255, 85, 32, 0.15) 0%, transparent 70%);
                    z-index: 1;
                    pointer-events: none;
                    mix-blend-mode: screen;
                }

                /* 3. The Aurora Waves */
                .aurora-waves {
                    position: absolute;
                    bottom: 0; 
                    left: 0;
                    width: 100%;
                    height: 40vh;
                    background: radial-gradient(ellipse at bottom, rgba(255, 85, 32, 0.1) 0%, transparent 60%);
                    filter: blur(60px);
                    z-index: 3;
                    animation: breatheGlow 10s ease-in-out infinite alternate;
                }

                /* 4. Particles */
                .planet-particle {
                    position: absolute;
                    bottom: 0;
                    width: 2px;
                    height: 2px;
                    background: #FF5520;
                    border-radius: 50%;
                    box-shadow: 0 0 4px #FF5520;
                    opacity: 0;
                    z-index: 4;
                    animation: floatUp linear forwards;
                }

                @keyframes floatUp {
                    0% {
                        transform: translateY(0) scale(1);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(-400px) scale(0);
                        opacity: 0;
                    }
                }

                /* Stars Background */
                .stars {
                    background-image: 
                        radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
                        radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
                        radial-gradient(1px 1px at 50px 160px, #fff, rgba(0,0,0,0)),
                        radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0));
                    background-size: 200px 200px;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: -1; /* Behind planet stage */
                    opacity: 0.3;
                }
            `}</style>

            <div className="stars"></div>
            <div className="planet-stage">
                <div className="planet-atmosphere"></div>
                <div className="planet-body"></div>
                <div className="aurora-waves"></div>
                <div ref={particleContainerRef} id="particle-container"></div>
            </div>
        </>
    );
};

export default PlanetBackground;
