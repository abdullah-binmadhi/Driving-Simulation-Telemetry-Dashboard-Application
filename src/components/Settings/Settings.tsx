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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">BeamNG.drive OutGauge Port</label>
                                <input
                                    type="number"
                                    value={game.beamngPort}
                                    onChange={(e) => updateGameSettings({ beamngPort: parseInt(e.target.value) || 4444 })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <p className="text-xs text-slate-500">Default: 4444. Ensure this matches your BeamNG 'hardware' settings.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Assetto Corsa Shared Memory</label>
                                <div className="flex items-center justify-between bg-slate-950 border border-slate-700 rounded-lg px-4 py-2">
                                    <span>Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${game.assettoCorsaEnabled ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                        <span className="text-sm">{game.assettoCorsaEnabled ? 'Enabled' : 'Disabled'}</span>
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
