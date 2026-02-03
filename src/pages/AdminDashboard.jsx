import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { 
  collection, 
  getCountFromServer, 
  getDocs, 
  query, 
  limit, 
  where,
  doc, 
  updateDoc, 
  arrayUnion,
} from "firebase/firestore";

// --- 1. ICONS (Barcha kerakli ikonkalar) ---
const Icons = {
  Home: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  Analytics: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>,
  Stats: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  Users: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  Test: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  Key: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>,
  Plus: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  Logout: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>,
  Close: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  Search: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Trash: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  Filter: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  Lock: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
  Eye: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Activity: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  Bell: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
};

// --- 2. SKELETON LOADER COMPONENT ---
function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-[#1E1E1E] font-sans overflow-hidden">
      <div className="w-[72px] bg-[#2C2C2C] m-4 mr-0 rounded-[30px] shadow-2xl border border-white/5 animate-pulse hidden md:block"></div>
      <main className="flex-1 p-4 lg:p-6 flex flex-col gap-6 w-full">
         <div className="flex justify-between items-center mb-2 animate-pulse">
            <div className="space-y-2">
                <div className="h-4 w-32 bg-[#333] rounded"></div>
                <div className="h-8 w-48 bg-[#333] rounded"></div>
            </div>
            <div className="h-10 w-10 bg-[#333] rounded-full"></div>
         </div>
         <div className="grid grid-cols-12 gap-6 h-full overflow-hidden">
            {[1, 2, 3].map(i => (
                <div key={i} className="col-span-12 md:col-span-4 h-32 bg-[#272727] rounded-[24px] border border-white/5 animate-pulse"></div>
            ))}
            <div className="col-span-12 h-4 bg-[#333] w-32 mt-2 rounded animate-pulse"></div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="col-span-6 md:col-span-3 h-36 bg-[#272727] rounded-[24px] border border-white/5 animate-pulse"></div>
            ))}
            <div className="col-span-12 bg-[#272727] rounded-[24px] p-6 h-96 border border-white/5 animate-pulse">
                <div className="flex justify-between mb-6">
                    <div className="h-6 w-1/4 bg-[#333] rounded"></div>
                    <div className="h-8 w-1/4 bg-[#333] rounded"></div>
                </div>
                {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="h-16 bg-[#333] mb-3 rounded-xl w-full"></div>
                ))}
            </div>
         </div>
      </main>
    </div>
  )
}

// --- 3. HELPER: TIME STATUS CALCULATOR (GOD MODE) ---
const getTimeStatus = (lastActiveAt) => {
    if (!lastActiveAt) return { status: 'offline', text: 'Uzoq vaqt oldin' };
    
    // Firestore Timestamp ni Date ga o'tkazish
    const date = lastActiveAt.seconds ? new Date(lastActiveAt.seconds * 1000) : new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 5) return { status: 'online', text: 'Online' };
    if (diffMins < 60) return { status: 'offline', text: `${diffMins} daqiqa oldin` };
    if (diffMins < 1440) return { status: 'offline', text: `${Math.floor(diffMins / 60)} soat oldin` };
    
    return { status: 'offline', text: date.toLocaleDateString() };
};

