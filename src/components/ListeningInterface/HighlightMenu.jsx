import React from "react";

export default function HighlightMenu({ position, onHighlight, onClear }) {
    if (!position) return null;

    return (
        <div 
            className="floating-menu" 
            style={{ top: position.top, left: position.left }} 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} 
        >
            <span 
                role="button"
                className="float-btn" 
                onMouseDown={(e) => {
                    e.preventDefault(); 
                    onHighlight(e);
                }}
            >
                ✏️ Highlight
            </span>
            
            <div style={{width:1, background:'#4b5563', margin:'0 4px'}}></div>
            
            <span 
                role="button"
                className="float-btn" 
                onMouseDown={(e) => {
                    e.preventDefault();
                    onClear(e);
                }}
                style={{color:'#fca5a5'}}
            >
                ✕
            </span>
        </div>
    );
}