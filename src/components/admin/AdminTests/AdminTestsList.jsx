import React from 'react';
import { MoreHorizontal, Edit2, Trash2, Globe, Lock, BookOpen, Headphones, PenTool, Mic2, Eye } from 'lucide-react';

const AdminTestsList = ({ 
    tests, selectedTests, onToggleSelect, onDelete, onEdit, onView, isDark 
}) => {
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <th className="py-4 pl-4 w-12 text-center">
                            <input type="checkbox" className="accent-blue-600" />
                        </th>
                        <th className="py-4 pl-4">Test Title</th>
                        <th className="py-4 px-4">Type</th>
                        <th className="py-4 px-4">Questions</th>
                        <th className="py-4 px-4">Created At</th>
                        <th className="py-4 pr-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                    {tests.map(test => (
                        <tr key={test.id} className={`group hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors ${selectedTests.includes(test.id) ? (isDark ? 'bg-blue-500/5' : 'bg-blue-50/50') : ''}`}>
                            <td className="py-4 pl-4 text-center">
                                <input 
                                    type="checkbox" 
                                    className="accent-blue-600"
                                    checked={selectedTests.includes(test.id)}
                                    onChange={() => onToggleSelect(test.id)}
                                />
                            </td>
                            <td className="py-4 pl-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                        {test.type === 'reading' ? <BookOpen size={16} /> : 
                                         test.type === 'listening' ? <Headphones size={16} /> : 
                                         test.type === 'writing' ? <PenTool size={16} /> : <Mic2 size={16} />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold truncate max-w-[300px]">{test.title || "Untitled Test"}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(test.tags || []).map((tag, i) => (
                                                <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {test.isPublic ? <Globe size={10} className="text-emerald-500" /> : <Lock size={10} className="text-zinc-400" />}
                                            <span className="text-[10px] text-zinc-400">ID: {test.id.slice(0, 8)}...</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${isDark ? 'bg-white/5 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                                    {test.type}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-zinc-400">
                                {test.questions?.length || 0} groups
                            </td>
                            <td className="py-4 px-4 text-[11px] text-zinc-400">
                                {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-4 pr-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onView(test.id)} className="p-2 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 rounded-lg transition-colors"><Eye size={14} /></button>
                                    <button onClick={() => onEdit(test.id)} className="p-2 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => onDelete(test.id, test.title)} className="p-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTestsList;
