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
  Activity
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

const ownerNav = [
  { path: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/owner/branches', icon: Building2, label: 'Filiallar' },
  { path: '/owner/rooms', icon: BedDouble, label: 'Xonalar' },
  { path: '/owner/transactions', icon: Wallet, label: 'Kassa (Kirim-chiqim)' },
  { path: '/owner/staff', icon: Users, label: 'Xodimlar' },
  { path: '/owner/payroll', icon: Banknote, label: 'Oylik maosh' },
  { path: '/owner/room-analytics', icon: Activity, label: 'Xonalar Tahlili' },
  { path: '/owner/attendance', icon: CalendarClock, label: 'Davomat' },
  { path: '/owner/devices', icon: Server, label: 'Face ID Qurilmalari' },
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
      <span className="text-[10px] text-slate-500">
        {isMorning ? '08:00 - 19:00' : '19:00 - 08:00'}
      </span>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNav = () => {
    return user?.role === 'admin' ? adminNav :
    user?.role === 'director' ? directorNav :
    user?.role === 'supervisor' ? supervisorNav :
    user?.role === 'superadmin' ? superadminNav :
    user?.role === 'owner' ? ownerNav : [];
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
      cleaner: { label: 'Tozalik', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
    };
    return badges[user?.role] || badges.admin;
  };

  const badge = getRoleBadge();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900/80 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
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
              <h1 className="font-bold text-white text-[15px] leading-tight tracking-tight">Hotel Manager</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{user?.branch?.name || 'Bosh ofis'}</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-5 border-b border-slate-800 bg-slate-800/20">
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
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shadow-inner">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white break-words whitespace-normal leading-tight">{user?.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                {user?.role === 'owner' && (
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider" title="Company ID">
                    CID:{user.companyId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                  active 
                    ? 'text-white bg-primary-500/10 border border-primary-500/20 shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className={active ? 'text-primary-400' : 'text-slate-500'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Shift info */}
        {user?.role === 'admin' && (
          <div className="px-4 py-4 border-t border-slate-800 bg-slate-900/50">
            <CurrentShiftDisplay />
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent transition-all duration-200 font-medium text-sm"
          >
            <Settings size={18} />
            <span>Sozlamalar</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 font-medium text-sm"
          >
            <LogOut size={18} />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0b1120]">
        {/* Top bar */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[13px] font-medium text-slate-400 capitalize">
                <DateDisplay />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-slate-200 tabular-nums tracking-tight">
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
