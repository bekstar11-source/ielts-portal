import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, getDoc, doc, query, where, limit, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft,
  Eye,
  CaretLeft,
  CaretRight,
  CaretDown,
  WarningCircle as AlertIcon,
  MagnifyingGlass as SearchIcon,
  Clock as ClockIcon,
  CalendarBlank as CalendarIcon,
  Users as UsersIcon,
  GraduationCap as GradIcon,
  FileText as FileIcon,
  ArrowCounterClockwise,
  FolderOpen as FolderIcon
} from "@phosphor-icons/react";

export default function TeacherAllResults() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // FILTERS STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [groups, setGroups] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Load more limit states
  const [resultsLimit, setResultsLimit] = useState(100);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assignedGroupIds = userData?.assignedGroupIds || [];
        if (assignedGroupIds.length === 0) {
          setLoading(false);
          return;
        }

        const uniqueStudentIds = new Set();
        const fetchedGroups = [];
        for (const groupId of assignedGroupIds) {
          const groupDoc = await getDoc(doc(db, "groups", groupId));
          if (groupDoc.exists()) {
            const groupData = { id: groupDoc.id, ...groupDoc.data() };
            fetchedGroups.push(groupData);
            if (groupData.studentIds && Array.isArray(groupData.studentIds)) {
              groupData.studentIds.forEach(id => uniqueStudentIds.add(id));
            }
          }
        }
        setGroups(fetchedGroups);

        const studentIdsArray = Array.from(uniqueStudentIds);
        if (studentIdsArray.length === 0) {
          setLoading(false);
          return;
        }

        // Build mapping: studentId -> array of group names
        const studentToGroupsMap = {};
        fetchedGroups.forEach(group => {
          if (group.studentIds && Array.isArray(group.studentIds)) {
            group.studentIds.forEach(studentId => {
              if (!studentToGroupsMap[studentId]) {
                studentToGroupsMap[studentId] = [];
              }
              studentToGroupsMap[studentId].push(group.name || "Nomsiz guruh");
            });
          }
        });

        const chunks = [];
        for (let i = 0; i < studentIdsArray.length; i += 10) {
          chunks.push(studentIdsArray.slice(i, i + 10));
        }

        let allDocsData = [];
        let foundMore = false;
        for (const chunk of chunks) {
          if (chunk.length === 0) continue;
          const q = query(
            collection(db, "results"),
            where("userId", "in", chunk),
            orderBy("date", "desc"),
            limit(resultsLimit)
          );
          const querySnapshot = await getDocs(q);
          if (querySnapshot.size >= resultsLimit) {
            foundMore = true;
          }
          querySnapshot.forEach(docSnap => {
            allDocsData.push({ id: docSnap.id, ...docSnap.data() });
          });
        }
        setHasMore(foundMore);

        // Client-side sort by date descending
        allDocsData.sort((a, b) => {
          const dateA = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : new Date(0);
          const dateB = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : new Date(0);
          return dateB - dateA;
        });

        const data = allDocsData.map((d) => {
          // Duration calculation
          let durationStr = "-";
          let timeSpentSeconds = 0;
          if (d.timeSpent) {
            timeSpentSeconds = d.timeSpent;
            const mins = Math.floor(d.timeSpent / 60);
            const secs = d.timeSpent % 60;
            durationStr = `${mins} daq ${secs} sek`;
          } else if (d.duration) {
            timeSpentSeconds = d.duration * 60;
            durationStr = `${d.duration} daq`;
          } else if (d.startedAt && d.date) {
            const start = d.startedAt.toDate ? d.startedAt.toDate() : new Date(d.startedAt);
            const end = d.date.toDate ? d.date.toDate() : new Date(d.date);
            const diffMs = end - start;
            timeSpentSeconds = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(timeSpentSeconds / 60);
            durationStr = `${diffMins} daq`;
          }
          
          // A part test is when:
          // 1. d.partNumber exists, OR
          // 2. test title explicitly mentions "part" / "passage" / "section" (indicating a practice part test, which is < 40 mins)
          const isPartTest = d.partNumber != null || 
                             (d.testTitle && (
                               d.testTitle.toLowerCase().includes("part") || 
                               d.testTitle.toLowerCase().includes("passage") || 
                               d.testTitle.toLowerCase().includes("section")
                             ));

          const isFast = !isPartTest && (d.status === 'graded' || d.status === 'published') && timeSpentSeconds > 0 && timeSpentSeconds < 600 && d.type !== 'speaking';
          const hasViolation = !!d.violation || isFast;
          let violationText = null;
          if (d.violation === 'tab_closed') violationText = 'Tab yopilgan (erta yakunlangan)';
          else if (isFast) violationText = 'Tez bajarilgan (< 10 daq)';
          else if (d.violation) violationText = d.violation;

          return {
            id: d.id,
            ...d,
            userName: d.userName || "Noma'lum",
            studentGroups: studentToGroupsMap[d.userId] || [],
            testTitle: d.testTitle || "Nomsiz Test",
            type: d.type || "other",
            score: d.score !== undefined ? d.score : "-",
            status: d.status || "pending",
            date: d.date ? (d.date.toDate ? d.date.toDate() : new Date(d.date)) : null,
            durationDisplay: durationStr,
            hasViolation,
            violationText
          };
        });

        setResults(data);
        setFilteredResults(data);
        console.log("TeacherAllResults: Fetched " + allDocsData.length + " results for " + studentIdsArray.length + " students.");
      } catch (error) {
        console.error("Error fetching results in TeacherAllResults:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userData) {
      fetchData();
    }
  }, [userData, resultsLimit]);

  // FILTER LOGIC
  useEffect(() => {
    let temp = [...results];

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      temp = temp.filter((item) => {
        const name = (item.userName || "").toString().toLowerCase();
        const title = (item.testTitle || "").toString().toLowerCase();
        return name.includes(lowerTerm) || title.includes(lowerTerm);
      });
    }

    if (typeFilter !== "all") {
      temp = temp.filter((item) => item.type === typeFilter);
    }

    if (statusFilter !== "all") {
      if (statusFilter === 'graded') {
        temp = temp.filter((item) => item.status === 'graded' || item.status === 'published');
      } else {
        temp = temp.filter((item) => item.status !== 'graded' && item.status !== 'published');
      }
    }

    if (groupFilter !== "all") {
      const targetGroup = groups.find(g => g.id === groupFilter);
      const studentIdsInGroup = targetGroup?.studentIds || [];
      temp = temp.filter((item) => studentIdsInGroup.includes(item.userId));
    }

    setFilteredResults(temp);
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, groupFilter, results, groups]);

  const formatDateTime = (dateObj) => {
    if (!dateObj) return { date: "-", time: "" };
    const d = new Date(dateObj);
    const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d).replace(/\//g, '.');
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d);
    return { date, time };
  };

  // PAGINATION LOGIC
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  const renderPaginationButtons = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
    }

    if (currentPage > delta + 2) range.unshift("...");
    range.unshift(1);
    if (currentPage < totalPages - (delta + 1)) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return range.map((page, index) => 
        page === "..." ? (
            <span key={`dots-${index}`} className={`px-2 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>...</span>
        ) : (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${currentPage === page
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : isDark ? "bg-[#2C2C2C] border border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-355"
                }`}
            >
              {page}
            </button>
        )
    );
  };

  // Computed stats from filteredResults
  const totalCount = filteredResults.length;
  const pendingCount = filteredResults.filter(
    (r) => (r.status === "pending" || r.status === "pending_review") && (r.type === "writing" || r.type === "mock_full")
  ).length;
  const violationsCount = filteredResults.filter((r) => r.hasViolation).length;

  const bandScores = filteredResults
    .map((r) => {
      const val = r.bandScore || r.score;
      if (!val || val === "-") return null;
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0 && num <= 9) return num;
      return null;
    })
    .filter((v) => v !== null);
  const avgBand = bandScores.length > 0
    ? (bandScores.reduce((sum, val) => sum + val, 0) / bandScores.length).toFixed(1)
    : "-";

  const statsList = [
    {
      label: "Jami Yechilgan",
      value: totalCount,
      icon: FileIcon,
      color: isDark ? "text-indigo-400" : "text-indigo-650",
      bg: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
      iconBg: isDark ? "bg-indigo-500/20" : "bg-indigo-50",
    },
    {
      label: "Tekshirish Kutilmoqda",
      value: pendingCount,
      icon: ClockIcon,
      color: isDark ? "text-amber-400" : "text-amber-650",
      bg: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.05)",
      iconBg: isDark ? "bg-amber-500/20" : "bg-amber-50",
    },
    {
      label: "O'rtacha Band",
      value: avgBand,
      icon: GradIcon,
      color: isDark ? "text-emerald-400" : "text-emerald-650",
      bg: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)",
      iconBg: isDark ? "bg-emerald-500/20" : "bg-emerald-50",
    },
    {
      label: "Qoidabuzarliklar",
      value: violationsCount,
      icon: AlertIcon,
      color: isDark ? "text-rose-400" : "text-rose-650",
      bg: isDark ? "rgba(244,63,94,0.08)" : "rgba(244,63,94,0.05)",
      iconBg: isDark ? "bg-rose-500/20" : "bg-rose-50",
    },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-t-transparent ${isDark ? 'border-white' : 'border-gray-900'}`}></div>
    </div>
  );

  return (
    <div className={`py-6 font-sans ${isDark ? 'text-white' : 'text-slate-800'}`}>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 px-4">
        {/* Back navigation */}
        <div className="mb-2">
          <button
            onClick={() => navigate('/teacher')}
            className={`flex items-center gap-2 transition-colors font-semibold text-sm group ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all ${isDark ? 'bg-white/5 border-white/10 group-hover:border-white/20' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
              <ArrowLeft className="w-4 h-4" />
            </div>
            Bosh sahifa
          </button>
        </div>

        {/* Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              O'quvchilar Natijalari
            </h1>
            <p className={`text-sm mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Guruhlaringizdagi o'quvchilar tomonidan topshirilgan testlar va yechimlar tahlili.
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-2xl text-xs font-bold border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
            Jami {filteredResults.length} ta yechim
          </div>
        </div>

        {/* Dynamic Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          {statsList.map((stat, idx) => (
            <div
              key={idx}
              className={`rounded-3xl border p-5 flex items-center gap-4 transition-all duration-300 ${isDark ? 'bg-[#2C2C2C]/50 border-white/5 hover:border-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.iconBg} ${stat.color} flex-shrink-0`}>
                <stat.icon size={24} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stat.value}
                </p>
                <p className={`text-[12px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Section */}
        <div 
          className="rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{
            background: isDark ? 'rgba(44, 44, 44, 0.4)' : 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-initial min-w-[200px] group">
              <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-600'}`} />
              <input
                type="text"
                placeholder="Ism yoki test nomi..."
                className={`w-full pl-11 pr-4 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-white focus:border-blue-500/50 placeholder:text-gray-600 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600/50 placeholder:text-gray-400 focus:bg-white'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Group Filter */}
            <div className="relative flex-1 md:flex-initial min-w-[160px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <UsersIcon className={`w-4.5 h-4.5 ${isDark ? 'text-gray-550' : 'text-gray-400'}`} />
              </div>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none appearance-none cursor-pointer ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-gray-300 focus:border-blue-500/50 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600/50 focus:bg-white'}`}
              >
                <option value="all">Barcha Guruhlar</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Test Type Filter */}
            <div className="relative flex-1 md:flex-initial min-w-[150px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <FileIcon className={`w-4.5 h-4.5 ${isDark ? 'text-gray-550' : 'text-gray-400'}`} />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none appearance-none cursor-pointer ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-gray-300 focus:border-blue-500/50 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600/50 focus:bg-white'}`}
              >
                <option value="all">Barcha Turlar</option>
                <option value="reading">Reading</option>
                <option value="listening">Listening</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
                <option value="mock_full">Mock Exam</option>
              </select>
              <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative flex-1 md:flex-initial min-w-[150px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <GradIcon className={`w-4.5 h-4.5 ${isDark ? 'text-gray-550' : 'text-gray-400'}`} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none appearance-none cursor-pointer ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-gray-300 focus:border-blue-500/50 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600/50 focus:bg-white'}`}
              >
                <option value="all">Barcha Statuslar</option>
                <option value="pending">Kutilmoqda</option>
                <option value="graded">Baholangan</option>
              </select>
              <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {(typeFilter !== 'all' || statusFilter !== 'all' || groupFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setGroupFilter('all');
                setSearchTerm('');
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all border ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'}`}
            >
              <ArrowCounterClockwise className="w-3.5 h-3.5" />
              Tozalash
            </button>
          )}
        </div>

        {/* Table Card */}
        <div 
          className="rounded-[2rem] shadow-sm overflow-hidden" 
          style={{
            background: isDark ? 'rgba(44,44,44,0.7)' : 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.7)',
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50/50'}`}>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider w-32 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Sana</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>O'quvchi</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Test Nomi</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Sarf Vaqti</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Natija</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Status / Qoida</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Amal</th>
                </tr>
              </thead>

              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={`p-16 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="flex flex-col items-center gap-2">
                        <FolderIcon className="w-10 h-10 opacity-30 text-gray-400" />
                        <span className="font-semibold">Hech qanday natija topilmadi</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((res) => {
                    const { date, time } = formatDateTime(res.date);

                    return (
                      <tr
                        key={res.id}
                        className={`group transition-colors duration-150 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'}`}
                      >
                        {/* 1. Date */}
                        <td className="py-4 px-5 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className={`w-4.5 h-4.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <div className="flex flex-col leading-tight">
                              <span className={`text-[13px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{date}</span>
                              <span className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-450'}`}>{time}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Student */}
                        <td className="py-4 px-5 align-middle">
                          <div className="flex flex-col leading-tight">
                            <span className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{res.userName}</span>
                            {/* Group name(s) */}
                            {res.studentGroups && res.studentGroups.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {res.studentGroups.map((gName, idx) => (
                                  <span key={idx} className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                    {gName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className={`text-[11px] font-medium mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Guruhsiz</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Test Title */}
                        <td className="py-4 px-5 align-middle">
                          <div className="flex flex-col gap-1.5">
                            <span className={`text-[13px] font-bold truncate max-w-[220px] ${isDark ? 'text-gray-200' : 'text-gray-700'}`} title={res.testTitle}>
                              {res.testTitle}
                            </span>
                            <span className={`w-fit px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${
                              res.type === 'listening' 
                                ? (isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-100') 
                                : res.type === 'reading' 
                                ? (isDark ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-100') 
                                : res.type === 'writing' 
                                ? (isDark ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100') 
                                : res.type === 'speaking'
                                ? (isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-100')
                                : (isDark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-100')
                            }`}>
                              {res.type === 'mock_full' ? 'Mock Exam' : res.type}
                            </span>
                          </div>
                        </td>

                        {/* 4. Duration */}
                        <td className="py-4 px-5 align-middle text-center">
                          <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-lg ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                            {res.durationDisplay}
                          </span>
                        </td>

                        {/* 5. Score */}
                        <td className="py-4 px-5 align-middle text-center">
                          <span className={`text-[15px] font-black font-mono px-3 py-1 rounded-lg ${
                            res.bandScore || (res.score && res.score !== '-')
                              ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700')
                              : (isDark ? 'text-gray-500' : 'text-gray-300')
                          }`}>
                            {res.bandScore ? res.bandScore : res.score}
                          </span>
                        </td>

                        {/* 6. Status and Violations */}
                        <td className="py-4 px-5 align-middle text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              res.status === 'graded' || res.status === 'published'
                                ? (isDark ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                : (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200')
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                res.status === 'graded' || res.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`} />
                              {res.status === 'graded' || res.status === 'published' ? 'Baholangan' : 'Kutilmoqda'}
                            </span>
                            
                            {res.hasViolation && (
                              <span 
                                title={res.violationText} 
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border cursor-help ${isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-100 text-rose-700 border-rose-200'}`}
                              >
                                <AlertIcon className="w-3 h-3 flex-shrink-0 text-rose-500" />
                                Qoidabuzarlik
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-4 px-5 align-middle">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                if (res.type === 'writing' || res.type === 'mock_full') {
                                  navigate('/teacher/writing-review', { state: { selectedId: res.id } });
                                } else {
                                  navigate(`/review/${res.id}`);
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                (res.status !== 'graded' && res.status !== 'published') && (res.type === 'writing' || res.type === 'mock_full')
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-blue-500/20 active:scale-95'
                                  : (isDark ? 'bg-[#1E1E1E] border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                              }`}
                            >
                              <Eye className="w-4 h-4" />
                              {((res.status === 'pending' || res.status === 'pending_review') && (res.type === 'writing' || res.type === 'mock_full')) ? 'Baholash' : 'Ko\'rish'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className={`flex justify-center p-4 border-t ${isDark ? 'border-white/5' : 'border-[#e5e7eb]/50'}`}>
              <button
                onClick={() => setResultsLimit(prev => prev + 100)}
                className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  isDark 
                    ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
                }`}
              >
                Ko'proq yuklash (+100)
              </button>
            </div>
          )}

          {/* Pagination */}
          <div className={`border-t p-4 flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'border-white/5' : 'border-[#e5e7eb]/50'}`}>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className={`w-9 h-9 flex items-center justify-center border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDark ? 'bg-[#2C2C2C] border-white/5 text-gray-400 hover:bg-white/5' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <CaretLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-1.5">
                {renderPaginationButtons()}
              </div>

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={`w-9 h-9 flex items-center justify-center border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDark ? 'bg-[#2C2C2C] border-white/5 text-gray-400 hover:bg-white/5' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <CaretRight className="w-4 h-4" />
              </button>
            </div>

            <span className={`text-[13px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Jami <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredResults.length}</span> tadan <span className={isDark ? 'text-white' : 'text-gray-900'}>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResults.length)}</span> ko'rsatilmoqda
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
