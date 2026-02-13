import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Activity, FileText } from 'lucide-react';

const Sidebar = () => {
    return (
        <div className="h-screen w-16 bg-slate-900 flex flex-col items-center py-4 border-r border-slate-800">
            <div className="mb-8">
                <Activity className="w-8 h-8 text-blue-500" />
            </div>

            <nav className="flex-1 flex flex-col gap-4 w-full">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="Dashboard"
                >
                    <LayoutDashboard size={24} />
                </NavLink>

                <NavLink
                    to="/analysis"
                    className={({ isActive }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
                    }
                    title="Analysis"
                >
                    <FileText size={24} />
                </NavLink>

                <div className="flex-1"></div>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `p-3 mx-2 rounded-xl transition-all duration-200 hover:bg-slate-800 flex justify-center mb-4 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`
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
