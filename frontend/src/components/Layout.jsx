import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  Archive,
  CreditCard,
  Shield,
  UserCog
} from 'lucide-react';

const superadminNav = [
  { path: '/superadmin/companies', icon: ShieldCheck, label: 'Kompaniyalar' },
];

const adminNav = [
  { path: '/admin/front-desk', icon: Key, label: 'Qabul (Shahmatka)' },
  { path: '/admin/renters', icon: CalendarDays, label: 'Ijarachilar' },
  { path: '/admin/reservations', icon: CalendarClock, label: 'Oldindan Bronlar' },
  { path: '/admin/shifts', icon: Clock, label: 'Smenalar' },
  { path: '/admin/expenses', icon: Wallet, label: 'Xarajatlar' },
  { path: '/admin/salary', icon: UserCheck, label: 'Mening Oyligim' },
];

const directorNav = [
  { path: '/director/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/director/rooms', icon: Key, label: 'Qabul (Shahmatka)' },
  { path: '/director/renters', icon: CalendarDays, label: 'Ijarachilar' },
  { path: '/director/reservations', icon: CalendarClock, label: 'Oldindan Bronlar' },
  { path: '/director/bookings', icon: ClipboardList, label: 'Bronlar' },
  { path: '/director/expenses', icon: Wallet, label: 'Xarajatlar' },
  { path: '/director/staff', icon: Users, label: 'Xodimlar' },
  { path: '/director/attendance', icon: CalendarClock, label: 'Davomat' },
  { path: '/director/shifts', icon: Clock, label: 'Smenalar' },
  { path: '/director/transactions', icon: Banknote, label: 'Kassa (Tranzaksiyalar)' },
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
      { path: '/owner/devices', icon: Server, label: 'Face ID Qurilmalari' },
    ],
  },
  {
    type: 'group',
    label: "Omborxona",
    icon: Archive,
    key: 'ombor',
    items: [],
    comingSoon: true,
  },
];

const supervisorNav = [
  { path: '/supervisor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/supervisor/rooms', icon: BedDouble, label: 'Xonalar' },
  { path: '/supervisor/checkin', icon: CheckSquare, label: 'Check-in' },
  { path: '/supervisor/bookings', icon: ClipboardList, label: 'Bronlar' },
  { path: '/supervisor/expenses', icon: Wallet, label: 'Xarajatlar' },
  { path: '/supervisor/shifts', icon: Clock, label: 'Smenalar' },
  { path: '/supervisor/staff', icon: Users, label: 'Xodimlar' },
  { path: '/supervisor/attendance', icon: CalendarClock, label: 'Davomat' },
  { path: '/supervisor/branches', icon: Building2, label: 'Filiallar' },
  { path: '/supervisor/devices', icon: Server, label: 'Face ID Qurilmalari' },
];

const hrNav = [
  { path: '/owner/hr', icon: LayoutDashboard, label: 'HR Dashboard' },
  { path: '/owner/staff', icon: Users, label: 'Xodimlar' },
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-open the group that contains the current path
    const initial = {};
    ownerNavGroups.forEach(g => {
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
    user?.role === 'director' ? directorNav :
    user?.role === 'supervisor' ? supervisorNav :
    user?.role === 'superadmin' ? superadminNav :
    user?.role === 'hr' ? hrNav :
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
    };
    return badges[user?.role] || badges.admin;
  };

  const badge = getRoleBadge();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col bg-white border-r border-slate-200 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {user?.company?.logoUrl ? (
              <img 
                src={`${api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : ''}${user.company.logoUrl}`} 
                alt="Logo" 
                className="w-10 h-10 rounded-full object-cover shadow-lg border border-slate-700/50 flex-shrink-0 bg-white" 
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 text-white flex-shrink-0">
                <Hotel size={22} />
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 text-[15px] leading-tight tracking-tight">Hotel Manager</h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">{user?.branch?.name || 'Bosh ofis'}</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              {user?.photoUrl && user.photoUrl !== 'uploaded_via_base64' ? (
                <img 
                  src={`${api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : ''}${user.photoUrl}`} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-inner"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 border border-primary-400/50 flex items-center justify-center text-[15px] font-bold text-white shadow-md">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 break-words whitespace-normal leading-tight">{user?.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                {user?.role === 'owner' && (
                  <span className="text-[10px] text-slate-600 font-mono tracking-wider" title="Company ID">
                    CID:{user.companyId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {user?.role === 'owner' ? (
            // Grouped nav for owner
            <div className="space-y-0.5">
              {ownerNavGroups.map((group) => {
                if (group.type === 'single') {
                  const Icon = group.icon;
                  const active = isActive(group.path);
                  return (
                    <Link
                      key={group.path}
                      to={group.path}
                      style={active ? {background: '#f1f5f9'} : {}}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                        active ? 'text-primary-600 shadow-sm' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon size={18} className={active ? "text-primary-500" : "text-slate-400"} />
                      <span>{group.label}</span>
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
                        hasActiveChild ? 'text-primary-600' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <GroupIcon size={18} className={hasActiveChild ? "text-primary-500" : "text-slate-400"} />
                      <span className="flex-1 text-left">{group.label}</span>
                      {group.comingSoon && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Tez kunda</span>
                      )}
                      {!group.comingSoon && (
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 text-slate-600 ${isGroupOpen ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>

                    {isGroupOpen && !group.comingSoon && group.items.length > 0 && (
                      <div className="ml-3 mt-0.5 pl-3 space-y-0.5" style={{borderLeft: '1px solid rgba(0,201,167,0.15)'}}>
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
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat nav for other roles
            (getNav() || []).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={active ? {background: '#f1f5f9'} : {}}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                    active ? 'text-primary-600 shadow-sm' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} className={active ? "text-primary-500" : "text-slate-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* Shift info */}
        {user?.role === 'admin' && (
          <div className="px-4 py-4" style={{borderTop: '1px solid rgba(0,201,167,0.1)', background: 'rgba(0,201,167,0.03)'}}>
            <CurrentShiftDisplay />
          </div>
        )}

        {/* Logout */}
        <div className="p-4 space-y-2" style={{borderTop: '1px solid rgba(0,201,167,0.1)'}}>
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-transparent transition-all duration-200 font-medium text-sm"
            style={{color: '#6a8fa8'}}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#334155'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6a8fa8'; }}
          >
            <Settings size={18} />
            <span>Sozlamalar</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-transparent transition-all duration-200 font-medium text-sm"
            style={{color: '#6a8fa8'}}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6a8fa8'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <LogOut size={18} />
            <span>Tizimdan chiqish</span>
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
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-white tabular-nums tracking-tight">
                <ClockDisplay />
              </p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
