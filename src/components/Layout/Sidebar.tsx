import { NavLink } from 'react-router-dom';
import { Gauge, Settings, Activity, BarChart2, Timer, Brain } from 'lucide-react';

const Sidebar = () => {
    return (
        <div className="h-screen w-16 bg-slate-900 flex flex-col items-center py-4 border-r border-slate-800">
            <div className="mb-8">
                <Activity className="w-8 h-8 text-blue-500" />
            </div>

            <nav className="flex-1 px-2 py-4 space-y-2">
                <NavLink
                    to="/"
                    className={({ isActive }: { isActive: boolean }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="Dashboard"
                >
                    <Gauge size={24} />
                </NavLink>

                <NavLink
                    to="/analysis"
                    className={({ isActive }: { isActive: boolean }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="Analysis"
                >
                    <BarChart2 size={24} />
                </NavLink>

                <NavLink
                    to="/reaction"
                    className={({ isActive }: { isActive: boolean }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="Reaction Test"
                >
                    <Timer size={24} />
                </NavLink>

                <NavLink
                    to="/ml-analysis"
                    className={({ isActive }: { isActive: boolean }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="ML Analysis"
                >
                    <Brain size={24} />
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }: { isActive: boolean }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="Settings"
                >
                    <Settings size={24} />
                </NavLink>
            </nav>
        </div>
    );
};

export default Sidebar;
