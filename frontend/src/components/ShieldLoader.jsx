import React from 'react';
import './ShieldLoader.css';

const ShieldLoader = () => {
  return (
    <div className="shield-loader-container">
      <div className="shield-loader">
        <div className="shield-ring"></div>
        <div className="shield-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 6V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6L12 2Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22C12 22 19 18 19 11V7L12 4L5 7V11C5 18 12 22 12 22Z" 
                  fill="currentColor" fillOpacity="0.2"/>
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ShieldLoader;
