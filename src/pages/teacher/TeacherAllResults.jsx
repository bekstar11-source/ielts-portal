import { useEffect, useState, useMemo, Fragment } from "react";
import { toDate } from "../../utils/subscription";
import { detectViolation, formatDuration, getLatestAttempt } from "../../utils/teacherResults";
import {
  useTeacherWorkspace, RESULTS_CAP, RESULTS_CAP_WIDE,
} from "../../hooks/useTeacherWorkspace";
import {
  TeacherResultsSkeleton, RefreshBar,
} from "../../components/teacher/TeacherSkeletons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/LanguageContext";
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
  const { t, lang } = useTranslation();
  const isDark = theme === "dark";
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // FILTERS STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // "Ko'proq yuklash" — standart chegara panelning qolgan sahifalari bilan
  // BIR XIL, shuning uchun bu sahifaga o'tishda odatda umuman o'qish bo'lmaydi
  // (kesh ishlaydi). Faqat o'qituvchi ataylab bosgandagina kengroq so'rov
  // yuboriladi.
  const [resultsCap, setResultsCap] = useState(RESULTS_CAP);

  const {
    groups, results: rawResults, resultsTruncated,
    loading, isRefreshing,
  } = useTeacherWorkspace({ uid: userData?.uid, resultsCap });

  const hasMore = resultsTruncated && resultsCap < RESULTS_CAP_WIDE;

  // O'quvchi → guruh nomlari. Ilgari bu fetch ichida qurilardi; endi u
  // guruhlardan kelib chiqadigan sof hosila.
  const studentToGroupsMap = useMemo(() => {
    const map = {};
    groups.forEach(group => {
      (group.studentIds || []).forEach(studentId => {
        (map[studentId] ||= []).push(group.name || (lang === 'uz' ? "Nomsiz guruh" : "Unnamed Group"));
      });
    });
    return map;
  }, [groups, lang]);

  const results = useMemo(() => rawResults.map((d) => {
    const { hasViolation, violationText, timeSpentSeconds } = detectViolation(d);

    // Multiple attempts of the same test are stored in d.attempts[].
    // The row should always reflect the LATEST attempt, with older
    // ones available via the expandable "attempts history" list.
    const attemptsArr = Array.isArray(d.attempts) ? d.attempts : [];
    const latestAttempt = getLatestAttempt(d);
    const latestScoreVal = d.latestBandScore ?? d.latestScore ?? latestAttempt?.bandScore ?? latestAttempt?.score ?? d.bandScore ?? d.score;

    return {
      ...d,
      id: d.id,
      userName: d.userName || (lang === 'uz' ? "Noma'lum" : "Unknown"),
      studentGroups: studentToGroupsMap[d.userId] || [],
      testTitle: d.testTitle || (lang === 'uz' ? "Nomsiz Test" : "Untitled Test"),
      type: d.type || "other",
      score: d.score !== undefined ? d.score : "-",
      status: d.status || "pending",
      date: toDate(d.date),
      durationDisplay: formatDuration(timeSpentSeconds),
      hasViolation,
      violationText,
      attempts: attemptsArr,
      attemptsCount: attemptsArr.length,
      displayScore: (latestScoreVal !== undefined && latestScoreVal !== null && latestScoreVal !== "") ? latestScoreVal : "-"
    };
  }), [rawResults, studentToGroupsMap, lang]);

  // FILTER LOGIC — hosila qiymat, shuning uchun state emas, `useMemo`.
  // Ilgari u alohida state'da saqlanib, har filtr o'zgarganda qo'shimcha
  // render sikli keltirib chiqarardi.
  const filteredResults = useMemo(() => {
    let temp = results;

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
      const studentIdsInGroup = new Set(targetGroup?.studentIds || []);
      temp = temp.filter((item) => studentIdsInGroup.has(item.userId));
    }

    return temp;
  }, [searchTerm, typeFilter, statusFilter, groupFilter, results, groups]);

  // Filtr o'zgarsa birinchi sahifaga qaytamiz.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, groupFilter]);

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
                  : isDark ? "bg-[#2C2C2C] border border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
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
      label: t('teacher.results.totalSolved') || (lang === 'uz' ? "Jami Yechilgan" : "Total Solved"),
      value: totalCount,
      icon: FileIcon,
      color: isDark ? "text-indigo-400" : "text-indigo-600",
      bg: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
      iconBg: isDark ? "bg-indigo-500/20" : "bg-indigo-50",
    },
    {
      label: t('teacher.results.pendingReview') || (lang === 'uz' ? "Tekshirish Kutilmoqda" : "Pending Review"),
      value: pendingCount,
      icon: ClockIcon,
      color: isDark ? "text-amber-400" : "text-amber-600",
      bg: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.05)",
      iconBg: isDark ? "bg-amber-500/20" : "bg-amber-50",
    },
    {
      label: t('teacher.results.avgBand') || (lang === 'uz' ? "O'rtacha Band" : "Avg Band"),
      value: avgBand,
      icon: GradIcon,
      color: isDark ? "text-emerald-400" : "text-emerald-600",
      bg: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)",
      iconBg: isDark ? "bg-emerald-500/20" : "bg-emerald-50",
    },
    {
      label: t('teacher.results.violations') || (lang === 'uz' ? "Qoidabuzarliklar" : "Violations"),
      value: violationsCount,
      icon: AlertIcon,
      color: isDark ? "text-rose-400" : "text-rose-600",
      bg: isDark ? "rgba(244,63,94,0.08)" : "rgba(244,63,94,0.05)",
      iconBg: isDark ? "bg-rose-500/20" : "bg-rose-50",
    },
  ];

  if (loading) return (
    <div className="py-6 max-w-7xl mx-auto px-4">
      <TeacherResultsSkeleton rows={10} />
    </div>
  );

  return (
    <div className={`py-6 font-sans animate-content-in ${isDark ? 'text-white' : 'text-slate-800'}`}>
      <RefreshBar active={isRefreshing} />
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
            {t('common.home') || (lang === 'uz' ? 'Bosh sahifa' : 'Home')}
          </button>
        </div>

        {/* Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('teacher.results.title') || (lang === 'uz' ? "O'quvchilar Natijalari" : "Student Results")}
            </h1>
            <p className={`text-sm mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('teacher.results.subtitle') || (lang === 'uz' ? "Guruhlaringizdagi o'quvchilar tomonidan topshirilgan testlar va yechimlar tahlili." : "Analysis of tests and solutions submitted by students in your groups.")}
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-2xl text-xs font-bold border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
            {lang === 'uz' ? `Jami ${filteredResults.length} ta yechim` : `Total ${filteredResults.length} results`}
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
              <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-600'}`} />
              <input
                type="text"
                placeholder={t('teacher.results.searchPlaceholder') || (lang === 'uz' ? "Ism yoki test nomi..." : "Name or test title...")}
                className={`w-full pl-11 pr-4 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-white focus:border-blue-500/50 placeholder:text-gray-600 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600/50 placeholder:text-gray-400 focus:bg-white'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Group Filter */}
            <div className="relative flex-1 md:flex-initial min-w-[160px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <UsersIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none appearance-none cursor-pointer ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-gray-300 focus:border-blue-500/50 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600/50 focus:bg-white'}`}
              >
                <option value="all">{t('teacher.results.allGroups') || (lang === 'uz' ? 'Barcha Guruhlar' : 'All Groups')}</option>
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
                <FileIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none appearance-none cursor-pointer ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-gray-300 focus:border-blue-500/50 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600/50 focus:bg-white'}`}
              >
                <option value="all">{t('teacher.results.allTypes') || (lang === 'uz' ? 'Barcha Turlar' : 'All Types')}</option>
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
                <GradIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 rounded-2xl border text-sm font-medium transition-all outline-none appearance-none cursor-pointer ${isDark ? 'bg-[#1E1E1E]/50 border-white/5 text-gray-300 focus:border-blue-500/50 focus:bg-[#1E1E1E]' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600/50 focus:bg-white'}`}
              >
                <option value="all">{t('teacher.results.allStatuses') || (lang === 'uz' ? 'Barcha Statuslar' : 'All Statuses')}</option>
                <option value="pending">{t('teacher.results.statusPending') || (lang === 'uz' ? 'Kutilmoqda' : 'Pending')}</option>
                <option value="graded">{t('teacher.results.statusGraded') || (lang === 'uz' ? 'Baholangan' : 'Graded')}</option>
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
              {t('teacher.results.clearFilters') || (lang === 'uz' ? 'Tozalash' : 'Clear')}
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
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider w-32 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colDate') || (lang === 'uz' ? 'Sana' : 'Date')}</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colStudent') || (lang === 'uz' ? "O'quvchi" : 'Student')}</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colTestTitle') || (lang === 'uz' ? 'Test Nomi' : 'Test Title')}</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colDuration') || (lang === 'uz' ? 'Sarf Vaqti' : 'Duration')}</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colScore') || (lang === 'uz' ? 'Natija' : 'Score')}</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colStatus') || (lang === 'uz' ? 'Status / Qoida' : 'Status / Rule')}</th>
                  <th className={`py-4 px-5 text-[13px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('teacher.results.colAction') || (lang === 'uz' ? 'Amal' : 'Action')}</th>
                </tr>
              </thead>

              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={`p-16 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="flex flex-col items-center gap-2">
                        <FolderIcon className="w-10 h-10 opacity-30 text-gray-400" />
                        <span className="font-semibold">{t('teacher.results.noResults') || (lang === 'uz' ? 'Hech qanday natija topilmadi' : 'No results found')}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((res) => {
                    const { date, time } = formatDateTime(res.date);

                    return (
                      <Fragment key={res.id}>
                      <tr
                        className={`group transition-colors duration-150 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'}`}
                      >
                        {/* 1. Date */}
                        <td className="py-4 px-5 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <div className="flex flex-col leading-tight">
                              <span className={`text-[13px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{date}</span>
                              <span className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{time}</span>
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
                              <span className={`text-[11px] font-medium mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('teacher.results.noGroup') || (lang === 'uz' ? 'Guruhsiz' : 'No Group')}</span>
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
                            {res.type === 'mock_full' && res.scores && (
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`} title="Listening">
                                  L: {res.scores.listeningBand ?? res.scores.listening_band ?? '-'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isDark ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-100'}`} title="Reading">
                                  R: {res.scores.readingBand ?? res.scores.reading_band ?? '-'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  (res.scores.writingBand ?? res.writingBand) 
                                    ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100')
                                    : (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse')
                                }`} title="Writing">
                                  W: {res.scores.writingBand ?? res.writingBand ?? (t('teacher.results.pending') || (lang === 'uz' ? 'kutilmoqda' : 'pending'))}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-100'}`} title="Speaking">
                                  S: {res.scores.speakingBand ?? res.speakingBand ?? '-'}
                                </span>
                              </div>
                            )}
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
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`text-[15px] font-black font-mono px-3 py-1 rounded-lg ${
                              res.displayScore !== '-'
                                ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700')
                                : (isDark ? 'text-gray-500' : 'text-gray-300')
                            }`}>
                              {res.displayScore}
                            </span>
                            {res.attemptsCount > 1 && (
                              <button
                                onClick={() => toggleExpand(res.id)}
                                className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
                              >
                                {t('teacher.results.attempts', { count: res.attemptsCount }) || (lang === 'uz' ? `${res.attemptsCount} urinish` : `${res.attemptsCount} attempts`)}
                                <CaretDown className={`w-3 h-3 transition-transform duration-200 ${expandedRows.has(res.id) ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 6. Status and Violations */}
                        <td className="py-4 px-5 align-middle text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              res.status === 'graded' || res.status === 'published'
                                ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                : (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200')
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                res.status === 'graded' || res.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`} />
                              {res.status === 'graded' || res.status === 'published'
                                ? (t('teacher.results.statusGraded') || (lang === 'uz' ? 'Baholangan' : 'Graded'))
                                : (t('teacher.results.statusPending') || (lang === 'uz' ? 'Kutilmoqda' : 'Pending'))}
                            </span>
                            
                            {res.hasViolation && (
                              <span 
                                title={res.violationText} 
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border cursor-help ${isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-100 text-rose-700 border-rose-200'}`}
                              >
                                <AlertIcon className="w-3 h-3 flex-shrink-0 text-rose-500" />
                                {t('teacher.results.violation') || (lang === 'uz' ? 'Qoidabuzarlik' : 'Violation')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-4 px-5 align-middle">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                if (res.type === 'writing') {
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
                              {((res.status === 'pending' || res.status === 'pending_review') && (res.type === 'writing' || res.type === 'mock_full'))
                                ? (t('teacher.results.grade') || (lang === 'uz' ? 'Baholash' : 'Grade'))
                                : (t('teacher.results.view') || (lang === 'uz' ? "Ko'rish" : 'View'))}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Attempts History (expandable) */}
                      {expandedRows.has(res.id) && res.attempts.length > 0 && (
                        <tr className={isDark ? 'bg-white/[0.02]' : 'bg-gray-50/70'}>
                          <td colSpan="7" className="px-5 pb-4 pt-1">
                            <div className={`rounded-2xl border p-3 flex flex-col gap-2 ${isDark ? 'bg-[#1E1E1E]/60 border-white/5' : 'bg-white border-gray-200'}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {t('teacher.results.allAttempts', { count: res.attempts.length }) || (lang === 'uz' ? `Barcha urinishlar (${res.attempts.length})` : `All attempts (${res.attempts.length})`)}
                              </p>
                              {[...res.attempts].reverse().map((attempt, idx) => {
                                const attemptDateObj = attempt.date ? (attempt.date.toDate ? attempt.date.toDate() : new Date(attempt.date)) : null;
                                const { date: aDate, time: aTime } = formatDateTime(attemptDateObj);
                                const aScore = attempt.bandScore || attempt.score || '-';

                                return (
                                  <div
                                    key={attempt.attemptId || idx}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`text-[11px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        #{res.attempts.length - idx}
                                      </span>
                                      <div className="flex flex-col leading-tight">
                                        <span className={`text-[12px] font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{aDate}</span>
                                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{aTime}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-[11px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatDuration(attempt.timeSpent)}
                                      </span>
                                      <span className={`text-[13px] font-black font-mono px-2.5 py-0.5 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                        {aScore}
                                      </span>
                                      <button
                                        onClick={() => navigate(`/review/${res.id}?attempt=${attempt.attemptId}`)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${isDark ? 'bg-[#2C2C2C] border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        {t('teacher.results.view') || (lang === 'uz' ? "Ko'rish" : 'View')}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
                onClick={() => setResultsCap(RESULTS_CAP_WIDE)}
                disabled={isRefreshing}
                className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 inline-flex items-center gap-2 disabled:opacity-60 ${
                  isDark
                    ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
                }`}
              >
                {isRefreshing && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                )}
                {t('teacher.results.loadMore') || (lang === 'uz' ? "Ko'proq yuklash" : 'Load More')}
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
              {lang === 'uz'
                ? (<>Jami <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredResults.length}</span> tadan <span className={isDark ? 'text-white' : 'text-gray-900'}>{filteredResults.length === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResults.length)}</span> ko'rsatilmoqda</>)
                : (<>Showing <span className={isDark ? 'text-white' : 'text-gray-900'}>{filteredResults.length === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResults.length)}</span> of <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredResults.length}</span></>)
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
