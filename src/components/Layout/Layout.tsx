import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

const Layout = () => {
    const { game } = useSettingsStore();

    // Sync simulation mode with backend on startup
    useEffect(() => {
        if (window.electronAPI && window.electronAPI.toggleSimulationMode) {
            console.log('Syncing Simulation Mode:', game.simulationEnabled);
            window.electronAPI.toggleSimulationMode(game.simulationEnabled);
        }
    }, [game.simulationEnabled]); // Re-sync if it changes (redundant with toggle but safe)

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
