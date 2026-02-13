import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
    const handleMinimize = () => {
        window.electronAPI.minimize();
    };

    const handleMaximize = () => {
        window.electronAPI.maximize();
    };

    const handleClose = () => {
        window.electronAPI.close();
    };

    return (
        <div className="h-8 bg-slate-900 flex items-center justify-between select-none p-2 [-webkit-app-region:drag]">
            <div className="text-xs text-slate-400 font-medium px-2">Driving Telemetry</div>
            <div className="flex items-center [-webkit-app-region:no-drag]">
                <button
                    onClick={handleMinimize}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Minimize"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Maximize"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                    title="Close"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
