import React, { useEffect, useRef } from 'react';

const PlanetBackground = () => {
    const particleContainerRef = useRef(null);

    useEffect(() => {
        const container = particleContainerRef.current;
        if (!container) return;

        const createParticle = () => {
            const particle = document.createElement('div');
            particle.classList.add('planet-particle');

            const size = Math.random() * 3 + 1;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;

            const duration = Math.random() * 5 + 3;
            particle.style.animationDuration = `${duration}s`;

            container.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        };

        const interval = setInterval(createParticle, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <style>{`
                .planet-stage {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    overflow: hidden;
                    z-index: 0; /* Changed from -1 to 0 to be part of the background stack */
                    pointer-events: none;
                    background-color: #050505;
                }

                .planet-body {
                    position: absolute;
                    top: 85vh; /* Ufq chizig'i */
                    left: 50%;
                    transform: translateX(-50%);
                    width: 250vw; /* Kengaytirilgan, yassi ko'rinishi uchun */
                    height: 250vw;
                    border-radius: 50%;
                    background: radial-gradient(circle, #000000 75%, #1a0500 88%, #4a1500 95%, rgba(255, 85, 32, 0.8) 100%);
                    box-shadow: 
                        inset 0 0 120px rgba(255, 85, 32, 0.7), /* Markazlashgan ichki nur (Inner Glow) */
                        0 -3px 10px rgba(255, 200, 180, 0.7),    /* Oq asosiy chiziq */
                        0 -10px 40px rgba(255, 85, 32, 0.6),     /* Asosiy nur */
                        0 -40px 100px rgba(255, 85, 32, 0.3),    
                        0 -100px 180px rgba(255, 85, 32, 0.15); 
                    z-index: 2;
                    animation: pulsePlanet 6s infinite ease-in-out;
                }

                @keyframes pulsePlanet {
                    0% { 
                        box-shadow: inset 0 0 100px rgba(255, 85, 32, 0.7), 0 -3px 10px rgba(255, 200, 180, 0.7), 0 -10px 40px rgba(255, 85, 32, 0.6), 0 -40px 100px rgba(255, 85, 32, 0.3), 0 -100px 180px rgba(255, 85, 32, 0.15); 
                    }
                    50% { 
                        box-shadow: inset 0 0 150px rgba(255, 85, 32, 0.9), 0 -3px 15px rgba(255, 200, 180, 0.9), 0 -15px 50px rgba(255, 85, 32, 0.8), 0 -50px 120px rgba(255, 85, 32, 0.4), 0 -120px 220px rgba(255, 85, 32, 0.2); 
                    }
                    100% { 
                        box-shadow: inset 0 0 100px rgba(255, 85, 32, 0.7), 0 -3px 10px rgba(255, 200, 180, 0.7), 0 -10px 40px rgba(255, 85, 32, 0.6), 0 -40px 100px rgba(255, 85, 32, 0.3), 0 -100px 180px rgba(255, 85, 32, 0.15); 
                    }
                }

                @media (max-width: 768px) {
                    .planet-body {
                        width: 400vw;
                        height: 400vw;
                        top: 80vh;
                    }
                }

                .planet-atmosphere {
                    position: absolute;
                    bottom: -20vh;
                    left: 0;
                    width: 100%;
                    height: 60vh;
                    background: radial-gradient(ellipse at bottom center, rgba(255, 85, 32, 0.1) 0%, transparent 70%);
                    z-index: 1;
                    mix-blend-mode: screen;
                }

                .aurora-waves {
                    position: absolute;
                    bottom: 0; 
                    left: 0;
                    width: 100%;
                    height: 50vh;
                    background: radial-gradient(ellipse at bottom, rgba(255, 85, 32, 0.08) 0%, transparent 60%);
                    filter: blur(50px);
                    z-index: 3;
                    animation: breatheGlow 12s ease-in-out infinite alternate;
                }

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

                @keyframes breatheGlow {
                    0% { opacity: 0.4; transform: scale(1); }
                    100% { opacity: 0.7; transform: scale(1.05); }
                }

                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    10% { opacity: 0.6; }
                    100% { transform: translateY(-400px) scale(0); opacity: 0; }
                }

                .stars {
                    background-image: 
                        radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
                        radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0));
                    background-size: 200px 200px;
                    position: fixed;
                    inset: 0;
                    z-index: -1; /* Behind everything */
                    opacity: 0.2;
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
