import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { 
  BedDouble, 
  CheckSquare, 
  ClipboardList, 
  Wallet, 
  Clock, 
  LayoutDashboard, 
  Building2, 
  Users, 
  LineChart, 
  LogOut, 
  Hotel, 
  Menu,
  Sun,
  Moon,
  Server,
  CalendarClock,
  ShieldAlert,
  Banknote,
  ShieldCheck,
  Settings,
  Plus,
  Key,
  UserCheck,
  CalendarDays,
  Activity,
  ChevronDown,
  ChevronRight,
  Archive,
  CreditCard,
  Shield,
  UserCog,
  Sparkles,
  Kanban,
  History
} from 'lucide-react';
import NotificationBell from './common/NotificationBell';


const superadminNav = [
  { path: '/superadmin/companies', icon: ShieldCheck, label: 'Kompaniyalar' },
];

const adminNav = [
  { path: '/admin/front-desk', icon: Key, label: 'Qabulxona' },
  { path: '/admin/renters', icon: CalendarDays, label: 'Ijarachilar' },
  { path: '/admin/reservations', icon: CalendarClock, label: 'Oldindan Bronlar' },
  { path: '/admin/bookings', icon: ClipboardList, label: 'Mijozlar' },
  { path: '/admin/shifts', icon: Clock, label: 'Smenalar' },
  { path: '/admin/expenses', icon: Wallet, label: 'Xarajatlar' },
  { path: '/admin/cleaning-tasks', icon: Sparkles, label: 'Tozalash Tarixi' },
  { path: '/admin/salary', icon: UserCheck, label: 'Mening Oyligim' },
  { path: '/admin/candidates', icon: UserCheck, label: 'Nomzodlar' },
  { path: '/tasks', icon: CheckSquare, label: 'Vazifalar' },
];

const directorNav = null; // director uses directorNavGroups below

const directorNavGroups = [
  {
    type: 'single',
    path: '/director/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    type: 'group',
    label: 'Qabulxona',
    icon: Key,
    key: 'qabul',
    items: [
      { path: '/director/rooms', icon: BedDouble, label: 'Xonalar (Shahmatka)' },
      { path: '/director/renters', icon: CalendarDays, label: 'Ijarachilar' },
      { path: '/director/reservations', icon: CalendarClock, label: 'Oldindan Bronlar' },
      { path: '/director/bookings', icon: ClipboardList, label: 'Mijozlar' },
    ],
  },
  {
    type: 'group',
    label: 'Moliya',
    icon: CreditCard,
    key: 'moliya',
    items: [
      { path: '/director/transactions', icon: Wallet, label: 'Kassa (Tranzaksiyalar)' },
      { path: '/director/expenses', icon: Wallet, label: 'Xarajatlar' },
      { path: '/director/payroll', icon: Banknote, label: 'Oylik maosh' },
    ],
  },
  {
    type: 'group',
    label: 'HR',
    icon: UserCog,
    key: 'hr',
    items: [
      { path: '/director/staff', icon: Users, label: 'Xodimlar' },
      { path: '/director/candidates', icon: UserCheck, label: 'Nomzodlar (Vakansiya)' },
      { path: '/tasks', icon: CheckSquare, label: 'Vazifalar' },
    ],
  },
  {
    type: 'group',
    label: 'Ichki nazorat',
    icon: Shield,
    key: 'nazorat',
    items: [
      { path: '/director/attendance', icon: CalendarClock, label: 'Davomat' },
      { path: '/director/shifts', icon: Clock, label: 'Smenalar' },
      { path: '/director/cleaning-tasks', icon: Sparkles, label: 'Tozalash Tarixi' },
      { path: '/director/shift-issues', icon: ShieldAlert, label: 'Smena Muammolari' },
    ],
  },
  {
    type: 'group',
    label: "Omborxona",
    icon: Archive,
    key: 'ombor',
    items: [
      { path: '/director/inventory-requests', icon: Archive, label: "Ombor So'rovlari" }
    ],
  },
];

// Flat array for non-owner roles
const ownerNav = null; // owner uses ownerNavGroups below

