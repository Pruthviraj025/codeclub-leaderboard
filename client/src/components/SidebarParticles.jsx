import { useEffect, useRef } from 'react';

/**
 * SidebarParticles
 * Lightweight, atmospheric background particle effect inspired by Grain Mass.
 * Fully isolated from Grain Mass source/shaders.
 * Features:
 * - Grain Mass palette: aqua/cyan, violet/purple, golden amber, coral pink, starlight white
 * - Slow organic harmonic drift with soft twinkle
 * - Auto-pauses when tab is inactive (Visibility API)
 * - Honors prefers-reduced-motion
 * - Non-interfering: pointer-events none, runs behind content
 */
export default function SidebarParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = null;
    let isVisible = !document.hidden;

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Palette directly matching Grain Mass DEFAULT_COLORS (#4300FF indigo, #AA00FF violet, #FFC12B gold, #63BAFF cyan)
    const COLOR_PALETTE = [
      { r: 67, g: 0, b: 255 },    // Grain Mass Indigo (#4300FF)
      { r: 112, g: 66, b: 255 },  // Lighter Indigo Spark (#7042FF)
      { r: 170, g: 0, b: 255 },   // Grain Mass Violet (#AA00FF)
      { r: 255, g: 193, b: 43 },  // Grain Mass Amber Gold (#FFC12B)
      { r: 99, g: 186, b: 255 },  // Grain Mass Sky Blue (#63BAFF)
      { r: 255, g: 255, b: 255 }  // Starlight White
    ];

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Particle state
    const PARTICLE_COUNT = 32;
    const particles = [];

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticle() {
      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      // Bias vertical distribution toward top aura and lower half
      const yBias = Math.random();
      let initialY;
      if (yBias < 0.25) {
        initialY = Math.random() * (height * 0.2); // Near logo
      } else if (yBias < 0.5) {
        initialY = (height * 0.2) + Math.random() * (height * 0.35); // Mid
      } else {
        initialY = (height * 0.55) + Math.random() * (height * 0.45); // Lower background
      }

      return {
        x: Math.random() * (width || 220),
        y: initialY,
        radius: 0.9 + Math.random() * 1.6, // 0.9px - 2.5px
        color,
        baseAlpha: 0.12 + Math.random() * 0.28, // 0.12 - 0.40
        currentAlpha: 0.2,
        twinkleSpeed: 0.008 + Math.random() * 0.015,
        twinklePhase: Math.random() * Math.PI * 2,
        // Slow gentle velocity
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.08 - Math.random() * 0.16, // Gentle upward/ambient drift
        wanderAngle: Math.random() * Math.PI * 2,
        wanderSpeed: 0.01 + Math.random() * 0.02
      };
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
      }
    }

    resize();
    initParticles();

    // Render a single static frame for reduced motion
    if (prefersReducedMotion) {
      renderStaticFrame();
      return;
    }

    function renderStaticFrame() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const { r, g, b } = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.baseAlpha * 0.8})`;
        ctx.fill();
      }
    }

    let lastTime = performance.now();

    function animate(now) {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min((now - lastTime) / 16.667, 2.5); // Normalized frame delta
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Smooth organic wander
        p.wanderAngle += p.wanderSpeed * dt;
        const driftX = Math.cos(p.wanderAngle) * 0.08;

        p.x += (p.vx + driftX) * dt;
        p.y += p.vy * dt;

        // Twinkle calculation
        p.twinklePhase += p.twinkleSpeed * dt;
        const twinkleMod = 0.65 + 0.35 * Math.sin(p.twinklePhase);
        p.currentAlpha = p.baseAlpha * twinkleMod;

        // Wrap around boundaries with soft buffer
        if (p.x < -8) p.x = width + 8;
        else if (p.x > width + 8) p.x = -8;

        if (p.y < -8) {
          p.y = height + 8;
          p.x = Math.random() * width;
        } else if (p.y > height + 8) {
          p.y = -8;
          p.x = Math.random() * width;
        }

        // Draw particle with subtle soft glow
        const { r, g, b } = p.color;

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.currentAlpha})`;
        ctx.fill();

        // Very soft outer halo for larger particles
        if (p.radius > 1.8) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.currentAlpha * 0.18})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);

    // Visibility change handler (pauses when tab in background)
    function handleVisibility() {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    let resizeTimeout = null;
    function handleResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resize();
      }, 150);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.9
      }}
      aria-hidden="true"
    />
  );
}

