'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: number; // 0=circle, 1=rect, 2=ribbon
  wobble: number;
  wobbleSpeed: number;
}

const COLORS = [
  '#DFD0B8', '#B8A99A', '#948979',
  '#E85D5D', '#ef4444',
  '#f59e0b', '#fbbf24',
  '#6B9080', '#7A8B9A',
  '#DFD0B8', '#F0E6D3',
  '#FFD700', '#FF69B4',
];

interface CelebrationProps {
  trigger: boolean;
  onComplete?: () => void;
  message?: string;
  emoji?: string;
}

export default function Celebration({ trigger, onComplete, message, emoji = '🎉' }: CelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const triggerCountRef = useRef(0);

  const dismiss = useCallback(() => {
    setToastFading(true);
    setTimeout(() => {
      setToastVisible(false);
      setToastFading(false);
      setVisible(false);
      onComplete?.();
    }, 300);
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) return;

    triggerCountRef.current += 1;
    const thisTrigger = triggerCountRef.current;

    setVisible(true);
    setToastVisible(true);
    setToastFading(false);

    // Auto-dismiss after 3.5s
    const autoClose = setTimeout(() => {
      if (triggerCountRef.current === thisTrigger) {
        dismiss();
      }
    }, 3500);

    // Confetti canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create falling confetti from top spread
    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 7,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        type: Math.floor(Math.random() * 3),
        wobble: Math.random() * 10,
        wobbleSpeed: 0.03 + Math.random() * 0.05,
      });
    }
    particlesRef.current = particles;

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      let alive = false;
      for (const p of particlesRef.current) {
        if (p.opacity <= 0) continue;

        p.x += p.vx + Math.sin(frame * p.wobbleSpeed + p.wobble) * 0.8;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out as it passes bottom third
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.02;
        }
        if (p.y > canvas.height + 20) {
          p.opacity = 0;
          continue;
        }

        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.type === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 1) {
          ctx.fillRect(-p.size * 0.5, -p.size * 0.2, p.size, p.size * 0.4);
        } else {
          // ribbon / streamer
          ctx.fillRect(-p.size * 0.15, -p.size * 0.6, p.size * 0.3, p.size * 1.2);
        }
        ctx.restore();
      }

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(autoClose);
    };
  }, [trigger, dismiss]);

  if (!visible) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        style={{ width: '100vw', height: '100vh' }}
      />
      {toastVisible && message && (
        <div className="fixed inset-x-0 top-0 z-[101] flex justify-center pt-4 px-4 pointer-events-none">
          <div
            onClick={dismiss}
            className={`pointer-events-auto cursor-pointer flex items-center gap-3 bg-white rounded-xl shadow-lg border border-orange-200 px-5 py-3.5 max-w-sm w-full transition-all duration-300 ${
              toastFading
                ? 'opacity-0 -translate-y-4'
                : 'opacity-100 translate-y-0 animate-[slideDown_0.4s_ease-out]'
            }`}
          >
            <span className="text-3xl shrink-0">{emoji}</span>
            <p className="text-[14px] font-semibold text-gray-800 tracking-tight leading-snug flex-1">{message}</p>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              className="shrink-0 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
