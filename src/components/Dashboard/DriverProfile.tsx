import React, { useState } from 'react';
import { User, Flag, Shield, Car } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

const EditableField = ({
    label,
    value,
    onChange,
    icon: Icon
}: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    icon: any
}) => {
    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                <Icon size={16} />
            </div>
            <div className="flex-grow">
                <div className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                    {label}
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-slate-200 font-semibold focus:ring-0 focus:outline-none placeholder-slate-600"
                    placeholder={`Set ${label}`}
                />
            </div>
        </div>
    );
};

const DriverProfile = () => {
    const { driver, updateDriverSettings } = useSettingsStore();

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 h-full">
            <h2 className="text-lg font-semibold mb-6 text-slate-300 flex items-center gap-2">
                <User size={20} className="text-blue-500" />
                <span>Driver Profile</span>
            </h2>

            <div className="flex flex-col gap-4">
                <div className="flex justify-center mb-4">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-blue-500/30 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                        <User size={48} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-white">EDIT</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <EditableField
                        label="Name"
                        value={driver.name}
                        onChange={(v) => updateDriverSettings({ name: v })}
                        icon={User}
                    />
                    <EditableField
                        label="Team"
                        value={driver.team}
                        onChange={(v) => updateDriverSettings({ team: v })}
                        icon={Shield}
                    />
                    <EditableField
                        label="Car Model"
                        value={driver.carModel}
                        onChange={(v) => updateDriverSettings({ carModel: v })}
                        icon={Car}
                    />
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                        <div className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                            <Flag size={16} />
                        </div>
                        <div className="flex-grow">
                            <div className="text-xs font-medium text-slate-500 uppercase">Car Number</div>
                            <input
                                type="text"
                                value={driver.carNumber}
                                onChange={(e) => updateDriverSettings({ carNumber: e.target.value })}
                                className="w-full bg-transparent border-none p-0 text-3xl font-bold font-mono text-white focus:ring-0 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverProfile;
