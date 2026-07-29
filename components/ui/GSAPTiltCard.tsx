'use client';

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export interface GSAPTiltCardProps {
  children: React.ReactNode;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function GSAPTiltCard({
  children,
  maxTilt = 8,
  perspective = 1000,
  scale = 1.02,
  className = '',
  onClick,
}: GSAPTiltCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const glare = glareRef.current;
    if (!el) return;

    let bounds: DOMRect;

    const handleMouseEnter = () => {
      bounds = el.getBoundingClientRect();
      gsap.to(el, { scale, duration: 0.3, ease: 'power2.out' });
      if (glare) gsap.to(glare, { opacity: 0.15, duration: 0.3 });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!bounds) bounds = el.getBoundingClientRect();
      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;

      const rotateX = ((mouseY - centerY) / centerY) * -maxTilt;
      const rotateY = ((mouseX - centerX) / centerX) * maxTilt;

      gsap.to(el, {
        rotateX,
        rotateY,
        transformPerspective: perspective,
        transformOrigin: 'center center',
        duration: 0.4,
        ease: 'power2.out',
      });

      if (glare) {
        const glareX = (mouseX / bounds.width) * 100;
        const glareY = (mouseY / bounds.height) * 100;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)`;
      }
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.7,
        ease: 'elastic.out(1, 0.4)',
      });
      if (glare) gsap.to(glare, { opacity: 0, duration: 0.5 });
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [maxTilt, perspective, scale]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl transition-shadow duration-300 transform-gpu ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Specular Glare Reflection Overlay */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300"
      />
      {children}
    </div>
  );
}
