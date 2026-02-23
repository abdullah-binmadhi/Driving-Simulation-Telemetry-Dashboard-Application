import { useRef, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

const TrackMap = () => {
    const { data, isConnected } = useTelemetryStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pathRef = useRef<{ x: number, y: number }[]>([]);

    // Canvas scaling and offset state (simplified auto-centering)
    const boundsRef = useRef({
        minX: 0, maxX: 0,
        minY: 0, maxY: 0
    });

    useEffect(() => {
        if (!data || !isConnected) return;

        // In many games, Y is up (elevation), and X/Z are the flat 2D plane. 
        // We'll assume X and Y from the store are the 2D plane for now. 
        // If the game uses X/Z, you might need to swap data.posY for data.posZ here.
        const currentPos = {
            x: data.posX || 0,
            y: data.posZ || data.posY || 0 // Default to Z for longitudinal distance in most 3D engines
        };

        // Only add point if car has moved significantly (e.g., > 1 meter) to save memory
        const lastPos = pathRef.current[pathRef.current.length - 1];
        if (!lastPos || Math.hypot(currentPos.x - lastPos.x, currentPos.y - lastPos.y) > 1.0) {
            pathRef.current.push(currentPos);

            // Update bounds for auto-scaling
            boundsRef.current.minX = Math.min(boundsRef.current.minX, currentPos.x);
            boundsRef.current.maxX = Math.max(boundsRef.current.maxX, currentPos.x);
            boundsRef.current.minY = Math.min(boundsRef.current.minY, currentPos.y);
            boundsRef.current.maxY = Math.max(boundsRef.current.maxY, currentPos.y);
        }

        // --- Draw Loop ---
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (pathRef.current.length < 2) return;

        // Calculate scale to fit the entire track inside the canvas with padding
        const padding = 20;
        const trackWidth = Math.max(boundsRef.current.maxX - boundsRef.current.minX, 1);
        const trackHeight = Math.max(boundsRef.current.maxY - boundsRef.current.minY, 1);

        const scaleX = (width - padding * 2) / trackWidth;
        const scaleY = (height - padding * 2) / trackHeight;
        const scale = Math.min(scaleX, scaleY);

        // Center offsets
        const offsetX = (width - trackWidth * scale) / 2 - boundsRef.current.minX * scale;
        const offsetY = (height - trackHeight * scale) / 2 - boundsRef.current.minY * scale;

        // Helper to convert real world coordinates to canvas coordinates
        const toCanvasX = (x: number) => x * scale + offsetX;
        const toCanvasY = (y: number) => y * scale + offsetY;

        // Draw the path (Racing Line)
        ctx.beginPath();
        ctx.strokeStyle = '#475569'; // Slate-600
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(toCanvasX(pathRef.current[0].x), toCanvasY(pathRef.current[0].y));
        for (let i = 1; i < pathRef.current.length; i++) {
            ctx.lineTo(toCanvasX(pathRef.current[i].x), toCanvasY(pathRef.current[i].y));
        }
        ctx.stroke();

        // Draw Current Position Dot
        ctx.beginPath();
        ctx.fillStyle = '#38bdf8'; // Sky blue
        ctx.arc(toCanvasX(currentPos.x), toCanvasY(currentPos.y), 4, 0, Math.PI * 2);
        ctx.fill();

        // Add a subtle glow
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

    }, [data, isConnected]);

    const handleClearMap = () => {
        pathRef.current = [];
        boundsRef.current = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex-grow shadow-lg flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-300">Live Track Map</h2>
                <button
                    onClick={handleClearMap}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                >
                    Clear Map
                </button>
            </div>

            <div className="w-full aspect-square max-h-64 rounded-xl border-2 border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
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
