import { useSettingsStore } from '../../stores/settingsStore';

const Settings = () => {
    const { game, app, updateGameSettings, updateAppSettings } = useSettingsStore();

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Settings</h1>
            </div>

            <div className="space-y-6">
                {/* Game Integration Section */}
                <section className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h2 className="text-xl font-semibold mb-4 text-blue-400">Game Integration</h2>

                    <div className="space-y-6">
                        {/* Simulation Mode Toggle */}
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Simulation Mode</label>
                            <div className="flex items-center justify-between bg-slate-950 border border-slate-700 rounded-lg px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${game.simulationEnabled ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                    <span className="text-sm text-slate-300">Generate Mock Data</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        const newState = !game.simulationEnabled;
                                        updateGameSettings({ simulationEnabled: newState });
                                        if (window.electronAPI && window.electronAPI.toggleSimulationMode) {
                                            await window.electronAPI.toggleSimulationMode(newState);
                                        }
                                    }}
                                    className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${game.simulationEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {game.simulationEnabled ? 'ACTIVE' : 'OFF'}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">Generates fake telemetry data for testing the dashboard without a game.</p>
                        </div>

                        {/* Simulation Preferences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Simulation Transmission</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700">
                                    <button
                                        onClick={async () => {
                                            updateGameSettings({ transmissionType: 'automatic' });
                                            if (window.electronAPI?.updateSimulationTransmission) {
                                                await window.electronAPI.updateSimulationTransmission('automatic');
                                            }
                                        }}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${game.transmissionType !== 'manual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Automatic
                                    </button>
                                    <button
                                        onClick={async () => {
                                            updateGameSettings({ transmissionType: 'manual' });
                                            if (window.electronAPI?.updateSimulationTransmission) {
                                                await window.electronAPI.updateSimulationTransmission('manual');
                                            }
                                        }}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${game.transmissionType === 'manual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Manual
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Simulation Driving Behavior</label>
                                <select
                                    value={game.drivingBehavior}
                                    onChange={async (e) => {
                                        const behavior = e.target.value as any;
                                        updateGameSettings({ drivingBehavior: behavior });
                                        if (window.electronAPI?.updateSimulationBehavior) {
                                            await window.electronAPI.updateSimulationBehavior(behavior);
                                        }
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="Normal">Normal Driver</option>
                                    <option value="Professional">Professional</option>
                                    <option value="New driver">New Driver</option>
                                    <option value="Slow">Slow/Cautious</option>
                                    <option value="Reckless">Reckless</option>
                                    <option value="Drunk">Drunk</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 col-span-full">Configure the virtual driver behavior before activating simulation mode.</p>
                        </div>

                        <div className="pt-6 border-t border-slate-800 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">BeamNG.drive — UDP Ports</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* OutGauge Port */}
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">OutGauge Port <span className="text-slate-600">(instruments)</span></label>
                                    <input
                                        type="number"
                                        value={game.beamngPort}
                                        onChange={(e) => updateGameSettings({ beamngPort: parseInt(e.target.value) || 4444 })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <p className="text-xs text-slate-600">Speed, RPM, gear, pedals, fuel</p>
                                </div>

                                {/* OutSim Port (new) */}
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">OutSim Port <span className="text-slate-600">(physics)</span></label>
                                    <div className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-400 select-all cursor-text">
                                        4442
                                    </div>
                                    <p className="text-xs text-slate-600">G-Forces, position (X/Y/Z), steering</p>
                                </div>
                            </div>

                            {/* BeamNG Setup Guide */}
                            <details className="group bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
                                <summary className="flex items-center gap-2 px-4 py-2 cursor-pointer text-xs text-blue-400 hover:text-blue-300 transition-colors list-none">
                                    <svg className="w-3 h-3 rotate-0 group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    How to configure BeamNG.drive
                                </summary>
                                <div className="px-4 pb-4 pt-2 space-y-3 text-xs text-slate-400 border-t border-slate-800">
                                    <p>In BeamNG.drive, go to <span className="text-white font-semibold">Main Menu → Options → Gameplay</span> and scroll to the <span className="text-white font-semibold">OutGauge / OutSim</span> section:</p>
                                    <ol className="space-y-2 list-decimal list-inside">
                                        <li>
                                            <span className="text-slate-300 font-medium">OutGauge</span> — Enable and set:
                                            <ul className="ml-4 mt-1 space-y-0.5 text-slate-500">
                                                <li>IP: <span className="text-green-400 font-mono">127.0.0.1</span></li>
                                                <li>Port: <span className="text-green-400 font-mono">4444</span></li>
                                            </ul>
                                        </li>
                                        <li>
                                            <span className="text-slate-300 font-medium">OutSim</span> — Enable and set:
                                            <ul className="ml-4 mt-1 space-y-0.5 text-slate-500">
                                                <li>IP: <span className="text-green-400 font-mono">127.0.0.1</span></li>
                                                <li>Port: <span className="text-green-400 font-mono">4442</span></li>
                                            </ul>
                                        </li>
                                    </ol>
                                    <p className="text-slate-500">Both must be active to receive G-forces, track position, and steering data alongside the instrument cluster readings.</p>
                                </div>
                            </details>
                        </div>

                        {/* Assetto Corsa */}
                        <div className="pt-4 border-t border-slate-800">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Assetto Corsa Shared Memory</label>
                                <div className="flex items-center justify-between bg-slate-950 border border-slate-700 rounded-lg px-4 py-2">
                                    <span className="text-sm">Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${game.assettoCorsaEnabled ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                        <span className="text-sm text-slate-400">{game.assettoCorsaEnabled ? 'Enabled' : 'Not yet implemented'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Application Settings Section */}
                <section className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h2 className="text-xl font-semibold mb-4 text-purple-400">Application Preferences</h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Units</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700">
                                    <button
                                        onClick={() => updateAppSettings({ unitSystem: 'metric' })}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${app.unitSystem === 'metric' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Metric (km/h)
                                    </button>
                                    <button
                                        onClick={() => updateAppSettings({ unitSystem: 'imperial' })}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${app.unitSystem === 'imperial' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Imperial (mph)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Theme</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700">
                                    <button
                                        onClick={() => updateAppSettings({ theme: 'dark' })}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${app.theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Dark
                                    </button>
                                    <button
                                        onClick={() => updateAppSettings({ theme: 'light' })}
                                        // Force dark mode for now as light mode isn't implemented fully
                                        className={`px-4 py-1.5 rounded-md text-sm transition-colors opacity-50 cursor-not-allowed ${app.theme === 'light' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                                        disabled
                                        title="Light mode coming soon"
                                    >
                                        Light
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
