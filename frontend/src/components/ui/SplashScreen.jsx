import React, { useEffect, useState } from 'react';

const SplashScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + Math.floor(Math.random() * 10) + 1;
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-mono">
      {/* Background Grid Effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 243, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Animated Circle / Logo Container */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border border-purple-500/50 animate-pulse-slow"></div>
        
        {/* Techy Hexagon Logo SVG */}
        <div className="relative z-10 p-6">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M50 5 L93.3 30 V80 L50 105 L6.7 80 V30 L50 5Z" 
              className="stroke-cyan-400 stroke-2 fill-transparent animate-draw-path"
              strokeDasharray="300"
              strokeDashoffset="300"
            />
            <path 
              d="M50 25 L75 40 V70 L50 85 L25 70 V40 L50 25Z" 
              className="stroke-purple-500 stroke-2 fill-transparent animate-draw-path-delayed"
              strokeDasharray="200"
              strokeDashoffset="200"
            />
            <circle cx="50" cy="55" r="5" className="fill-cyan-400 animate-pulse" />
          </svg>
        </div>
      </div>

      {/* Glitch Text Title */}
      <h1 className="text-4xl font-bold text-white tracking-widest relative group mb-4">
        <span className="relative inline-block before:content-['ECHO'] before:absolute before:-top-0.5 before:left-0.5 before:text-purple-500 before:opacity-70 before:animate-glitch-1 after:content-['ECHO'] after:absolute after:top-0.5 after:left-0.5 after:text-cyan-500 after:opacity-70 after:animate-glitch-2">
          ECHO
        </span>
        <span className="text-cyan-400">.CHAT</span>
      </h1>

      {/* Loading Status */}
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-xs text-cyan-500 uppercase tracking-widest">
          <span>Initializing System</span>
          <span>{Math.min(progress, 100)}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,243,255,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="text-[10px] text-gray-500 text-center mt-2 animate-pulse">
          ESTABLISHING SECURE CONNECTION...
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