const ownerNavGroups = [
  {
    type: 'single',
    path: '/owner/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    type: 'group',
    label: 'Moliya',
    icon: CreditCard,
    key: 'moliya',
    items: [
      { path: '/owner/transactions', icon: Wallet, label: 'Kassa (Kirim-chiqim)' },
      { path: '/owner/expenses', icon: Wallet, label: 'Xarajatlar' },
      { path: '/owner/payroll', icon: Banknote, label: 'Oylik maosh' },
    ],
  },
  {
    type: 'group',
    label: 'HR',
    icon: UserCog,
    key: 'hr',
    items: [
      { path: '/owner/hr', icon: LayoutDashboard, label: 'HR Dashboard' },
      { path: '/owner/staff', icon: Users, label: 'Xodimlar' },
      { path: '/owner/candidates', icon: UserCheck, label: 'Nomzodlar (Vakansiya)' },
      { path: '/tasks', icon: CheckSquare, label: 'Vazifalar' },
    ],
  },
  {
    type: 'group',
    label: 'Ichki nazorat',
    icon: Shield,
    key: 'nazorat',
    items: [
      { path: '/owner/branches', icon: Building2, label: 'Filiallar' },
      { path: '/owner/rooms', icon: BedDouble, label: 'Xonalar' },
      { path: '/owner/room-analytics', icon: Activity, label: 'Xonalar Tahlili' },
      { path: '/owner/attendance', icon: CalendarClock, label: 'Davomat' },
      { path: '/owner/cleaning-tasks', icon: Sparkles, label: 'Tozalash Tarixi' },
      { path: '/owner/shift-issues', icon: ShieldAlert, label: 'Smena Muammolari' },
    ],
  },
  {
    type: 'group',
    label: "Omborxona",
    icon: Archive,
    key: 'ombor',
    items: [
      { path: '/owner/inventory', icon: Archive, label: 'Bosh Ombor' },
      { path: '/owner/inventory-approvals', icon: ClipboardList, label: "So'rovlar" }
    ],
  },
];

const supervisorNav = [
  { path: '/supervisor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/supervisor/rooms', icon: BedDouble, label: 'Xonalar' },
  { path: '/supervisor/checkin', icon: CheckSquare, label: 'Check-in' },
  { path: '/supervisor/bookings', icon: ClipboardList, label: 'Mijozlar' },
  { path: '/supervisor/expenses', icon: Wallet, label: 'Xarajatlar' },
  { path: '/supervisor/shifts', icon: Clock, label: 'Smenalar' },
  { path: '/supervisor/staff', icon: Users, label: 'Xodimlar' },
  { path: '/supervisor/attendance', icon: CalendarClock, label: 'Davomat' },
  { path: '/supervisor/branches', icon: Building2, label: 'Filiallar' },
  { path: '/tasks', icon: CheckSquare, label: 'Vazifalar' },
];

const hrNav = [
  { path: '/owner/hr', icon: LayoutDashboard, label: 'HR Dashboard' },
  { path: '/owner/staff', icon: Users, label: 'Xodimlar' },
];

const operatorNav = [
  { path: '/operator/statistics', icon: LineChart, label: 'Statistika' },
  { path: '/operator/pipeline', icon: Kanban, label: 'Voronka' },
  { path: '/operator/rooms', icon: BedDouble, label: 'Xonalar' },
  { path: '/operator/calls', icon: History, label: "Qo'ng'iroqlar tarixi" },
];

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{format(time, 'HH:mm:ss')}</>;
}

function DateDisplay() {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000); // Only update once a minute for date
    return () => clearInterval(timer);
  }, []);
  return <>{format(date, 'EEEE, d MMMM, yyyy', { locale: uz })}</>;
}

