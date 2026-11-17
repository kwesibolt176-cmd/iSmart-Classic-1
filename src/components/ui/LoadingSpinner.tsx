import React, { memo, useId } from 'react';
import { useTheme } from 'next-themes';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  message?: string | null;
}

export const LoadingSpinner = memo(({ size = 'default', message = null }: LoadingSpinnerProps) => {
  const { theme, systemTheme } = useTheme();
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const uniqueId = useId();
  // Start with true since images are preloaded in HTML head
  const sizeMap = {
    small: '48px',
    default: '64px',
    large: '96px'
  };

  const imageSize = sizeMap[size] || sizeMap.default;
  const ringSize = `calc(${imageSize} + 44px)`;

  const isDark = effectiveTheme === 'dark';

  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner-wrapper" style={{ width: ringSize, height: ringSize }}>
        {/* Outer glow effect */}
        <div className="loading-spinner-aura"></div>

        {/* Rotating ring with beautiful gradient */}
        <svg
          className="loading-spinner-ring"
          viewBox="0 0 100 100"
          style={{ width: ringSize, height: ringSize }}
        >
          <defs>
            <linearGradient id={`spinner-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#996145" stopOpacity="0">
                <animate attributeName="stop-color" values="#996145;#704630;#00876F;#704630;#996145" dur="1.6s" begin="0s" repeatCount="indefinite" keyTimes="0;0.2;0.5;0.8;1" />
              </stop>
              <stop offset="20%" stopColor="#996145" stopOpacity={isDark ? '0.3' : '0.25'}>
                <animate attributeName="stop-color" values="#996145;#704630;#00876F;#704630;#996145" dur="1.6s" begin="0.1s" repeatCount="indefinite" keyTimes="0;0.2;0.5;0.8;1" />
              </stop>
              <stop offset="50%" stopColor="#996145" stopOpacity="1">
                <animate attributeName="stop-color" values="#996145;#704630;#00876F;#704630;#996145" dur="1.6s" begin="0.3s" repeatCount="indefinite" keyTimes="0;0.2;0.5;0.8;1" />
              </stop>
              <stop offset="80%" stopColor="#996145" stopOpacity={isDark ? '0.3' : '0.25'}>
                <animate attributeName="stop-color" values="#996145;#704630;#00876F;#704630;#996145" dur="1.6s" begin="0.5s" repeatCount="indefinite" keyTimes="0;0.2;0.5;0.8;1" />
              </stop>
              <stop offset="100%" stopColor="#996145" stopOpacity="0">
                <animate attributeName="stop-color" values="#996145;#704630;#00876F;#704630;#996145" dur="1.6s" begin="0.7s" repeatCount="indefinite" keyTimes="0;0.2;0.5;0.8;1" />
              </stop>
            </linearGradient>
            <filter id={`glow-filter-${uniqueId}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background track */}
          <circle
            className="loading-spinner-track"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={isDark ? '0.12' : '0.18'}
          />
          {/* Animated progress arc with glow */}
          <circle
            className="loading-spinner-progress"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={`url(#spinner-gradient-${uniqueId})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset="283"
            filter={`url(#glow-filter-${uniqueId})`}
          />
        </svg>

        {/* Logo container with elegant shadow */}
        <div className="loading-spinner-logo-wrapper" style={{ width: imageSize, height: imageSize }}>
          <div className="loading-spinner-logo-shine"></div>
          <span className="loading-spinner-wordmark" aria-label="iSmartPay">
            <span>iSmart</span><strong>Pay</strong>
          </span>
        </div>
      </div>
      {message && (
        <p className="loading-spinner-message">{message}</p>
      )}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';
