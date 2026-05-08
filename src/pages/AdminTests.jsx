import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

// Hooks & Components
import { useAdminTests } from "../hooks/useAdminTests";
import AdminTestsSidebar from "../components/admin/AdminTests/AdminTestsSidebar";
import AdminTestsToolbar from "../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../components/admin/AdminTests/AdminTestsList";
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
        tests, collections, loading, totalTestCount,
        handleDelete, bulkAssignToCollection
    } = useAdminTests();

    const filteredTests = useMemo(() => {
        return tests.filter(t => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = t.title?.toLowerCase().includes(searchLower) || 
                                 (t.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
            const matchesType = filterType === "All" || t.type?.toLowerCase() === filterType.toLowerCase();
            const matchesCollection = filterCollection === "All" || t.collectionId === filterCollection;
            return matchesSearch && matchesType && matchesCollection;
        });
    }, [tests, searchTerm, filterType, filterCollection]);

    const handleToggleSelect = (id) => {
        setSelectedTests(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#121212]">
            <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
    );

    return (
        <div className={`h-screen flex font-sans transition-colors duration-200 overflow-hidden relative ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
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

                <main className={`flex-1 overflow-y-auto p-6 transition-colors ${isDark ? 'bg-[#121212]' : 'bg-white'}`}>
                    <AdminTestsList 
                        tests={filteredTests}
                        selectedTests={selectedTests}
                        onToggleSelect={handleToggleSelect}
                        onDelete={handleDelete}
                        onEdit={(id) => navigate(`/admin/edit-test/${id}`)}
                        onView={(id) => navigate(`/test/${id}`)}
                        isDark={isDark}
                    />
                </main>
            </div>
        </div>
    );
}