'use client';

import { useEffect, useRef } from 'react';

export default function BouncingBall() {
  const ballRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ball = ballRef.current;

    if (!ball) {
      return;
    }

    const parent = ball.parentElement;

    if (!parent) {
      return;
    }

    const ballSize = 32;

    // Случайная стартовая позиция внутри контейнера
    let x = Math.random() * Math.max(0, parent.clientWidth - ballSize);
    let y = Math.random() * Math.max(0, parent.clientHeight - ballSize);

    // Случайное направление движения
    let velocityX = Math.random() > 0.5 ? 1.2 : -1.2;
    let velocityY = Math.random() > 0.5 ? 0.9 : -0.9;

    let animationFrameId: number;

    const animate = () => {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;

      x += velocityX;
      y += velocityY;

      if (x <= 0) {
        x = 0;
        velocityX *= -1;
      }

      if (x + ballSize >= parentWidth) {
        x = parentWidth - ballSize;
        velocityX *= -1;
      }

      if (y <= 0) {
        y = 0;
        velocityY *= -1;
      }

      if (y + ballSize >= parentHeight) {
        y = parentHeight - ballSize;
        velocityY *= -1;
      }

      ball.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      animationFrameId = requestAnimationFrame(animate);
    };

    // Сразу ставим шарик в случайную позицию,
    // чтобы он не мигал сначала в левом верхнем углу
    ball.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ball.style.opacity = '1';

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={ballRef}
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        left-0
        top-0
        z-0
        h-8
        w-8
        rounded-full
        bg-[#9DA995]
        opacity-0
      "
    />
  );
}