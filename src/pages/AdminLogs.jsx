import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, orderBy, query, limit, where } from "firebase/firestore";
import { useTheme } from '../context/ThemeContext';
import { Search, Filter, Clock, Shield, User, Activity } from 'lucide-react';

export default function AdminLogs() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, [filter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));

            if (filter !== 'ALL') {
                // Note: Firestore requires composite index for 'action' + 'timestamp'
                // For now, we'll fetch recent and filter client-side if index missing, 
                // but efficiently we'd add where('action', '==', filter)
            }

            const snap = await getDocs(q);
            let checkLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (filter !== 'ALL') {
                checkLogs = checkLogs.filter(l => l.action === filter);
            }

            setLogs(checkLogs);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'LOGIN': return 'text-green-500 bg-green-500/10';
            case 'LOGOUT': return 'text-gray-500 bg-gray-500/10';
            case 'USER_EDIT': return 'text-orange-500 bg-orange-500/10';
            case 'TEST_START': return 'text-blue-500 bg-blue-500/10';
            case 'TEST_SUBMIT': return 'text-purple-500 bg-purple-500/10';
            case 'BLOCK_USER': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-400 bg-gray-400/10';
        }
    };

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-[#1E1E1E] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">System Audit Logs</h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Track all system activities</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className={`px-4 py-2 rounded-xl outline-none border ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}
                    >
                        <option value="ALL">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="USER_EDIT">User Edits</option>
                        <option value="TEST_SUBMIT">Test Submissions</option>
                        <option value="BLOCK_USER">Security Actions</option>
                    </select>
                </div>
            </div>

            <div className={`rounded-[24px] border overflow-hidden ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={`border-b ${isDark ? 'border-white/5 bg-[#1E1E1E]' : 'border-gray-100 bg-gray-50'}`}>
                            <tr>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider opacity-60">Timestamp</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider opacity-60">User ID</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider opacity-60">Action</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider opacity-60">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center opacity-50">Loading logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center opacity-50">No logs found</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className={`transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                    <td className="p-4 whitespace-nowrap text-sm font-mono opacity-70">
                                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                                    </td>
                                    <td className="p-4 font-mono text-xs opacity-50">
                                        {log.userId || 'System'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm opacity-80 max-w-md truncate">
                                        {JSON.stringify(log.details)}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