// --- 4. MAIN COMPONENT ---
export default function AdminDashboard() {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // STATISTIKA STATE
  const [stats, setStats] = useState({ users: 0, tests: 0, results: 0, loading: true });
  
  // STUDENT MANAGEMENT STATE (OPTIMAL)
  const [allUsers, setAllUsers] = useState([]); 
  const [displayedUsers, setDisplayedUsers] = useState([]); 
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("fullName");

  // GROUP DATA
  const [groups, setGroups] = useState([]);
  
  // MODALS
  const [selectedUser, setSelectedUser] = useState(null); 
  const [showGroupModal, setShowGroupModal] = useState(false); 
  const [showDetailModal, setShowDetailModal] = useState(false); 
  const [processing, setProcessing] = useState(false);

  // --- AUTH CHECK ---
  useEffect(() => {
    if (userData === undefined) return;
    if (!userData || userData.role !== 'admin') {
      navigate('/'); 
    } else {
      setIsAuthorized(true);
    }
  }, [userData, navigate]);

  // --- DATA FETCHING (CACHE BILAN) ---
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const cachedGroups = sessionStorage.getItem("admin_groups");
        const cachedStats = sessionStorage.getItem("admin_stats");

        if (cachedStats && cachedGroups) {
            setStats(JSON.parse(cachedStats));
            setGroups(JSON.parse(cachedGroups));
        } else {
            const usersSnap = await getCountFromServer(collection(db, "users"));
            const testsSnap = await getCountFromServer(collection(db, "tests"));
            const resultsSnap = await getCountFromServer(collection(db, "results"));

            const statsData = {
                users: usersSnap.data().count,
                tests: testsSnap.data().count,
                results: resultsSnap.data().count,
                loading: false
            };
            setStats(statsData);
            sessionStorage.setItem("admin_stats", JSON.stringify(statsData));

            const groupsSnap = await getDocs(collection(db, "groups"));
            const groupsData = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroups(groupsData);
            sessionStorage.setItem("admin_groups", JSON.stringify(groupsData));
        }
      } catch (error) {
        console.error("Stats Error:", error);
      }
    }
    if (isAuthorized) fetchInitialData();
  }, [isAuthorized]);

  // --- USERLARNI YUKLASH ---
  useEffect(() => {
    if (isAuthorized) {
        const cachedUsers = sessionStorage.getItem("admin_all_users");
        if (cachedUsers) {
            const parsedUsers = JSON.parse(cachedUsers);
            setAllUsers(parsedUsers);
            applyFilterAndSearch(parsedUsers, searchTerm, sortOption);
        } else {
            fetchAllUsers();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  useEffect(() => {
      applyFilterAndSearch(allUsers, searchTerm, sortOption);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sortOption, allUsers]);

  const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
          const q = query(collection(db, "users"), limit(1000));
          const snap = await getDocs(q);
          const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          setAllUsers(usersList);
          sessionStorage.setItem("admin_all_users", JSON.stringify(usersList)); 
          applyFilterAndSearch(usersList, searchTerm, sortOption);
      } catch (err) {
          console.error("Fetch Error:", err);
      } finally {
          setLoadingUsers(false);
      }
  };

  const applyFilterAndSearch = (usersList, term, sort) => {
      let filtered = [...usersList];
      if (term) {
          const lowerTerm = term.toLowerCase();
          filtered = filtered.filter(u => 
              (u.fullName && u.fullName.toLowerCase().includes(lowerTerm)) ||
              (u.email && u.email.toLowerCase().includes(lowerTerm))
          );
      }
      filtered.sort((a, b) => {
          if (sort === "createdAt") {
              return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
          } else {
              return (a.fullName || "").localeCompare(b.fullName || "");
          }
      });
      setDisplayedUsers(filtered);
  };

  const updateLocalAndCache = (updatedUser, action = 'update') => {
      let newUsersList = [...allUsers];
      if (action === 'update') {
          newUsersList = newUsersList.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
      } else if (action === 'delete') {
          newUsersList = newUsersList.filter(u => u.id !== updatedUser.id);
      }
      setAllUsers(newUsersList);
      sessionStorage.setItem("admin_all_users", JSON.stringify(newUsersList));
      applyFilterAndSearch(newUsersList, searchTerm, sortOption);
  };

  const handleUpdateStatus = async (userId, newType) => {
    try {
        await updateDoc(doc(db, "users", userId), { studentType: newType });
        updateLocalAndCache({ id: userId, studentType: newType });
        if(selectedUser?.id === userId) setSelectedUser(prev => ({...prev, studentType: newType}));
    } catch (err) { alert("Xato: " + err.message); }
  };

  const handleAddToGroup = async (groupId) => {
      if (!selectedUser) return;
      setProcessing(true);
      try {
          await updateDoc(doc(db, "groups", groupId), { studentIds: arrayUnion(selectedUser.id) });
          await updateDoc(doc(db, "users", selectedUser.id), { studentType: 'group' });
          updateLocalAndCache({ id: selectedUser.id, studentType: 'group' });
          alert(`${selectedUser.fullName} guruhga qo'shildi!`);
          setShowGroupModal(false);
      } catch (err) { alert("Xato: " + err.message); } 
      finally { setProcessing(false); }
  };

  const handleBlockUser = async (userId, currentStatus) => {
      try {
          const newStatus = !currentStatus;
          await updateDoc(doc(db, "users", userId), { isBlocked: newStatus });
          updateLocalAndCache({ id: userId, isBlocked: newStatus });
          if(selectedUser?.id === userId) setSelectedUser(prev => ({...prev, isBlocked: newStatus}));
      } catch (err) { alert("Xato: " + err.message); }
  };

  const refreshData = () => {
      sessionStorage.removeItem("admin_all_users");
      sessionStorage.removeItem("admin_groups");
      sessionStorage.removeItem("admin_stats");
      window.location.reload();
  }

  // --- RENDER (Skeleton or Content) ---
  if (!isAuthorized || stats.loading) return <DashboardSkeleton />;

  return (
    <div className="flex h-screen bg-[#1E1E1E] font-sans overflow-hidden text-white selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <aside className="w-[72px] bg-[#2C2C2C] m-4 mr-0 rounded-[30px] flex flex-col items-center py-6 shadow-2xl border border-white/5 z-20 hidden md:flex">
        <div className="mb-8 w-10 h-10 bg-[#3B3B3B] rounded-full flex items-center justify-center text-white shadow-inner">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
        </div>
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
            <SidebarBtn icon={<Icons.Home />} active onClick={() => {}} />
            <SidebarBtn icon={<Icons.Analytics />} onClick={() => navigate('/admin/analytics')} />
            <SidebarBtn icon={<Icons.Stats />} onClick={() => navigate('/admin/results')} />
            <SidebarBtn icon={<Icons.Users />} onClick={() => navigate('/admin/users')} />
            <SidebarBtn icon={<Icons.Test />} onClick={() => navigate('/admin/tests')} />
            <SidebarBtn icon={<Icons.Key />} onClick={() => navigate('/admin/keys')} />
        </div>
        <div className="mt-auto">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-[#2C2C2C] flex items-center justify-center overflow-hidden">
                    <span className="text-xs font-bold text-white">{userData?.fullName?.charAt(0) || "A"}</span>
                </div>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
        
        {/* HEADER & BREADCRUMBS */}
        <div className="mb-6 px-2">
            <div className="text-[10px] md:text-xs text-white/40 mb-2 flex items-center gap-2 font-medium">
                <span className="hover:text-white cursor-pointer transition" onClick={() => { setSearchTerm(""); setSortOption("fullName"); setSelectedUser(null); }}>Bosh sahifa</span>
                <span>/</span>
                <span>O'quvchilar</span>
                {searchTerm && (
                    <>
                        <span>/</span>
                        <span className="text-blue-400">Qidiruv: "{searchTerm}"</span>
                    </>
                )}
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-medium tracking-tight text-white">Salom, <span className="font-bold">{userData?.fullName || "Admin"}</span></h1>
                    <p className="text-white/40 text-xs mt-1 flex items-center gap-2">
                        Platforma statistikasi 
                        <button onClick={refreshData} className="text-blue-400 hover:text-blue-300 underline text-[10px]">Yangilash</button>
                    </p>
                </div>
                <button onClick={logout} className="text-white/60 hover:text-white transition p-2 rounded-full hover:bg-white/5">
                    <Icons.Logout className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pb-20 custom-scrollbar pr-2">
            
            {/* STATS */}
            <div className="col-span-12 md:col-span-4 bg-[#272727] rounded-[24px] p-6 border border-white/5">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">O'quvchilar</h3>
                        <div className="text-4xl font-light text-white tracking-tight">{stats.loading ? "..." : stats.users}</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl text-blue-400"><Icons.Users className="w-5 h-5"/></div>
                </div>
            </div>
            <div className="col-span-12 md:col-span-4 bg-[#272727] rounded-[24px] p-6 border border-white/5">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">Testlar</h3>
                        <div className="text-4xl font-light text-white tracking-tight">{stats.loading ? "..." : stats.tests}</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl text-purple-400"><Icons.Test className="w-5 h-5"/></div>
                </div>
            </div>
            <div className="col-span-12 md:col-span-4 bg-[#272727] rounded-[24px] p-6 border border-white/5">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">Natijalar</h3>
                        <div className="text-4xl font-light text-white tracking-tight">{stats.loading ? "..." : stats.results}</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl text-orange-400"><Icons.Stats className="w-5 h-5"/></div>
                </div>
            </div>

            {/* ACTION CARDS */}
            <div className="col-span-12 text-white/40 font-medium text-xs mt-2 uppercase tracking-widest pl-1">Tezkor Menyular</div>
            <ActionCard title="Test Yaratish" desc="Yangi Reading/Listening" icon={<Icons.Plus className="w-6 h-6 text-white" />} bg="bg-blue-600 hover:bg-blue-500" onClick={() => navigate('/admin/create-test')} />
            <ActionCard title="Analitika" desc="Statistika va tahlillar" icon={<Icons.Analytics className="w-6 h-6 text-white" />} bg="bg-purple-600 hover:bg-purple-500" onClick={() => navigate('/admin/analytics')} />
            <ActionCard title="O'quvchilar" desc="Tahrirlash va ko'rish" icon={<Icons.Users className="w-6 h-6 text-white" />} bg="bg-[#353535] hover:bg-[#404040]" onClick={() => navigate('/admin/users')} />
            <ActionCard title="Baholash" desc="Natijalarni tekshirish" icon={<Icons.Stats className="w-6 h-6 text-white" />} bg="bg-[#353535] hover:bg-[#404040]" onClick={() => navigate('/admin/results')} />

            {/* USER MANAGEMENT LIST */}
            <div className="col-span-12 bg-[#272727] rounded-[24px] p-4 md:p-6 border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-white font-medium">O'quvchilar Boshqaruvi</h3>
                    <div className="flex gap-2 w-full md:w-auto">
                         <div className="relative group">
                            <button className="flex items-center gap-2 bg-[#303030] px-3 py-2 rounded-xl text-xs text-white border border-white/5 hover:bg-[#383838] transition">
                                <Icons.Filter className="w-4 h-4 text-white/50" />
                                <span>{sortOption === "fullName" ? "Alifbo" : "Sana"}</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-32 bg-[#2C2C2C] border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-10">
                                <button onClick={() => setSortOption("fullName")} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5">Alifbo bo'yicha</button>
                                <button onClick={() => setSortOption("createdAt")} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5">Ro'yxat sanasi</button>
                            </div>
                        </div>

                        <div className="relative w-full md:w-64">
                            <Icons.Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                            <input 
                                type="text" 
                                placeholder="Ism bo'yicha qidirish..." 
                                className="w-full bg-[#303030] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition placeholder:text-white/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 md:space-y-2 min-h-[200px]">
                    {displayedUsers.length === 0 && !loadingUsers && <p className="text-white/30 text-sm italic text-center py-10">O'quvchi topilmadi.</p>}
                    
                    {displayedUsers.map((user) => {
                        const userGroup = groups.find(g => g.studentIds && g.studentIds.includes(user.id));
                        
                        // GOD MODE DATA
                        const { status, text: timeText } = getTimeStatus(user.lastActiveAt);
                        const isOnline = status === 'online';
                        const currentActivity = isOnline && user.currentActivity ? user.currentActivity : null;

                        return (
                            <div key={user.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-2 bg-[#303030] rounded-2xl md:rounded-xl hover:bg-[#383838] transition border border-white/5 gap-4 md:gap-3 group ${user.isBlocked ? 'opacity-50 grayscale' : ''}`}>
                                
                                <div className="flex items-center gap-3 w-full md:w-auto cursor-pointer" onClick={() => { setSelectedUser(user); setShowDetailModal(true); }}>
                                    <div className="relative">
                                        <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-sm md:text-xs shadow-lg">
                                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                                        </div>
                                        {/* ONLINE INDICATOR */}
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#303030] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                    </div>
                                    
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm md:text-xs font-bold text-gray-200 leading-tight hover:underline">{user.fullName || "Ismsiz"}</p>
                                            {user.isBlocked && <Icons.Lock className="w-3 h-3 text-red-500" />}
                                        </div>
                                        {/* STATUS & ACTIVITY */}
                                        <div className="flex items-center gap-1.5">
                                            {isOnline ? (
                                                <p className="text-xs md:text-[10px] text-green-400 font-medium">Online</p>
                                            ) : (
                                                <p className="text-xs md:text-[10px] text-gray-500">{timeText}</p>
                                            )}
                                        </div>
                                        {currentActivity && (
                                            <p className="text-[10px] text-blue-400 animate-pulse mt-0.5 flex items-center gap-1">
                                                <Icons.Activity className="w-3 h-3"/>
                                                {currentActivity}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                                    <div className="mr-2">
                                        {userGroup ? (
                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                                                {userGroup.name}
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                Individual
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setSelectedUser(user); setShowDetailModal(true); }}
                                            className="bg-white/5 hover:bg-blue-500 hover:text-white text-gray-400 p-2 md:p-1.5 rounded-lg border border-white/10 transition"
                                            title="Profilni ko'rish"
                                        >
                                            <Icons.Eye className="w-4 h-4 md:w-3.5 md:h-3.5"/>
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedUser(user); setShowGroupModal(true); }}
                                            className="bg-white/5 hover:bg-white/10 text-white p-2 md:p-1.5 rounded-lg border border-white/10 transition"
                                            title="Guruhga qo'shish"
                                        >
                                            <Icons.Plus className="w-4 h-4 md:w-3.5 md:h-3.5"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </main>

      {/* MODALS */}
      {showGroupModal && selectedUser && (
        <GroupSelectionModal 
            user={selectedUser} 
            groups={groups} 
            onClose={() => setShowGroupModal(false)} 
            onAdd={handleAddToGroup}
            processing={processing}
        />
      )}

      {showDetailModal && selectedUser && (
        <UserDetailModal 
            user={selectedUser} 
            onClose={() => setShowDetailModal(false)} 
            onBlock={handleBlockUser}
            onUpdateType={handleUpdateStatus}
        />
      )}
    </div>
  );
}

// --- SUB COMPONENTS (Tuzatilgan Modal bilan) ---

function UserDetailModal({ user, onClose, onBlock, onUpdateType }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                // Oddiy so'rov (Xatosiz ishlash uchun)
                const q = query(
                    collection(db, "results"), 
                    where("userId", "==", user.id),
                    limit(20) 
                );
                
                const snap = await getDocs(q);
                const data = snap.docs.map(d => d.data());
                
                // JavaScriptda saralash (Date yoki CreatedAt bo'yicha)
                data.sort((a, b) => {
                    const timeA = a.date?.seconds || a.createdAt?.seconds || 0;
                    const timeB = b.date?.seconds || b.createdAt?.seconds || 0;
                    return timeB - timeA; 
                });

                setResults(data);
            } catch (err) {
                console.error("Detail Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [user.id]);

    const totalTests = results.length;
    const avgScore = totalTests > 0 
        ? (results.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0) / totalTests).toFixed(1) 
        : "0.0";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#2C2C2C] border border-white/10 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {user.fullName}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${user.studentType === 'group' ? 'border-purple-500 text-purple-400' : 'border-blue-500 text-blue-400'}`}>
                                    {user.studentType === 'group' ? "Guruh o'quvchisi" : "Individual"}
                                </span>
                            </h2>
                            <p className="text-white/40 text-sm">{user.email}</p>
                            <p className="text-white/20 text-xs mt-1">ID: {user.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition p-2 bg-white/5 rounded-full">
                        <Icons.Close className="w-5 h-5"/>
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#222] p-4 rounded-2xl border border-white/5">
                            <p className="text-white/40 text-xs uppercase">O'rtacha Ball</p>
                            <p className="text-2xl font-bold text-yellow-400">{avgScore}</p>
                        </div>
                        <div className="bg-[#222] p-4 rounded-2xl border border-white/5">
                            <p className="text-white/40 text-xs uppercase">Testlar</p>
                            <p className="text-2xl font-bold text-white">{totalTests}</p>
                        </div>
                        <div className="bg-[#222] p-4 rounded-2xl border border-white/5">
                            <p className="text-white/40 text-xs uppercase">Holat</p>
                            <p className={`text-lg font-bold ${user.isBlocked ? 'text-red-400' : 'text-green-400'}`}>
                                {user.isBlocked ? "Bloklangan" : "Faol"}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-white font-medium mb-3 text-sm">Oxirgi Natijalar</h3>
                        {loading ? <p className="text-white/30 text-xs">Yuklanmoqda...</p> : (
                            <div className="space-y-2">
                                {results.length > 0 ? results.map((res, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[#222] p-3 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-white text-sm font-medium">{res.testTitle || "Test Nomi Yo'q"}</p>
                                            <p className="text-white/30 text-[10px]">
                                                {res.date ? new Date(res.date.seconds * 1000).toLocaleDateString() : 
                                                 res.createdAt ? new Date(res.createdAt.seconds * 1000).toLocaleDateString() : "Sana yo'q"}
                                            </p>
                                        </div>
                                        <div className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs font-bold">
                                            {res.score || "N/A"}
                                        </div>
                                    </div>
                                )) : <p className="text-white/20 text-xs italic">Natijalar topilmadi.</p>}
                            </div>
                        )}
                    </div>
                    <div>
                         <h3 className="text-white font-medium mb-3 text-sm">Biriktirilgan Testlar</h3>
                         <div className="flex flex-wrap gap-2">
                            {user.assignedTests && user.assignedTests.length > 0 ? (
                                user.assignedTests.map((test, i) => {
                                    const testId = typeof test === 'string' ? test : test.id;
                                    return (
                                        <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-gray-300">
                                            {testId ? testId.substring(0, 8) + "..." : "ID Yo'q"}
                                        </span>
                                    )
                                })
                            ) : (
                                <p className="text-white/20 text-xs italic">Hozircha test biriktirilmagan.</p>
                            )}
                         </div>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                    <button 
                        onClick={() => onBlock(user.id, user.isBlocked)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${user.isBlocked ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20'}`}
                    >
                        {user.isBlocked ? "Blokdan chiqarish" : "Foydalanuvchini bloklash"}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/5 transition">Yopish</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GroupSelectionModal({ user, groups, onClose, onAdd, processing }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#2C2C2C] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
                    <Icons.Close className="w-6 h-6"/>
                </button>
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white">Guruh tanlang</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        <span className="text-white font-bold">{user.fullName}</span> ni qaysi guruhga biriktiramiz?
                    </p>
                </div>
                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
                    {groups.length > 0 ? (
                        groups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => onAdd(group.id)}
                                className="w-full p-3.5 rounded-xl border border-white/5 bg-[#222] hover:bg-[#333] text-left transition flex items-center justify-between group"
                            >
                                <span className="font-medium text-sm text-gray-300 group-hover:text-white">{group.name}</span>
                                <Icons.Plus className="w-4 h-4 text-gray-500 group-hover:text-white"/>
                            </button>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 text-xs">Guruhlar mavjud emas.</p>
                    )}
                </div>
                {processing && <p className="text-center text-xs text-blue-400 animate-pulse">Bajarilmoqda...</p>}
            </div>
        </div>
    );
}

function SidebarBtn({ icon, active, onClick }) {
    return (
        <button onClick={onClick} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group relative ${active ? "bg-white text-black shadow-lg shadow-white/10" : "text-white/40 hover:text-white hover:bg-white/10"}`}>
            <div className="w-5 h-5">{icon}</div>
        </button>
    );
}

function ActionCard({ title, desc, icon, bg, onClick }) {
    return (
        <button onClick={onClick} className={`col-span-6 md:col-span-3 rounded-[24px] p-5 text-left transition-all duration-200 active:scale-95 flex flex-col justify-between h-36 border border-white/5 ${bg}`}>
            <div className="p-2 bg-white/10 rounded-xl w-fit backdrop-blur-sm">{icon}</div>
            <div><h4 className="text-white font-bold text-lg leading-tight">{title}</h4><p className="text-white/60 text-xs mt-1">{desc}</p></div>
        </button>
    );
}