import React, { useState } from 'react';
import { Target, Search, Clock, ChevronRight, CheckCircle2, User, Users } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { db } from '../../../firebase/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CustomDateInput, customDatepickerStyles } from '@/components/admin/AdminUsers/AdminUsersUtils';

const AssignTab = ({ groups, students, allTests, theme }) => {
    const isDark = theme === 'dark';
    const [selectedEntity, setSelectedEntity] = useState(null); // { id, name, type: 'group'|'student' }
    const [selectedTest, setSelectedTest] = useState(null);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000));
    const [searchTerm, setSearchTerm] = useState("");
    const [testSearchTerm, setTestSearchTerm] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    const filteredEntities = [...groups.map(g => ({...g, type: 'group'})), ...students.map(s => ({...s, name: s.fullName, type: 'student'}))]
        .filter(e => (e.name || e.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 10);

    const filteredTests = allTests
        .filter(t => t.title.toLowerCase().includes(testSearchTerm.toLowerCase()))
        .slice(0, 10);

    const handleAssign = async () => {
        if (!selectedEntity || !selectedTest) return;
        setIsAssigning(true);
        try {
            const payload = {
                testId: selectedTest.id,
                testTitle: selectedTest.title,
                testType: selectedTest.type,
                assignedAt: serverTimestamp(),
                dueDate: dueDate,
                status: 'pending'
            };

            if (selectedEntity.type === 'group') {
                payload.groupId = selectedEntity.id;
                payload.groupName = selectedEntity.name;
                await addDoc(collection(db, 'groupAssignments'), payload);
            } else {
                payload.userId = selectedEntity.id;
                payload.userName = selectedEntity.name;
                await addDoc(collection(db, 'userAssignments'), payload);
            }

            alert("Test muvaffaqiyatli topshirildi!");
            setSelectedTest(null);
            setSelectedEntity(null);
        } catch (e) { console.error(e); } finally { setIsAssigning(false); }
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6">
            <style>{customDatepickerStyles}</style>
            
            {/* Left: Selection Panels */}
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                
                {/* 1. Target Selection */}
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                        <h3 className="font-black tracking-tight">Kimga topshirish?</h3>
                    </div>

                    <div className={`flex items-center px-4 py-2 rounded-xl border mb-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <Search size={14} className="mr-2 opacity-30" />
                        <input
                            type="text"
                            placeholder="Guruh yoki o'quvchi..."
                            className="bg-transparent border-none outline-none text-xs w-full font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredEntities.map(e => (
                            <button
                                key={`${e.type}-${e.id}`}
                                onClick={() => setSelectedEntity(e)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${selectedEntity?.id === e.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : (isDark ? 'bg-white/5 border-white/5 hover:border-white/20' : 'bg-white border-gray-100 hover:border-blue-200')}`}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    {e.type === 'group' ? <Users size={14} className="opacity-50 shrink-0" /> : <User size={14} className="opacity-50 shrink-0" />}
                                    <span className="text-xs font-bold truncate">{e.name || e.fullName}</span>
                                </div>
                                {selectedEntity?.id === e.id && <CheckCircle2 size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Test Selection */}
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <Target size={16} />
                        </div>
                        <h3 className="font-black tracking-tight">Qaysi testni?</h3>
                    </div>

                    <div className={`flex items-center px-4 py-2 rounded-xl border mb-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <Search size={14} className="mr-2 opacity-30" />
                        <input
                            type="text"
                            placeholder="Test nomi..."
                            className="bg-transparent border-none outline-none text-xs w-full font-medium"
                            value={testSearchTerm}
                            onChange={e => setTestSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredTests.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTest(t)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${selectedTest?.id === t.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : (isDark ? 'bg-white/5 border-white/5 hover:border-white/20' : 'bg-white border-gray-100 hover:border-blue-200')}`}
                            >
                                <span className="text-xs font-bold truncate flex-1 mr-2">{t.title}</span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${selectedTest?.id === t.id ? 'bg-white/20' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                    {t.type}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Summary & Action */}
            <div className="w-full lg:w-80 shrink-0">
                <div className={`p-8 rounded-3xl border sticky top-0 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'}`}>
                    <h3 className="text-xl font-black mb-8 tracking-tight">Assignment</h3>
                    
                    <div className="space-y-6 mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Deadline</p>
                            <DatePicker
                                selected={dueDate}
                                onChange={date => setDueDate(date)}
                                customInput={<CustomDateInput theme={theme} />}
                                showTimeSelect
                                dateFormat="MMMM d, yyyy HH:mm"
                            />
                        </div>

                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-tighter opacity-40">Target</p>
                                    <p className="text-sm font-bold truncate">{selectedEntity ? (selectedEntity.name || selectedEntity.fullName) : "---"}</p>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-tighter opacity-40">Test</p>
                                    <p className="text-sm font-bold truncate">{selectedTest ? selectedTest.title : "---"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAssign}
                        disabled={!selectedEntity || !selectedTest || isAssigning}
                        className={`w-full h-14 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-2xl ${(!selectedEntity || !selectedTest) ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-95'}`}
                    >
                        {isAssigning ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
                        Assign Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignTab;
