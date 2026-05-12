import React from 'react';
import { Activity, Target, Users, CheckCircle } from 'lucide-react';
import { KPICard } from './KPICard';

export const KPISection = ({ stats, isDark }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Total Tests" value={stats.totalTests} icon={Activity} color="blue" isDark={isDark} />
        <KPICard title="Avg. Score" value={stats.avgScore} icon={Target} color="purple" isDark={isDark} />
        <KPICard title="Active Students" value={stats.activeStudents} icon={Users} color="orange" isDark={isDark} />
        <KPICard title="Completion Rate" value={`${stats.completionRate}%`} icon={CheckCircle} color="green" isDark={isDark} />
    </div>
);
