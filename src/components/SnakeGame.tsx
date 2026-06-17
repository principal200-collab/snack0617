import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInterval } from '../hooks/useInterval';
import { Play, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const SCALE = 20;
const GRID_W = Math.floor(CANVAS_WIDTH / SCALE);
const GRID_H = Math.floor(CANVAS_HEIGHT / SCALE);

type Point = { x: number; y: number };

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 }; // Moving UP
const INITIAL_SPEED = 150;

const getRandomFoodPosition = (snake: Point[]): Point => {
  let newFood: Point;
  let isOccupied = true;
  while (isOccupied) {
    newFood = {
      x: Math.floor(Math.random() * GRID_W),
      y: Math.floor(Math.random() * GRID_H),
    };
    // Ensure food doesn't spawn on the snake
    // eslint-disable-next-line no-loop-func
    isOccupied = snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y);
  }
  return newFood!;
};

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);

  // We use a ref to track the last processed direction to prevent
  // the snake from reversing into itself if two keys are pressed very quickly
  const lastProcessedDirection = useRef<Point>(INITIAL_DIRECTION);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    lastProcessedDirection.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setIsStarted(true);
    setSpeed(INITIAL_SPEED);
    setFood(getRandomFoodPosition(INITIAL_SNAKE));
  };

  const endGame = () => {
    setGameOver(true);
    setIsStarted(false);
  };

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (!isStarted && e.code === 'Space') {
        startGame();
        return;
      }

      if (!isStarted || gameOver) return;

      const { x: lastX, y: lastY } = lastProcessedDirection.current;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (lastY !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (lastY !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (lastX !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (lastX !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    },
    [isStarted, gameOver]
  );

  // Expose manual controls for mobile buttons
  const manualControl = (newDir: Point) => {
      const { x: lastX, y: lastY } = lastProcessedDirection.current;
      if (newDir.x !== 0 && lastX !== 0) return; // Cant reverse horizontal
      if (newDir.y !== 0 && lastY !== 0) return; // Cant reverse vertical
      setDirection(newDir);
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const gameLoop = () => {
    const head = { ...snake[0] };
    const currentDir = direction;

    head.x += currentDir.x;
    head.y += currentDir.y;

    lastProcessedDirection.current = currentDir;

    // 1. Collision with Walls
    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) {
      endGame();
      return;
    }

    // 2. Collision with Self
    for (const segment of snake) {
      if (head.x === segment.x && head.y === segment.y) {
        endGame();
        return;
      }
    }

    const newSnake = [head, ...snake];

    // 3. Check Food collision
    if (head.x === food.x && head.y === food.y) {
      setScore((s) => s + 10);
      setFood(getRandomFoodPosition(newSnake));
      // Speed up slightly as you eat
      setSpeed((prev) => Math.max(prev - 2, 60));
    } else {
      // Didn't eat, pop the tail
      newSnake.pop();
    }

    setSnake(newSnake);
  };

  // Run the game loop
  useInterval(gameLoop, isStarted && !gameOver ? speed : null);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#000'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid (optional, subtle)
    ctx.strokeStyle = '#111'; 
    for (let x = 0; x <= CANVAS_WIDTH; x += SCALE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += SCALE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#f472b6'; 
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#f472b6';
    
    // Draw food slightly smaller than cell for asthetics
    ctx.beginPath();
    ctx.arc(food.x * SCALE + SCALE/2, food.y * SCALE + SCALE/2, SCALE/3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw Snake
    snake.forEach((segment, index) => {
      // Head is a different color
      ctx.fillStyle = index === 0 ? '#38bdf8' : '#0ea5e9'; 
      ctx.shadowBlur = index === 0 ? 15 : 0;
      ctx.shadowColor = '#38bdf8';

      // Add a slight margin from the edges for visual separation
      const margin = 1;
      ctx.fillRect(
          segment.x * SCALE + margin, 
          segment.y * SCALE + margin, 
          SCALE - margin * 2, 
          SCALE - margin * 2
      );
      ctx.shadowBlur = 0;

      // Draw eyes on the head
      if (index === 0) {
        ctx.fillStyle = '#000';
        const eyeSize = 3;
        const eyeOffset = 5;
        let leftEye = {x: 0, y: 0}, rightEye = {x: 0, y: 0};
        
        // Position eyes based on direction
        const currentDir = lastProcessedDirection.current;
        if (currentDir.x === 1) { // RIGHT
            leftEye = { x: segment.x * SCALE + SCALE - eyeOffset, y: segment.y * SCALE + eyeOffset };
            rightEye = { x: segment.x * SCALE + SCALE - eyeOffset, y: segment.y * SCALE + SCALE - eyeOffset };
        } else if (currentDir.x === -1) { // LEFT
            leftEye = { x: segment.x * SCALE + eyeOffset, y: segment.y * SCALE + eyeOffset };
            rightEye = { x: segment.x * SCALE + eyeOffset, y: segment.y * SCALE + SCALE - eyeOffset };
        } else if (currentDir.y === -1) { // UP
            leftEye = { x: segment.x * SCALE + eyeOffset, y: segment.y * SCALE + eyeOffset };
            rightEye = { x: segment.x * SCALE + SCALE - eyeOffset, y: segment.y * SCALE + eyeOffset };
        } else if (currentDir.y === 1) { // DOWN
            leftEye = { x: segment.x * SCALE + eyeOffset, y: segment.y * SCALE + SCALE - eyeOffset };
            rightEye = { x: segment.x * SCALE + SCALE - eyeOffset, y: segment.y * SCALE + SCALE - eyeOffset };
        }

        ctx.beginPath();
        ctx.arc(leftEye.x, leftEye.y, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEye.x, rightEye.y, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [snake, food]);

  return (
    <div className="w-full h-screen bg-[#0a0a0c] text-white flex flex-col font-sans overflow-hidden" style={{ minHeight: '100vh', backgroundColor: '#0a0a0c' }}>
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-[#111114]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#38bdf8] rounded-lg shadow-[0_0_15px_rgba(56,189,248,0.5)] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white rounded-sm"></div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-[#38bdf8]">
            NEON<span className="text-white">SNAKE</span>
          </h1>
        </div>
        <div className="flex gap-6 md:gap-12 font-mono">
          <div className="text-center">
            <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest mb-1">Score</div>
            <div className="text-xl md:text-3xl font-bold text-[#f472b6]">
              {score.toString().padStart(4, '0')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest mb-1">Speed</div>
            <div className="text-xl md:text-3xl font-bold text-white">
              {(150 - speed + 10).toString().padStart(3, '0')}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 md:p-8 bg-gradient-to-b from-[#0a0a0c] to-[#1a1a24] gap-8 md:gap-12 overflow-y-auto md:overflow-hidden">
        {/* Game Stage Container */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative p-1 bg-gradient-to-br from-[#38bdf8] via-[#f472b6] to-[#38bdf8] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] group overflow-hidden">
            
            {/* The Canvas */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block max-w-full aspect-square touch-none outline-none rounded-lg bg-[#000] cursor-crosshair"
              tabIndex={0} // Allows canvas to receive focus for keyboard events if needed
            />

            {/* Overlays */}
            {(!isStarted || gameOver) && (
              <div className="absolute inset-1 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 rounded-lg">
                {gameOver ? (
                  <>
                    <div className="mb-2 text-red-500">
                       <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    </div>
                    <h2 className="mb-2 text-3xl md:text-4xl font-black text-[#f472b6] tracking-tight uppercase">Game Over</h2>
                    <p className="mb-8 text-gray-400 font-mono">Final Score: <span className="text-white font-bold">{score}</span></p>
                    <button
                      onClick={startGame}
                      className="flex items-center gap-2 rounded-full bg-[#f472b6] px-8 py-3 font-black text-xl text-[#0a0a0c] transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(244,114,182,0.4)]"
                    >
                      <RotateCcw size={20} />
                      RETRY
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="mb-4 text-3xl md:text-5xl font-black text-white tracking-widest uppercase">READY?</h2>
                    <button
                      onClick={startGame}
                      className="flex items-center gap-2 rounded-full bg-[#38bdf8] px-8 py-3 font-black text-xl text-[#0a0a0c] transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                    >
                      <Play size={20} className="fill-[#0a0a0c]" />
                      START MISSION
                    </button>
                    <p className="mt-8 text-xs md:text-sm text-gray-400 font-mono tracking-widest max-w-[250px] leading-relaxed">
                      USE ARROW KEYS TO CONTROL
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* On-Screen Mobile Controls */}
          <div className="mt-6 grid grid-cols-3 grid-rows-2 gap-2 w-full max-w-[180px] md:hidden">
              <div className="col-start-2 row-start-1">
                 <button 
                    className="w-full aspect-square bg-[#1e1e26] active:bg-[#2d2d38] rounded-lg flex items-center justify-center text-[#38bdf8] border border-white/5 shadow-sm"
                    onClick={() => manualControl({ x: 0, y: -1 })}
                  >
                      <ChevronUp size={28} />
                 </button>
              </div>
              <div className="col-start-1 row-start-2">
                   <button 
                    className="w-full aspect-square bg-[#1e1e26] active:bg-[#2d2d38] rounded-lg flex items-center justify-center text-[#38bdf8] border border-white/5 shadow-sm"
                    onClick={() => manualControl({ x: -1, y: 0 })}
                  >
                      <ChevronLeft size={28} />
                 </button>
              </div>
              <div className="col-start-2 row-start-2">
                   <button 
                    className="w-full aspect-square bg-[#1e1e26] active:bg-[#2d2d38] rounded-lg flex items-center justify-center text-[#38bdf8] border border-white/5 shadow-sm"
                    onClick={() => manualControl({ x: 0, y: 1 })}
                  >
                      <ChevronDown size={28} />
                 </button>
              </div>
               <div className="col-start-3 row-start-2">
                   <button 
                    className="w-full aspect-square bg-[#1e1e26] active:bg-[#2d2d38] rounded-lg flex items-center justify-center text-[#38bdf8] border border-white/5 shadow-sm"
                    onClick={() => manualControl({ x: 1, y: 0 })}
                  >
                      <ChevronRight size={28} />
                 </button>
              </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-64 flex flex-col gap-6 hidden lg:flex flex-shrink-0">
          <div className="bg-[#1e1e26] p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-[#38bdf8] font-bold uppercase text-xs tracking-widest mb-4">Instructions</h3>
            <ul className="space-y-4 text-sm text-gray-300 font-medium">
              <li><span className="text-white">↑ ↓ ← →</span> Navigate Snake</li>
              <li><span className="text-[#f472b6]">●</span> Eat Power Orbs</li>
              <li><span className="text-red-500">!</span> Avoid Walls & Self</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-[#f472b6]/10 to-transparent p-6 rounded-2xl border border-[#f472b6]/20">
            <h3 className="text-[#f472b6] font-bold uppercase text-xs tracking-widest mb-2">Status</h3>
            <div className="text-lg font-bold">
              {gameOver ? <span className="text-red-500">SYSTEM FAILURE</span> : isStarted ? "SYSTEMS NORMAL" : "STANDBY"}
            </div>
            <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
              <div className={`h-full w-2/3 ${gameOver ? 'bg-red-500' : isStarted ? 'bg-[#f472b6]' : 'bg-gray-500'}`}></div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#111114] px-6 md:px-12 py-4 border-t border-white/10 flex justify-between items-center text-[10px] font-mono tracking-widest text-gray-500 flex-shrink-0">
        <p>v2.0.4 STABLE BUILD</p>
        <p>© 2024 NEON ARCADE SYSTEMS</p>
      </footer>
    </div>
  );
};
