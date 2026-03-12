
import { Map, Cloud, Flag, Clock } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

const SessionInfo = () => {
    const { session, updateSessionSettings } = useSettingsStore();

    return (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <Flag size={20} className="text-yellow-500" />
                <span>Session Info</span>
            </h2>

            <div className="space-y-4">
                {/* Track */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                        <Map size={12} /> Track
                    </label>
                    <input
                        type="text"
                        value={session.trackName}
                        onChange={(e) => updateSessionSettings({ trackName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Session Type */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                        <Clock size={12} /> Type
                    </label>
                    <select
                        value={session.sessionType}
                        onChange={(e) => updateSessionSettings({ sessionType: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 appearance-none"
                    >
                        <option value="Practice">Practice</option>
                        <option value="Qualifying">Qualifying</option>
                        <option value="Race">Race</option>
                    </select>
                </div>

                {/* Weather */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                        <Cloud size={12} /> Weather
                    </label>
                    <select
                        value={session.weather}
                        onChange={(e) => updateSessionSettings({ weather: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 appearance-none"
                    >
                        <option value="Sunny">Sunny</option>
                        <option value="Cloudy">Cloudy</option>
                        <option value="Rain">Rain</option>
                        <option value="Night">Night</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default SessionInfo;
