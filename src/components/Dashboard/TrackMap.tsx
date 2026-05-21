import { useRef, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

type TrackPoint = { x: number; y: number; gap?: boolean };

const MAX_POINTS = 5000;
const MIN_POINT_SPACING = 0.75;
const MAX_CONNECTED_JUMP = 120;

const TrackMap = () => {
    const { data, isConnected, activeGame } = useTelemetryStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pathRef = useRef<TrackPoint[]>([]);
    const activeGameRef = useRef<string | null>(null);

    const boundsRef = useRef({
        minX: 0, maxX: 0,
        minY: 0, maxY: 0,
        initialized: false
    });

    useEffect(() => {
        if (!data || !isConnected) return;

        if (activeGameRef.current !== activeGame) {
            pathRef.current = [];
            boundsRef.current = { minX: 0, maxX: 0, minY: 0, maxY: 0, initialized: false };
            activeGameRef.current = activeGame;
        }

        const currentPos = {
            x: Number(data.posX),
            y: Number(data.posZ ?? data.posY)
        };

        if (!Number.isFinite(currentPos.x) || !Number.isFinite(currentPos.y)) return;

        const lastPos = pathRef.current[pathRef.current.length - 1];
        const moved = lastPos ? Math.hypot(currentPos.x - lastPos.x, currentPos.y - lastPos.y) : Infinity;
        const isLargeJump = lastPos && moved > MAX_CONNECTED_JUMP;

        if (!lastPos || moved > MIN_POINT_SPACING) {
            pathRef.current.push({ ...currentPos, gap: isLargeJump });
            if (pathRef.current.length > MAX_POINTS) {
                pathRef.current = pathRef.current.slice(pathRef.current.length - MAX_POINTS);
                boundsRef.current.initialized = false;
            }

            if (!boundsRef.current.initialized) {
                boundsRef.current = {
                    minX: currentPos.x,
                    maxX: currentPos.x,
                    minY: currentPos.y,
                    maxY: currentPos.y,
                    initialized: true
                };
            } else {
                boundsRef.current.minX = Math.min(boundsRef.current.minX, currentPos.x);
                boundsRef.current.maxX = Math.max(boundsRef.current.maxX, currentPos.x);
                boundsRef.current.minY = Math.min(boundsRef.current.minY, currentPos.y);
                boundsRef.current.maxY = Math.max(boundsRef.current.maxY, currentPos.y);
            }
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        if (pathRef.current.length < 2) return;

        const padding = 24 * dpr;
        const trackWidth = Math.max(boundsRef.current.maxX - boundsRef.current.minX, 1);
        const trackHeight = Math.max(boundsRef.current.maxY - boundsRef.current.minY, 1);

        const scaleX = (width - padding * 2) / trackWidth;
        const scaleY = (height - padding * 2) / trackHeight;
        const scale = Math.min(scaleX, scaleY);

        // Center offsets
        const offsetX = (width - trackWidth * scale) / 2 - boundsRef.current.minX * scale;
        const offsetY = (height - trackHeight * scale) / 2 - boundsRef.current.minY * scale;

        const toCanvasX = (x: number) => x * scale + offsetX;
        const toCanvasY = (y: number) => height - (y * scale + offsetY);

        ctx.beginPath();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2 * dpr;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < pathRef.current.length; i++) {
            const point = pathRef.current[i];
            if (i === 0 || point.gap) {
                ctx.moveTo(toCanvasX(point.x), toCanvasY(point.y));
            } else {
                ctx.lineTo(toCanvasX(point.x), toCanvasY(point.y));
            }
        }
        ctx.stroke();

        if (lastPos) {
            const heading = Math.atan2(currentPos.y - lastPos.y, currentPos.x - lastPos.x);
            const cx = toCanvasX(currentPos.x);
            const cy = toCanvasY(currentPos.y);
            const size = 8 * dpr;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-heading);
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10 * dpr;
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size * 0.65, -size * 0.55);
            ctx.lineTo(-size * 0.35, 0);
            ctx.lineTo(-size * 0.65, size * 0.55);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.beginPath();
        ctx.fillStyle = '#e0f2fe';
        ctx.arc(toCanvasX(currentPos.x), toCanvasY(currentPos.y), 3 * dpr, 0, Math.PI * 2);
        ctx.fill();

    }, [data, isConnected, activeGame]);

    const handleClearMap = () => {
        pathRef.current = [];
        boundsRef.current = { minX: 0, maxX: 0, minY: 0, maxY: 0, initialized: false };
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 flex-grow shadow-lg flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-slate-300">Live Track Map</h2>
                <button
                    onClick={handleClearMap}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                >
                    Clear Map
                </button>
            </div>

            <div className="w-full aspect-square rounded-xl border-2 border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                />
            </div>

            {!isConnected && (
                <div className="text-xs text-slate-500 mt-4 text-center">
                    Awaiting positional data...
                </div>
            )}
        </div>
    );
};

export default TrackMap;
