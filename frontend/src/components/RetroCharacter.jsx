import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

const RetroCharacter = ({ characterType = 'dancer', size = 'large' }) => {
  const containerRef = useRef(null);

  // Simple SVG shapes for different character types
  const getCharacterSVG = () => {
    switch (characterType) {
      case 'dancer':
        return (
          `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="80" r="30" fill="#FF69B4" />
            <rect x="70" y="110" width="60" height="80" rx="10" fill="#FF69B4" />
            <circle cx="85" cy="70" r="5" fill="#000" />
            <circle cx="115" cy="70" r="5" fill="#000" />
            <path d="M 90 90 Q 100 100 110 90" stroke="#000" stroke-width="3" fill="none" />
          </svg>`
        );
      case 'wave':
        return (
          `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="80" r="30" fill="#4169E1" />
            <rect x="70" y="110" width="60" height="80" rx="10" fill="#4169E1" />
            <circle cx="85" cy="70" r="5" fill="#000" />
            <circle cx="115" cy="70" r="5" fill="#000" />
            <path d="M 130 120 Q 150 110 160 130 Q 150 150 130 140" stroke="#000" stroke-width="3" fill="none" />
          </svg>`
        );
      case 'bounce':
        return (
          `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="80" r="30" fill="#32CD32" />
            <rect x="70" y="110" width="60" height="80" rx="10" fill="#32CD32" />
            <circle cx="85" cy="70" r="5" fill="#000" />
            <circle cx="115" cy="70" r="5" fill="#000" />
            <path d="M 90 100 Q 100 90 110 100" stroke="#000" stroke-width="3" fill="none" />
          </svg>`
        );
      case 'spin':
        return (
          `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="80" r="30" fill="#9370DB" />
            <rect x="70" y="110" width="60" height="80" rx="10" fill="#9370DB" />
            <circle cx="85" cy="70" r="5" fill="#000" />
            <circle cx="115" cy="70" r="5" fill="#000" />
            <path d="M 80 100 Q 100 80 120 100" stroke="#000" stroke-width="3" fill="none" />
          </svg>`
        );
      default:
        return (
          `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="80" r="30" fill="#FFA500" />
            <rect x="70" y="110" width="60" height="80" rx="10" fill="#FFA500" />
            <circle cx="85" cy="70" r="5" fill="#000" />
            <circle cx="115" cy="70" r="5" fill="#000" />
            <path d="M 90 95 Q 100 85 110 95" stroke="#000" stroke-width="3" fill="none" />
          </svg>`
        );
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      // Set the initial SVG content
      containerRef.current.innerHTML = getCharacterSVG();
      
      // Add Anime.js animations for extra "sexy" movement
      const element = containerRef.current;
      
      // Different animation patterns based on character type
      switch (characterType) {
        case 'dancer':
          animate({
            targets: element,
            rotate: [0, 10, -10, 0],
            translateY: [0, -10, 0],
            scale: [1, 1.05, 1],
            duration: 2000,
            easing: 'easeInOutQuad',
            loop: true
          });
          break;
          
        case 'wave':
          animate({
            targets: element,
            translateX: [-10, 10],
            rotate: [0, 5, -5, 0],
            duration: 1500,
            easing: 'easeInOutSine',
            loop: true
          });
          break;
          
        case 'bounce':
          animate({
            targets: element,
            translateY: [0, -20, 0],
            scale: [1, 1.1, 1],
            duration: 1200,
            easing: 'easeOutElastic',
            loop: true
          });
          break;
          
        case 'spin':
          animate({
            targets: element,
            rotate: [0, 360],
            duration: 4000,
            easing: 'linear',
            loop: true
          });
          break;
          
        default:
          animate({
            targets: element,
            rotate: [0, 10, -10, 0],
            translateY: [0, -10, 0],
            scale: [1, 1.05, 1],
            duration: 2000,
            easing: 'easeInOutQuad',
            loop: true
          });
      }
    }

    // Cleanup function
    return () => {
      // No cleanup needed for SVG content
    };
  }, [characterType]);

  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  return (
    <div 
      ref={containerRef} 
      className={`${sizeClasses[size]} mx-auto relative`}
    />
  );
};

export default RetroCharacter;