function CurrentShiftDisplay() {
  const [hour, setHour] = useState(new Date().getHours());
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(timer);
  }, []);
  const isMorning = hour >= 8 && hour < 19;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`p-2 rounded-full ${isMorning ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
        {isMorning ? <Sun size={18} /> : <Moon size={18} />}
      </div>
      <span className="text-xs text-slate-400 font-medium">
        {isMorning ? 'Kunduzgi smena' : 'Tungi smena'}
      </span>
      <span className="text-[10px] text-slate-600">
        {isMorning ? '08:00 - 19:00' : '19:00 - 08:00'}
      </span>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(() => user?.role === 'operator');
  const [pendingTasksCount, setPendingTasksCount] = useState(0);


  useEffect(() => {
    if (user) {
      api.get('/tasks/my-pending-count')
        .then(res => {
          if (res.data.success) {
            setPendingTasksCount(res.data.count);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-open the group that contains the current path
    const initial = {};
    const targetGroups = user?.role === 'owner' ? ownerNavGroups : (user?.role === 'director' ? directorNavGroups : []);
    targetGroups.forEach(g => {
      if (g.type === 'group' && g.items?.some(i => location.pathname.startsWith(i.path))) {
        initial[g.key] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getNav = () => {
    return user?.role === 'admin' ? adminNav :
    user?.role === 'director' ? null :
    user?.role === 'supervisor' ? supervisorNav :
    user?.role === 'superadmin' ? superadminNav :
    user?.role === 'hr' ? hrNav :
    user?.role === 'operator' ? operatorNav :
    user?.role === 'owner' ? null : [];
  };

  const navItems = getNav();

  const handleLogout = () => {
    logout();
    toast.success('Tizimdan chiqildi.');
  };

  const getRoleBadge = () => {
    const badges = {
      superadmin: { label: 'Tizim Egasi', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
      owner: { label: 'Biznes Egasi', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
      director: { label: 'Direktor', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
      supervisor: { label: 'Nazoratchi', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
      admin: { label: 'Admin', color: 'text-primary-400 bg-primary-400/10 border-primary-400/20' },
      hr: { label: 'HR', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
      cleaner: { label: 'Tozalik', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
      operator: { label: 'Call Operator', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    };
    return badges[user?.role] || badges.admin;
  };

  const badge = getRoleBadge();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  if (user?.role === 'cleaner') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-white text-slate-800 border-r border-slate-200 transition-all duration-300 ${
          isCompact ? 'w-16 lg:w-16' : 'w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {user?.company?.logoUrl ? (
              <img 
                src={`${api.defaults.baseURL || '/api'}${user.company.logoUrl}`} 
                alt="Logo" 
                className="w-9 h-9 rounded-full object-cover shadow-sm border border-slate-200 flex-shrink-0 bg-white" 
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md text-white flex-shrink-0">
                <Hotel size={20} />
              </div>
            )}
            {!isCompact && (
              <div className="truncate">
                <h1 className="font-bold text-slate-900 text-[14px] leading-tight tracking-tight truncate">Hotel Manager</h1>
                <p className="text-[11px] text-slate-500 font-medium truncate">{user?.branch?.name || 'Bosh ofis'}</p>
              </div>
            )}
          </div>

          {/* Toggle Compact Button */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 hidden lg:flex items-center justify-center border border-slate-200 transition-all"
            title={isCompact ? "Kengaytirish" : "Kichraytirish"}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCompact ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* User info */}
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              {user?.photoUrl && user.photoUrl !== 'uploaded_via_base64' ? (
                <img 
                  src={`${api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : ''}${user.photoUrl}`} 
                  alt={user.name} 
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 border border-teal-400/50 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {!isCompact && (
              <div className="min-w-0 truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`inline-block text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {(user?.role === 'owner' || user?.role === 'director') ? (
            // Grouped nav for owner and director
            isCompact ? (
              // COMPACT MODE: Clean centered icons only with hover tooltips
              <div className="space-y-1 flex flex-col items-center">
                {(user?.role === 'owner' ? ownerNavGroups : directorNavGroups).map((group, gIdx) => {
                  if (group.type === 'single') {
                    const Icon = group.icon;
                    const active = isActive(group.path);
                    return (
                      <Link
                        key={group.path}
                        to={group.path}
                        title={group.label}
                        style={active ? { background: '#f1f5f9' } : {}}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative ${
                          active ? 'text-primary-600 bg-slate-100 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon size={19} className={active ? "text-primary-600" : "text-slate-500"} />
                        {group.label === 'Vazifalar' && pendingTasksCount > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                        )}
                      </Link>
                    );
                  }

                  // Group items in compact mode
                  return (
                    <div key={group.key} className="w-full flex flex-col items-center space-y-1">
                      {gIdx > 0 && <div className="w-8 border-t-2 border-slate-300 my-2 rounded-full" />}
                      {group.items?.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            title={item.label}
                            style={active ? { background: '#f1f5f9' } : {}}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative ${
                              active ? 'text-primary-600 bg-slate-100 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <ItemIcon size={19} className={active ? "text-primary-600" : "text-slate-500"} />
                            {item.label === 'Vazifalar' && pendingTasksCount > 0 && (
                              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              // EXPANDED MODE: Full accordion groups with labels and chevrons
              <div className="space-y-0.5">
                {(user?.role === 'owner' ? ownerNavGroups : directorNavGroups).map((group) => {
                  if (group.type === 'single') {
                    const Icon = group.icon;
                    const active = isActive(group.path);
                    return (
                      <Link
                        key={group.path}
                        to={group.path}
                        style={active ? {background: '#f1f5f9'} : {}}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                          active ? 'text-primary-600 font-semibold shadow-sm' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon size={18} className={active ? "text-primary-500" : "text-slate-400"} />
                        <span className="flex-1">{group.label}</span>
                        {group.label === 'Vazifalar' && pendingTasksCount > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ml-auto animate-pulse">
                            {pendingTasksCount}
                          </span>
                        )}
                      </Link>
                    );
                  }

                  // Group
                  const GroupIcon = group.icon;
                  const isGroupOpen = !!openGroups[group.key];
                  const hasActiveChild = group.items?.some(i => isActive(i.path));

                  return (
                    <div key={group.key}>
                      <button
                        onClick={() => toggleGroup(group.key)}
                        style={hasActiveChild ? {background: '#f1f5f9'} : {}}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                          hasActiveChild ? 'text-primary-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <GroupIcon size={18} className={hasActiveChild ? "text-primary-500" : "text-slate-400"} />
                        <span className="flex-1 text-left">{group.label}</span>
                        {group.comingSoon && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Tez kunda</span>
                        )}
                        {!group.comingSoon && (
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 text-slate-500 ${isGroupOpen ? 'rotate-180' : ''}`}
                          />
                        )}
                      </button>

                      {isGroupOpen && !group.comingSoon && group.items.length > 0 && (
                        <div className="ml-3 mt-0.5 pl-3 space-y-0.5 border-l border-emerald-500/20">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const active = isActive(item.path);
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                style={active ? {background: '#f8fafc'} : {}}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                                  active ? 'text-primary-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <ItemIcon size={16} className={active ? "text-primary-500" : "text-slate-400"} />
                                <span className="flex-1">{item.label}</span>
                                {item.label === 'Vazifalar' && pendingTasksCount > 0 && (
                                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ml-auto animate-pulse">
                                    {pendingTasksCount}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Flat nav for other roles (Admin, Supervisor, etc.)
            (getNav() || []).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCompact ? item.label : undefined}
                  style={active ? {background: '#f1f5f9'} : {}}
                  className={`flex items-center gap-3 ${isCompact ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2'} rounded-xl transition-all duration-200 font-medium text-sm ${
                    active ? 'text-primary-600 bg-slate-100 font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} className={active ? "text-primary-500" : "text-slate-400"} />
                  {!isCompact && <span className="flex-1 truncate">{item.label}</span>}
                  {!isCompact && item.label === 'Vazifalar' && pendingTasksCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ml-auto animate-pulse">
                      {pendingTasksCount}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Shift info */}
        {!isCompact && user?.role === 'admin' && (
          <div className="px-4 py-4 border-t border-slate-100 bg-slate-50">
            <CurrentShiftDisplay />
          </div>
        )}

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <button
            onClick={handleLogout}
            title={isCompact ? "Chiqish" : undefined}
            className={`w-full flex items-center gap-2 ${isCompact ? 'justify-center px-2 py-2' : 'px-3 py-2'} rounded-xl font-medium text-xs text-rose-600 hover:bg-rose-50 transition-all`}
          >
            <LogOut size={16} />
            {!isCompact && <span>Tizimdan chiqish</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50">
        {/* Top bar - Dark like e-mehmon */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0" style={{background: '#1a2a3a', borderBottom: '1px solid #111e2b'}}>
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[13px] font-medium text-slate-300 capitalize">
                <DateDisplay />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            {/* Dark / Light Theme Toggle Switch */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/90 border-slate-600 text-yellow-400 hover:bg-slate-700 hover:border-yellow-400/50' 
                  : 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/20'
              }`}
              title={isDark ? "Kunduzgi (Light) rejimga o'tish" : "Tungi (Dark) rejimga o'tish"}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                  <span className="hidden sm:inline text-slate-200">Kunduzgi</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-300" />
                  <span className="hidden sm:inline text-slate-200">Tungi</span>
                </>
              )}
            </button>

            {(user?.role === 'owner' || user?.role === 'director') && <NotificationBell />}
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-white tabular-nums tracking-tight">
                <ClockDisplay />
              </p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {location.pathname.startsWith('/operator') ? (
          <main className="flex-1 overflow-y-auto p-0 w-full h-full custom-scrollbar">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
