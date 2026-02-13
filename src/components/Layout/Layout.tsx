import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

import TitleBar from './TitleBar';

const Layout = () => {
    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
            <TitleBar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
