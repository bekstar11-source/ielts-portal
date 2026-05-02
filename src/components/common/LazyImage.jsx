import React, { useState } from 'react';

export default function LazyImage({ src, alt, className = "", containerClassName = "w-full h-full", ...props }) {
    const [isLoaded, setIsLoaded] = useState(false);

    // If no src is provided, just render the placeholder
    if (!src) {
        return <div className={`bg-zinc-800/50 ${containerClassName} ${className}`} />;
    }

    return (
        <div className={`relative overflow-hidden ${containerClassName}`}>
            {/* Skeleton/Placeholder */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-zinc-800/50 animate-pulse" />
            )}
            
            {/* Actual Image */}
            <img 
                src={src} 
                alt={alt} 
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                className={`${className} ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'}`}
                style={{ 
                    transition: 'opacity 0.7s ease-out, filter 0.7s ease-out',
                    // Don't override existing transform transitions if they exist in className
                }}
                {...props}
            />
        </div>
    );
}
