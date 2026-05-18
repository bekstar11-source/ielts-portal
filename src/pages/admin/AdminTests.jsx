import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase";

// Hooks & Components
import { useAdminTests } from "../../hooks/useAdminTests";
import AdminTestsSidebar from "../../components/admin/AdminTests/AdminTestsSidebar";
import AdminTestsToolbar from "../../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../../components/admin/AdminTests/AdminTestsList";
import Pagination from "../../components/common/Pagination";
import { Loader2, Folder, X, Image as ImageIcon, Upload, Trash2, FolderPlus } from "lucide-react";

export default function AdminTests() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("list");
    const [filterType, setFilterType] = useState("All");
    const [filterCollection, setFilterCollection] = useState("All");
    const [selectedTests, setSelectedTests] = useState([]);

    // Collection Modal State
    const [collectionModalOpen, setCollectionModalOpen] = useState(false);
    const [editingCol, setEditingCol] = useState(null); // If null, we are adding. If object, we are editing.
    const [colName, setColName] = useState("");
    const [colThumbnail, setColThumbnail] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSavingCol, setIsSavingCol] = useState(false);

    // Bulk Move State
    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [targetCollectionId, setTargetCollectionId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    const {
        tests, collections, loading, totalTestCount, currentPage,
        handleDelete, bulkAssignToCollection, fetchPage, searchTests, fetchInitial,
        addCollection, updateCollection, deleteCollection, isBackgroundRefreshing
    } = useAdminTests(12); // Using 12 for better grid layout

    // Open/Close Collection handlers
    const handleOpenAddCollection = () => {
        setEditingCol(null);
        setColName("");
        setColThumbnail("");
        setCollectionModalOpen(true);
    };

    const handleOpenEditCollection = (col) => {
        setEditingCol(col);
        setColName(col.name);
        setColThumbnail(col.thumbnail || "");
        setCollectionModalOpen(true);
    };

    const handleSaveCollection = async () => {
        if (!colName.trim()) return;
        setIsSavingCol(true);
        try {
            if (editingCol) {
                const ok = await updateCollection(editingCol.id, colName.trim(), colThumbnail.trim());
                if (!ok) throw new Error("Database update failed");
            } else {
                const ok = await addCollection(colName.trim(), colThumbnail.trim());
                if (!ok) throw new Error("Database insert failed");
            }
            setCollectionModalOpen(false);
            setEditingCol(null);
            setColName("");
            setColThumbnail("");
        } catch (err) {
            alert("To'plamni saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingCol(false);
        }
    };

    const handleDeleteCollection = async () => {
        if (!editingCol) return;
        if (!window.confirm("Haqiqatan ham ushbu to'plamni o'chirmoqchimisiz?")) return;
        setIsSavingCol(true);
        try {
            const ok = await deleteCollection(editingCol.id);
            if (!ok) throw new Error("Database delete failed");
            setCollectionModalOpen(false);
            setEditingCol(null);
            setColName("");
            setColThumbnail("");
            // If the deleted collection was the current filter, reset it
            if (filterCollection === editingCol.id) {
                setFilterCollection("All");
            }
        } catch (err) {
            alert("To'plamni o'chirishda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingCol(false);
        }
    };

    const handleUploadImage = async (file) => {
        if (!file) return;
        setUploadingImage(true);
        try {
            const path = `test_collection_covers/${Date.now()}_${file.name}`;
            const sRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(sRef, file);

            uploadTask.on(
                "state_changed",
                null,
                (err) => { 
                    alert("Rasm yuklashda xatolik: " + err.message); 
                    setUploadingImage(false); 
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setColThumbnail(url);
                    setUploadingImage(false);
                }
            );
        } catch (err) {
            alert("Rasm yuklashda xatolik: " + err.message);
            setUploadingImage(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!targetCollectionId) return;
        setIsAssigning(true);
        try {
            const ok = await bulkAssignToCollection(selectedTests, targetCollectionId);
            if (!ok) throw new Error("Bulk assign failed");
            setSelectedTests([]);
            setBulkAssignModalOpen(false);
        } catch (err) {
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    // Handle Search - debounced, also passes active filters
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 2) {
                searchTests(searchTerm, filterType, filterCollection);
            } else if (searchTerm.trim().length === 0) {
                // If search is cleared, re-fetch with current filters
                fetchInitial(filterType, filterCollection);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, filterType, filterCollection]);

    // Handle Filter change (only when no active search)
    useEffect(() => {
        if (searchTerm.trim().length === 0) {
            fetchInitial(filterType, filterCollection);
        }
    }, [filterType, filterCollection]);

    const filteredTests = useMemo(() => {
        // Now tests are already filtered by server for type and collection
        // But we keep this for search results or if we want extra client filtering
        return tests;
    }, [tests]);

    const totalPages = Math.ceil(totalTestCount / 12);

    const handlePageChange = (page) => {
        fetchPage(page, filterType, filterCollection);
    };

    const handleToggleSelect = (id) => {
        setSelectedTests(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
    };

    return (
        <div className={`h-full w-full flex font-sans transition-colors duration-200 relative overflow-hidden ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
            <AdminTestsSidebar 
                collections={collections}
                filterCollection={filterCollection}
                setFilterCollection={setFilterCollection}
                filterType={filterType}
                setFilterType={setFilterType}
                totalTestCount={totalTestCount}
                onAddCollection={handleOpenAddCollection} 
                onEditCollection={handleOpenEditCollection}
                isDark={isDark}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <AdminTestsToolbar 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    selectedCount={selectedTests.length}
                    onBulkAssign={() => setBulkAssignModalOpen(true)} 
                    onMerge={() => {}} 
                    onCreate={() => navigate("/admin/create-test")}
                    isDark={isDark}
                />

                <main className={`flex-1 flex flex-col min-h-0 transition-colors ${isDark ? 'bg-[#121212]' : 'bg-white'}`}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Scrollable List Area */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                                {isBackgroundRefreshing && (
                                    <div className="absolute top-2 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 backdrop-blur-md animate-pulse">
                                        <Loader2 className="animate-spin" size={10} />
                                        Fonda yangilanmoqda...
                                    </div>
                                )}
                                <AdminTestsList 
                                    tests={filteredTests}
                                    selectedTests={selectedTests}
                                    onToggleSelect={handleToggleSelect}
                                    onDelete={handleDelete}
                                    onEdit={(id) => navigate(`/admin/edit-test/${id}`)}
                                    onView={(id) => navigate(`/test/${id}`)}
                                    isDark={isDark}
                                />
                            </div>

                            {/* Fixed Pagination UI at the bottom */}
                            <div className={`shrink-0 p-4 border-t ${isDark ? 'border-white/5 bg-[#1A1A1A]' : 'border-zinc-100 bg-zinc-50/50'}`}>
                                <Pagination 
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* COLLECTION MODAL (ADD / EDIT) */}
            {collectionModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCollectionModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Folder className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                {editingCol ? "Edit Collection" : "New Collection"}
                            </h2>
                            <button onClick={() => setCollectionModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Collection Name</label>
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    placeholder="Enter collection name..."
                                    value={colName}
                                    onChange={e => setColName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Cover Image (URL or Upload)</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            className={`w-full border p-3 rounded-xl outline-none transition-all text-xs ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                            placeholder="Paste image URL here..."
                                            value={colThumbnail}
                                            onChange={e => setColThumbnail(e.target.value)}
                                        />
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                id="col-upload" 
                                                hidden 
                                                accept="image/*"
                                                onChange={e => handleUploadImage(e.target.files[0])}
                                            />
                                            <label 
                                                htmlFor="col-upload"
                                                className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed rounded-xl text-xs font-bold cursor-pointer transition-all ${isDark ? 'bg-white/5 border-white/15 text-zinc-400 hover:border-blue-500 hover:text-blue-400' : 'bg-white border-zinc-300 text-zinc-500 hover:border-blue-500 hover:text-blue-600'}`}
                                            >
                                                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                {uploadingImage ? "Uploading..." : "Upload from Computer"}
                                            </label>
                                        </div>
                                    </div>
                                    <div className={`w-24 h-24 rounded-xl shrink-0 overflow-hidden shadow-inner border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                                        {colThumbnail ? (
                                            <img src={colThumbnail} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={isDark ? 'text-zinc-600' : 'text-zinc-300'}><ImageIcon size={24} /></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                            {editingCol && (
                                <button 
                                    onClick={handleDeleteCollection} 
                                    className="px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                            <button 
                                onClick={handleSaveCollection} 
                                disabled={isSavingCol || !colName.trim()}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isSavingCol ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                {isSavingCol && <Loader2 size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK ASSIGN TO COLLECTION MODAL */}
            {bulkAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBulkAssignModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <FolderPlus className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                Move {selectedTests.length} tests to Collection
                            </h2>
                            <button onClick={() => setBulkAssignModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Select Collection</label>
                                <select 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    value={targetCollectionId}
                                    onChange={e => setTargetCollectionId(e.target.value)}
                                >
                                    <option value="" disabled>-- Select a Collection --</option>
                                    <option value="None">📦 None (Remove from any Collection)</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>📁 {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                            <button 
                                onClick={() => setBulkAssignModalOpen(false)} 
                                className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleBulkAssign} 
                                disabled={isAssigning || !targetCollectionId}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isAssigning ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                {isAssigning && <Loader2 size={16} className="animate-spin" />}
                                Move Tests
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}