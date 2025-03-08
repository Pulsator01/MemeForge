import { useEffect, useRef } from 'react';

interface TokenChartProps {
  agentName: string;
}

export function TokenChart({ agentName }: TokenChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Generate random data points based on agent name (for consistency)
    const seed = agentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const dataPoints = generateDataPoints(seed, 50);
    
    // Draw chart
    drawChart(ctx, dataPoints, rect.width, rect.height);
  }, [agentName]);

  // Generate pseudo-random data points based on seed
  const generateDataPoints = (seed: number, count: number) => {
    const points: number[] = [];
    let value = 100;
    let random = mulberry32(seed);
    
    for (let i = 0; i < count; i++) {
      // Add some randomness but keep a general upward trend
      const change = (random() - 0.3) * 10; // Bias toward positive changes
      value = Math.max(50, value + change);
      points.push(value);
    }
    
    return points;
  };

  // Simple pseudo-random number generator with seed
  const mulberry32 = (seed: number) => {
    return () => {
      seed += 0x6D2B79F5;
      let t = seed;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  // Draw the chart
  const drawChart = (ctx: CanvasRenderingContext2D, data: number[], width: number, height: number) => {
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxValue = Math.max(...data) * 1.1;
    const minValue = Math.min(...data) * 0.9;
    const valueRange = maxValue - minValue;
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(50, 169, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(50, 169, 255, 0)');
    
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    // Draw line and fill area
    data.forEach((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Complete the path for filling
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw the line
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = '#32A9FF';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  return (
    <div className="w-full h-40 mt-4">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
      />
    </div>
  );
} 