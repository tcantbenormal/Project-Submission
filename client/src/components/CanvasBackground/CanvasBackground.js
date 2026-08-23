import React, { useEffect, useRef } from 'react';
import './CanvasBackground.css';

const CanvasBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor() {
        this.reset(true);
      }
      
      reset(randomizeRadius = false) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Start particles at the edge, or randomly spread initially
        const maxRadius = Math.max(canvas.width, canvas.height);
        const radius = randomizeRadius ? Math.random() * maxRadius : maxRadius;
        const angle = Math.random() * Math.PI * 2;
        
        this.x = centerX + Math.cos(angle) * radius;
        this.y = centerY + Math.sin(angle) * radius;
        
        // Smaller dots for elegance
        this.size = Math.random() * 1.2 + 0.3;
        
        // Velocity towards center
        const speed = Math.random() * 0.8 + 0.2;
        // Direction is exactly towards center
        this.vx = (centerX - this.x) / radius * speed;
        this.vy = (centerY - this.y) / radius * speed;
        this.alpha = 0;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Fade in gradually
        if (this.alpha < 0.8) this.alpha += 0.01;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dist = Math.hypot(centerX - this.x, centerY - this.y);
        
        // Reset if it gets close to the center glowing spiral
        if (dist < 80) {
          this.reset();
        }
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Generate 200 dynamic particles
    const particles = Array.from({ length: 200 }, () => new Particle());

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="canvas-bg-container">
      <div className="teal-spiral"></div>
      <canvas ref={canvasRef} className="particles-canvas"></canvas>
    </div>
  );
};

export default CanvasBackground;
