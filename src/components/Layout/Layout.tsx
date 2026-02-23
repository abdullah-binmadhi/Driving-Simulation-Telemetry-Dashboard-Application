import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

const Layout = () => {
    const { game } = useSettingsStore();

    // Sync simulation mode with backend on startup
    useEffect(() => {
        if (window.electronAPI) {
            if (window.electronAPI.toggleSimulationMode) {
                window.electronAPI.toggleSimulationMode(game.simulationEnabled);
            }
            if (window.electronAPI.updateSimulationTransmission) {
                window.electronAPI.updateSimulationTransmission(game.transmissionType);
            }
            if (window.electronAPI.updateSimulationBehavior) {
                window.electronAPI.updateSimulationBehavior(game.drivingBehavior);
            }
        }
    }, [game.simulationEnabled, game.transmissionType, game.drivingBehavior]);

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
