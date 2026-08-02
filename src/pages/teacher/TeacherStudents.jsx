import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import {
    Users, Plus, Trash, MagnifyingGlass, UserCircle, CaretDown, CheckCircle, WarningCircle, CaretLeft
} from '@phosphor-icons/react';
import { useStudentSearch } from '../../hooks/useStudentSearch';
import { useTranslation } from '../../context/LanguageContext';
import { canAddStudent, addStudentToGroup, removeStudentFromGroup } from '../../utils/groupMembership';

export default function TeacherStudents() {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const { theme } = useTheme();
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (userData?.uid) {
            fetchGroups();
        }
    }, [userData]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
        } else {
            setStudents([]);
        }
    }, [selectedGroupId]);

    const fetchGroups = async () => {
        try {
            const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
            const snap = await getDocs(q);
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroups(fetched);
            if (fetched.length > 0) {
                setSelectedGroupId(fetched[0].id);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (groupId) => {
        setLoading(true);
        try {
            const group = groups.find(g => g.id === groupId);
            const studentIds = group?.studentIds || [];
            if (studentIds.length === 0) {
                setStudents([]);
                return;
            }

            // Faqat hujjat ID si bo'yicha o'qiymiz. Ilgari bu yerda qo'shimcha
            // `where('uid','in',chunk)` so'rovi ham bor edi — natijasi hech
            // qayerda ishlatilmasdi, ya'ni har yuklashda o'qishlar ikki barobar
            // ko'p sarflanardi.
            const uniqueIds = [...new Set(studentIds)];
            const snaps = await Promise.all(
                uniqueIds.map(id => getDoc(doc(db, 'users', id)))
            );
            setStudents(
                snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }))
            );
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const { combinedStudents: searchResults, isSearchingDb: isSearching } = useStudentSearch([], searchTerm);

    const handleAddStudent = async (student) => {
        if (!selectedGroupId) return;

        // Tarif limiti — ilgari faqat Guruh statistikasi sahifasida
        // tekshirilardi, bu yerdan cheksiz o'quvchi qo'shsa bo'lardi.
        const allowed = canAddStudent(userData, groups);
        if (!allowed.ok) {
            showMessage(allowed.reason, 'error');
            return;
        }

        try {
            await addStudentToGroup(selectedGroupId, student.id);

            // Update local state
            const updatedGroups = groups.map(g => {
                if (g.id === selectedGroupId) {
                    return { ...g, studentIds: [...(g.studentIds || []), student.id] };
                }
                return g;
            });
            setGroups(updatedGroups);
            
            // Re-fetch students or add locally
            if (!students.find(s => s.id === student.id)) {
                setStudents(prev => [...prev, student]);
            }
            
            setSearchTerm('');
            showMessage(t('teacherStudents.studentAdded').replace('{name}', student.fullName || student.email), 'success');
        } catch (error) {
            console.error("Error adding student:", error);
            showMessage(t('teacherStudents.errorOccurred'), 'error');
        }
    };

    const handleRemoveStudent = async (studentId, studentName) => {
        if (!selectedGroupId) return;
        if (!window.confirm(t('teacherStudents.removeConfirm').replace('{name}', studentName))) return;

        try {
            await removeStudentFromGroup(selectedGroupId, studentId);

            // Update local state
            const updatedGroups = groups.map(g => {
                if (g.id === selectedGroupId) {
                    return { ...g, studentIds: (g.studentIds || []).filter(id => id !== studentId) };
                }
                return g;
            });
            setGroups(updatedGroups);
            setStudents(prev => prev.filter(s => s.id !== studentId));

            showMessage(t('teacherStudents.studentRemoved'), 'success');
        } catch (error) {
            console.error("Error removing student:", error);
            showMessage(t('teacherStudents.errorOccurred'), 'error');
        }
    };

    const showMessage = (text, type) => {
        setActionMessage({ text, type });
        setTimeout(() => setActionMessage({ text: '', type: '' }), 3000);
    };

    const selectedGroupData = groups.find(g => g.id === selectedGroupId);

    // Common card styling
    const cardBg = isDark ? 'bg-[#2c2c2e] border-[#3a3a3c]' : 'bg-white border-gray-200';
    const textColor = isDark ? 'text-[#f5f5f7]' : 'text-gray-900';
    const subTextColor = isDark ? 'text-[#86868b]' : 'text-gray-500';

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 font-sans">
            {/* Back Button */}
            <button 
                onClick={() => navigate('/teacher')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all mb-6 ${
                    isDark ? 'bg-[#1c1c1e] text-zinc-300 hover:bg-[#2c2c2e]' : 'bg-white text-zinc-700 hover:bg-zinc-100 shadow-sm border border-zinc-200'
                }`}
            >
                <CaretLeft size={18} weight="bold" />
                {t('teacherStudents.backBtn')}
            </button>

            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Users size={28} weight="fill" />
                    </div>
                    <h1 className={`text-4xl font-bold tracking-tight ${textColor}`}>
                        {t('teacherStudents.title')}
                    </h1>
                </div>
                <p className={`${subTextColor} text-lg max-w-2xl mt-3`}>
                    {t('teacherStudents.description')}
                </p>
            </div>

            {actionMessage.text && (
                <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
                    actionMessage.type === 'success' 
                        ? (isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700')
                        : (isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                }`}>
                    {actionMessage.type === 'success' ? <CheckCircle size={24} weight="fill" /> : <WarningCircle size={24} weight="fill" />}
                    <span className="font-medium">{actionMessage.text}</span>
                </div>
            )}

            {loading && groups.length === 0 ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : groups.length === 0 ? (
                <div className={`text-center py-24 rounded-3xl border border-dashed ${isDark ? 'border-[#3a3a3c] bg-[#222225]' : 'border-gray-300 bg-gray-50'}`}>
                    <Users size={56} weight="duotone" className={`mx-auto mb-4 ${isDark ? 'text-[#86868b]' : 'text-gray-400'}`} />
                    <h3 className={`text-xl font-semibold mb-2 ${textColor}`}>{t('teacherStudents.noGroups')}</h3>
                    <p className={subTextColor}>{t('teacherStudents.noGroupsDesc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Group Selection & Add Student */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Group Selector */}
                        <div className={`p-6 rounded-3xl border shadow-sm ${cardBg} backdrop-blur-xl`}>
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${subTextColor}`}>
                                {t('teacherStudents.selectGroup')}
                            </h3>
                            <div className="relative">
                                <select 
                                    className={`w-full appearance-none rounded-2xl p-4 pr-10 outline-none transition-all border font-medium ${
                                        isDark 
                                            ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white hover:border-blue-500 focus:border-blue-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-blue-500 focus:border-blue-500 focus:bg-white'
                                    }`}
                                    value={selectedGroupId || ''}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                >
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} ({g.studentIds?.length || 0} {t('teacherStudents.studentsCount')})
                                        </option>
                                    ))}
                                </select>
                                <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${subTextColor}`}>
                                    <CaretDown size={20} weight="bold" />
                                </div>
                            </div>
                        </div>

                        {/* Search & Add Student */}
                        <div className={`p-6 rounded-3xl border shadow-sm flex flex-col ${cardBg}`}>
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${subTextColor}`}>
                                {t('teacherStudents.addStudent')}
                            </h3>
                            <div className="relative mb-2">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <MagnifyingGlass size={20} className={subTextColor} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('teacherStudents.searchPlaceholder')}
                                    className={`w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none transition-all border font-medium ${
                                        isDark 
                                            ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-[#86868b]' 
                                            : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white placeholder-gray-400'
                                    }`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Search Results */}
                            {searchTerm.length > 2 && (
                                <div className={`mt-3 rounded-2xl border overflow-hidden flex-1 flex flex-col max-h-80 ${
                                    isDark ? 'border-[#3a3a3c] bg-[#1c1c1e]' : 'border-gray-200 bg-white'
                                }`}>
                                    {isSearching ? (
                                        <div className={`p-6 text-center text-sm font-medium ${subTextColor}`}>
                                            {t('teacherStudents.searching')}
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <ul className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                            {searchResults.map(user => {
                                                const isAlreadyInGroup = selectedGroupData?.studentIds?.includes(user.id);
                                                return (
                                                    <li key={user.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                                                        isDark ? 'hover:bg-[#2c2c2e]' : 'hover:bg-gray-50'
                                                    }`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                                isDark ? 'bg-[#3a3a3c] text-[#86868b]' : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                                {user.photoURL ? (
                                                                    <img src={user.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                                                ) : (
                                                                    <UserCircle size={24} weight="fill" />
                                                                )}
                                                            </div>
                                                            <div className="truncate pr-2">
                                                                <p className={`text-sm font-semibold truncate ${textColor}`}>{user.fullName || t('teacherStudents.unnamed')}</p>
                                                                <p className={`text-xs font-medium truncate ${subTextColor}`}>{user.email}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddStudent(user)}
                                                            disabled={isAlreadyInGroup}
                                                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                                isAlreadyInGroup
                                                                    ? (isDark ? 'bg-[#3a3a3c] text-[#86868b] cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
                                                                    : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-sm'
                                                            }`}
                                                            title={isAlreadyInGroup ? t('teacherStudents.alreadyInGroup') : t('teacherStudents.addBtn')}
                                                        >
                                                            {isAlreadyInGroup ? <CheckCircle size={18} weight="bold" /> : <Plus size={18} weight="bold" />}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className={`p-6 text-center text-sm font-medium ${subTextColor}`}>
                                            {t('teacherStudents.noResults')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Students List */}
                    <div className="lg:col-span-8">
                        <div className={`rounded-3xl border shadow-sm overflow-hidden flex flex-col h-full ${cardBg}`}>
                            <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'border-[#3a3a3c]' : 'border-gray-200'}`}>
                                <div>
                                    <h3 className={`text-xl font-bold ${textColor}`}>
                                        {selectedGroupData?.name}
                                    </h3>
                                    <p className={`text-sm mt-1 font-medium ${subTextColor}`}>{t('teacherStudents.studentsList')}</p>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide ${
                                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 border border-blue-100 text-blue-700'
                                }`}>
                                    {students.length} {t('teacherStudents.studentsCount')}
                                </span>
                            </div>

                            <div className="flex-1 bg-opacity-50">
                                {loading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : students.length === 0 ? (
                                    <div className={`text-center py-32 flex flex-col items-center justify-center h-full ${subTextColor}`}>
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-[#1c1c1e]' : 'bg-gray-50'}`}>
                                            <Users size={32} weight="duotone" />
                                        </div>
                                        <p className="text-lg font-medium text-balance">{t('teacherStudents.emptyGroup')}</p>
                                        <p className="text-sm mt-2 opacity-80">{t('teacherStudents.emptyGroupHint')}</p>
                                    </div>
                                ) : (
                                    <ul className={`divide-y ${isDark ? 'divide-[#3a3a3c]' : 'divide-gray-100'}`}>
                                        {students.map((student, index) => (
                                            <li key={student.id} className={`p-4 sm:px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group`}>
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="font-mono text-xs font-medium text-gray-400 dark:text-gray-500 w-6 text-right shrink-0">
                                                        {index + 1}.
                                                    </div>
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                                        isDark ? 'bg-[#3a3a3c] text-white' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {student.photoURL ? (
                                                            <img src={student.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-lg">
                                                                {(student.fullName || student.email || "?").charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className={`font-bold text-[16px] truncate ${textColor}`}>
                                                            {student.fullName || t('teacherStudents.unnamed')}
                                                        </p>
                                                        <p className={`text-sm font-medium truncate ${subTextColor} mt-0.5`}>
                                                            {student.email} {student.phoneNumber ? ` • ${student.phoneNumber}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleRemoveStudent(student.id, student.fullName || student.email)}
                                                    className={`self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all sm:opacity-0 sm:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 focus:opacity-100 focus:translate-x-0 ${
                                                        isDark 
                                                            ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' 
                                                            : 'text-red-600 bg-red-50 hover:bg-red-100'
                                                    }`}
                                                >
                                                    <Trash size={16} weight="bold" />
                                                    <span className="hidden sm:inline">{t('teacherStudents.removeBtn')}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
