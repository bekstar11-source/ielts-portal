import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

// Hooks & Components
import { useAdminTests } from "../hooks/useAdminTests";
import AdminTestsSidebar from "../components/admin/AdminTests/AdminTestsSidebar";
import AdminTestsToolbar from "../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../components/admin/AdminTests/AdminTestsList";
import Pagination from "../components/common/Pagination";
import { Loader2 } from "lucide-react";

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

    const {
        tests, collections, loading, totalTestCount, currentPage,
        handleDelete, bulkAssignToCollection, fetchPage, searchTests, fetchInitial
    } = useAdminTests(12); // Using 12 for better grid layout

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
        <div className={`h-full flex font-sans transition-colors duration-200 overflow-hidden relative ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
            <AdminTestsSidebar 
                collections={collections}
                filterCollection={filterCollection}
                setFilterCollection={setFilterCollection}
                filterType={filterType}
                setFilterType={setFilterType}
                totalTestCount={totalTestCount}
                onAddCollection={() => {}} 
                onEditCollection={() => {}}
                isDark={isDark}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminTestsToolbar 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    selectedCount={selectedTests.length}
                    onBulkAssign={() => {}} 
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
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
        </div>
    );
}