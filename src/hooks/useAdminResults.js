// src/pages/AdminResults.jsx
import { useNavigate } from "react-router-dom";
import { Icons } from "../components/Icons";
import { useAdminResults, formatDateTime } from "../hooks/useAdminResults"; // Hookni ulaymiz

export default function AdminResults() {
  const navigate = useNavigate();
  
  // Bor-yo'g'i bitta qator bilan butun mantiqni chaqirib olamiz!
  const {
    loading,
    filteredResults,
    currentItems,
    searchTerm, setSearchTerm,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    currentPage, setCurrentPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    handleDelete
  } = useAdminResults();

  // Pagination Render (UI qismi shu yerda qolgani ma'qul)
  const renderPaginationButtons = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
            currentPage === i
              ? "bg-blue-600 text-white shadow-md shadow-blue-200"
              : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* NAVIGATSIYA */}
        <div className="mb-4">
            <button 
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm group"
            >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm group-hover:border-gray-300 transition-all">
                    <Icons.ArrowLeft className="w-4 h-4" />
                </div>
                Bosh sahifa
            </button>
        </div>

        {/* HEADER & FILTERS */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                {/* Search */}
                <div className="relative w-full md:w-64 group">
                    <Icons.Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" placeholder="Qidirish..." 
                        className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm placeholder:text-gray-400"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Type Filter */}
                <div className="relative w-full sm:w-40">
                    <div className="absolute left-3 top-2.5 pointer-events-none"><Icons.Type className="w-4 h-4 text-gray-400" /></div>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-white border border-gray-200 pl-9 pr-8 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm appearance-none cursor-pointer text-gray-600 font-medium">
                        <option value="all">Barcha Turlar</option>
                        <option value="reading">Reading</option>
                        <option value="listening">Listening</option>
                        <option value="writing">Writing</option>
                        <option value="speaking">Speaking</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-3 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
                {/* Status Filter */}
                <div className="relative w-full sm:w-44">
                    <div className="absolute left-3 top-2.5 pointer-events-none"><Icons.Status className="w-4 h-4 text-gray-400" /></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-white border border-gray-200 pl-9 pr-8 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm appearance-none cursor-pointer text-gray-600 font-medium">
                        <option value="all">Barcha Statuslar</option>
                        <option value="pending">Kutilmoqda</option>
                        <option value="graded">Baholangan</option>
                        <option value="orphan">Arxiv (O'chirilgan)</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-3 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
                {/* Clear Button */}
                {(typeFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                    <button onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearchTerm(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 underline decoration-red-200 underline-offset-2">Tozalash</button>
                )}
            </div>
            <div className="flex flex-col items-end">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight font-sans">Natijalar</h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Jami {filteredResults.length} ta yechim</p>
            </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide w-32">Sana</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide">O'quvchi</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide">Test Nomi</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Vaqt</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Baho</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Status</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.length === 0 ? (
                    <tr><td colSpan="7" className="p-10 text-center text-sm text-gray-500">Ma'lumot topilmadi</td></tr>
                ) : (
                    currentItems.map((res) => {
                      const { date, time } = formatDateTime(res.date);
                      return (
                        <tr key={res.id} className={`group transition-colors duration-150 hover:bg-gray-50 ${res.isOrphan ? 'bg-red-50/40' : ''}`}>
                            <td className="py-3 px-4 whitespace-nowrap align-middle">
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[13px] font-medium text-gray-700">{date}</span>
                                    <span className="text-[11px] text-gray-400 mt-0.5">{time}</span>
                                </div>
                            </td>
                            <td className="py-3 px-4 align-middle">
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[14px] font-medium text-gray-900">{res.userName}</span>
                                    <span className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {res.id.slice(0,6)}</span>
                                </div>
                            </td>
                            <td className="py-3 px-4 align-middle">
                                <div className="flex flex-col gap-1">
                                    <span className={`text-[13px] font-medium truncate max-w-[220px] ${res.isOrphan ? 'text-red-600 line-through decoration-red-400' : 'text-gray-700'}`}>{res.testTitle}</span>
                                    <span className={`w-fit px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${res.type === 'listening' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : res.type === 'reading' ? 'bg-sky-50 text-sky-700 border-sky-100' : res.type === 'writing' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{res.type}</span>
                                </div>
                            </td>
                            <td className="py-3 px-4 align-middle text-center">
                                <span className="text-[12px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{res.durationDisplay}</span>
                            </td>
                            <td className="py-3 px-4 align-middle text-center">
                                <span className={`text-[14px] font-bold font-mono ${res.bandScore || (res.score && res.score !== '-') ? 'text-gray-800' : 'text-gray-300'}`}>{res.bandScore ? res.bandScore : res.score}</span>
                            </td>
                            <td className="py-3 px-4 align-middle text-center">
                                {res.isOrphan ? <span className="inline-flex px-2 py-1 rounded-[4px] text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">Arxiv</span> : <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[11px] font-semibold border ${res.status === 'graded' || res.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{res.status === 'graded' || res.status === 'published' ? 'Baholangan' : 'Kutilmoqda'}</span>}
                            </td>
                            <td className="py-3 px-4 align-middle">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button onClick={() => handleDelete(res.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="O'chirish"><Icons.Trash className="w-4 h-4" /></button>
                                    <button onClick={() => navigate(`/review/${res.id}`)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wide transition-all ${!res.isOrphan && res.status !== 'graded' && res.status !== 'published' && (res.type === 'writing' || res.type === 'speaking') ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}><Icons.Eye className="w-3.5 h-3.5" />{(!res.isOrphan && res.status === 'pending' && (res.type === 'writing' || res.type === 'speaking')) ? 'Baholash' : 'Ko\'rish'}</button>
                                </div>
                            </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white border-t border-gray-200 p-3 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-1">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-all"><Icons.ChevronLeft className="w-4 h-4" /></button>
                <div className="flex gap-1">{renderPaginationButtons()}</div>
                <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-all"><Icons.ChevronRight className="w-4 h-4" /></button>
            </div>
            <span className="text-[13px] font-medium text-gray-500">Jami <span className="text-gray-900 font-bold">{filteredResults.length}</span> tadan <span className="text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResults.length)}</span> ko'rsatilmoqda</span>
          </div>
        </div>
      </div>
    </div>
  );
}