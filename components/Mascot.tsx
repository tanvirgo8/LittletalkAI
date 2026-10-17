'use client';

import React from 'react';

export type MascotState = 'idle' | 'talking' | 'cheering' | 'thinking' | 'sleeping';

interface MascotProps {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function Mascot({
  state = 'idle',
  size = 'md',
  onClick,
  className = '',
}: MascotProps) {
  const dimensions = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-36 h-36 sm:w-44 sm:h-44',
  }[size];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Lumi the star mascot, currently ${state}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
    >
      <div
        className={`${dimensions} ${
          state === 'cheering'
            ? 'animate-bounce-gentle'
            : state === 'sleeping'
            ? 'opacity-80'
            : 'animate-float'
        }`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Warm glowing golden gradient */}
            <linearGradient id="lumiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="50%" stopColor="#FFD54F" />
              <stop offset="100%" stopColor="#FFA000" />
            </linearGradient>

            {/* Cheek blush gradient */}
            <radialGradient id="blush">
              <stop offset="0%" stopColor="#FF8A80" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF8A80" stopOpacity="0" />
            </radialGradient>

            {/* Aura filter */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Soft outer glow halo */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="#FFF9C4"
            opacity="0.4"
            className="animate-pulse"
          />

          {/* 5-pointed rounded star body */}
          <path
            d="M 100 15 
               C 105 45, 120 60, 150 65 
               C 180 70, 175 95, 155 115 
               C 135 135, 135 155, 145 185 
               C 125 180, 105 165, 100 165 
               C 95 165, 75 180, 55 185 
               C 65 155, 65 135, 45 115 
               C 25 95, 20 70, 50 65 
               C 80 60, 95 45, 100 15 Z"
            fill="url(#lumiGlow)"
            stroke="#F57C00"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Rosy Cheeks */}
          <circle cx="68" cy="112" r="12" fill="url(#blush)" />
          <circle cx="132" cy="112" r="12" fill="url(#blush)" />

          {/* Expressions depending on state */}
          {state === 'sleeping' ? (
            /* Sleeping: crescent eyes & small smile */
            <>
              {/* Left eye shut */}
              <path
                d="M 65 98 Q 75 106 85 98"
                stroke="#4E342E"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right eye shut */}
              <path
                d="M 115 98 Q 125 106 135 98"
                stroke="#4E342E"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Sleeping mouth */}
              <ellipse cx="100" cy="118" rx="4" ry="3" fill="#D84315" />
              {/* Zzz bubbles */}
              <text
                x="145"
                y="65"
                fontFamily="sans-serif"
                fontSize="20"
                fontWeight="bold"
                fill="#7E57C2"
                className="animate-pulse"
              >
                Zzz
              </text>
            </>
          ) : state === 'cheering' ? (
            /* Cheering: sparkling happy eyes & big open mouth */
            <>
              {/* Left happy arch eye */}
              <path
                d="M 64 96 Q 74 84 84 96"
                stroke="#3E2723"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right happy arch eye */}
              <path
                d="M 116 96 Q 126 84 136 96"
                stroke="#3E2723"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Big joyful mouth */}
              <path
                d="M 85 112 Q 100 136 115 112 Z"
                fill="#D84315"
                stroke="#BF360C"
                strokeWidth="3"
              />
              {/* Tongue */}
              <path d="M 92 124 Q 100 120 108 124 Q 100 132 92 124" fill="#FF8A80" />
              {/* Tiny celebration sparkles */}
              <circle cx="35" cy="45" r="4" fill="#FFF" />
              <circle cx="165" cy="45" r="5" fill="#FFF" />
            </>
          ) : state === 'thinking' ? (
            /* Thinking: one curious eye, mouth sideways */
            <>
              {/* Big curious left eye */}
              <circle cx="74" cy="95" r="9" fill="#3E2723" />
              <circle cx="71" cy="91" r="3.5" fill="#FFFFFF" />
              {/* Squinted right eye */}
              <path
                d="M 118 95 Q 126 90 134 95"
                stroke="#3E2723"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Curious mouth */}
              <ellipse cx="104" cy="118" rx="5" ry="5" fill="#BF360C" />
              {/* Question bubble / hint */}
              <text
                x="142"
                y="55"
                fontFamily="sans-serif"
                fontSize="24"
                fill="#FF6F00"
                fontWeight="bold"
              >
                ?
              </text>
            </>
          ) : (
            /* Idle / Talking: Warm shiny eyes & sweet smile */
            <>
              {/* Left Eye */}
              <circle cx="74" cy="96" r="8" fill="#3E2723" />
              <circle cx="71" cy="93" r="3" fill="#FFFFFF" />
              {/* Right Eye */}
              <circle cx="126" cy="96" r="8" fill="#3E2723" />
              <circle cx="123" cy="93" r="3" fill="#FFFFFF" />
              {/* Cheerful Smile */}
              <path
                d={
                  state === 'talking'
                    ? 'M 88 114 Q 100 130 112 114 Z'
                    : 'M 88 112 Q 100 126 112 112'
                }
                fill={state === 'talking' ? '#D84315' : 'none'}
                stroke="#4E342E"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Little Star Crown Sparkle */}
          <polygon
            points="100,5 103,12 110,15 103,18 100,25 97,18 90,15 97,12"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </svg>
      </div>

      {/* Mascot status pill */}
      <span className="sr-only">Lumi the friendly learning companion</span>
    </div>
  );
}
