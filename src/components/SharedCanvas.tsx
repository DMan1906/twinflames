// src/components/SharedCanvas.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { appwriteClient } from '@/lib/appwrite/client';
import { loadCanvasHistory, saveCanvasStroke } from '@/actions/canvas';
import { Trash2, PenTool } from 'lucide-react';

type Point = { x: number; y: number };

export default function SharedCanvas({ userId, partnerId }: { userId: string, partnerId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [error, setError] = useState('');
  
  const chatId = [userId, partnerId].sort().join('_');
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_CANVAS_COLLECTION_ID!;

  // --- Drawing Helper ---
  const drawLine = (points: Point[], color: string, width: number, ctx: CanvasRenderingContext2D) => {
    if (points.length === 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  // --- Coordinate Mapper ---
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  // --- Real-time Sync & Initialization ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load history via server action (avoids CORS)
    const loadHistory = async () => {
      try {
        const result = await loadCanvasHistory(userId);
        if (result.success && result.strokes) {
          result.strokes.forEach(stroke => {
            drawLine(stroke.points, stroke.color, stroke.width, ctx);
          });
        }
      } catch (err) {
        console.error("Failed to load canvas history:", err);
      }
    };

    loadHistory();

    // Subscribe to partner's strokes via Realtime
    const unsubscribe = appwriteClient.subscribe(
      `databases.${DB_ID}.collections.${COL_ID}.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const doc = response.payload as any;
          if (doc.chat_id === chatId && doc.sender_id !== userId) {
            drawLine(JSON.parse(doc.points), doc.color, doc.width, ctx);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [userId, DB_ID, COL_ID, chatId]);

  // --- Event Handlers ---
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const point = getCoordinates(e);
    setCurrentPoints([point]);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getCoordinates(e);
    setCurrentPoints((prev) => [...prev, point]);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#a855f7'; // Signature Purple
      ctx.lineWidth = 5;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handleEnd = async () => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      return;
    }
    setIsDrawing(false);

    // Save to Appwrite via server action (bypasses CORS)
    try {
      const result = await saveCanvasStroke(userId, currentPoints, '#a855f7', 5);
      if (!result.success) {
        setError(result.error || 'Failed to save stroke');
      }
    } catch (err) {
      console.error("Failed to sync stroke:", err);
      setError('Error saving stroke');
    }
    setCurrentPoints([]);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto gap-4 p-4">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2 text-purple-400">
          <PenTool size={18} />
          <span className="text-sm font-serif">Shared Canvas</span>
        </div>
        <button 
          onClick={() => {
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.clearRect(0, 0, 800, 800);
          }}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {error && <p className="text-sm text-red-400 px-2">{error}</p>}

      <div className="relative w-full aspect-square bg-white rounded-3xl shadow-2xl border-4 border-purple-900/20 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={800} // Fixed internal resolution
          height={800}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
      
      <p className="text-center text-[10px] text-purple-300/40 uppercase tracking-widest font-bold">
        Draw something for your partner
      </p>
    </div>
  );
}