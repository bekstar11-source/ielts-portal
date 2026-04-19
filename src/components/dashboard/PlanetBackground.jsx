import React from 'react';

const PlanetBackground = () => {
    // White theme — no dark planet/stars needed, just a subtle warm gradient
    return (
        <>
            <style>{`
                .warm-bg-gradient {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    overflow: hidden;
                    z-index: 0;
                    pointer-events: none;
                    background: linear-gradient(180deg, #FEF8E8 0%, #FFFFFF 40%, #FEF8E8 100%);
                }
                .top-accent-glow {
                    position: fixed;
                    top: -200px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 120vw;
                    height: 400px;
                    background: radial-gradient(circle at 50% 0%, rgba(244, 74, 34, 0.04) 0%, rgba(244, 74, 34, 0.01) 50%, transparent 80%);
                    filter: blur(80px);
                    z-index: 1;
                    pointer-events: none;
                }
            `}</style>

            <div className="warm-bg-gradient"></div>
            <div className="top-accent-glow"></div>
        </>
    );
};

export default PlanetBackground;
