import React from 'react';
import { Icons } from '../../Icons';
import { formatDateTime } from '../../../hooks/useAdminResults';

const ResultsTable = ({ 
    items, onDelete, onReview, isDark, navigate 
}) => {
    return (
        <div className={`border rounded-lg shadow-sm overflow-hidden transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                    <thead>
                        <tr className={`border-b transition-colors ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50/50'}`}>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600">Sana</th>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600">O'quvchi</th>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600">Test Nomi</th>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 text-center">Vaqt</th>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 text-center">Baho</th>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 text-center">Status</th>
                            <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 text-center">Amal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.length === 0 ? (
                            <tr><td colSpan="7" className="p-10 text-center text-sm text-gray-500">Ma'lumot topilmadi</td></tr>
                        ) : (
                            items.map((res) => {
                                const { date, time } = formatDateTime(res.date);
                                return (
                                    <tr key={res.id} className={`group transition-colors ${res.isOrphan ? (isDark ? 'bg-red-500/10' : 'bg-red-50/40') : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}>
                                        <td className="py-3 px-4 whitespace-nowrap align-middle">
                                            <div className="flex flex-col leading-tight">
                                                <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{date}</span>
                                                <span className="text-[11px] text-gray-500 mt-0.5">{time}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-middle">
                                            <div className="flex flex-col leading-tight">
                                                <span className={`text-[14px] font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{res.userName}</span>
                                                <span className="text-[11px] text-gray-500 font-mono mt-0.5">ID: {res.id.slice(0, 6)}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[13px] font-medium truncate max-w-[220px] ${res.isOrphan ? 'text-red-500 line-through' : isDark ? 'text-gray-200' : 'text-gray-700'}`}>{res.testTitle}</span>
                                                <span className="w-fit px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border">{res.type}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-middle text-center">
                                            <span className="text-[12px] font-medium px-2 py-1 rounded bg-gray-100 dark:bg-white/5">{res.durationDisplay}</span>
                                        </td>
                                        <td className="py-3 px-4 align-middle text-center font-bold font-mono">{res.bandScore || res.score}</td>
                                        <td className="py-3 px-4 align-middle text-center">
                                            <span className={`px-2 py-1 rounded-[4px] text-[11px] font-semibold border ${res.status === 'graded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{res.status}</span>
                                        </td>
                                        <td className="py-3 px-4 align-middle">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => onDelete(res.id, e)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"><Icons.Trash className="w-4 h-4" /></button>
                                                <button onClick={() => onReview(res)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"><Icons.Eye className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResultsTable;
