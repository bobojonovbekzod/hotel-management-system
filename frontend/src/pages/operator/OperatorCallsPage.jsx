import React, { useState, useEffect, useRef } from 'react';
import { 
  History, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Volume2, 
  Clock, 
  Calendar, 
  User, 
  Headset, 
  PhoneOff, 
  Grid, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  FileAudio,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarRange
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useSip } from '../../contexts/SipContext';
import CustomAudioPlayer from '../../components/common/CustomAudioPlayer';

const cleanText = (str, fallback = '') => {
  if (!str) return fallback;
  if (typeof str !== 'string') return String(str);
  if (str.includes('<test lead:') || str.includes('dummy data for')) {
    if (str.includes('ism') || str.includes('name')) return 'Test Mijoz (Meta Test)';
    if (str.includes('phone') || str.includes('telefon') || str.includes('bog\'lanish')) return '+998 90 123 45 67';
    if (str.includes('filial') || str.includes('shaxar') || str.includes('city')) return 'Toshkent filiali';
    return str.replace(/<test lead: dummy data for |>/gi, '').trim();
  }
  return str.trim();
};

const formatPhone = (phone) => {
  const cleaned = cleanText(phone, '');
  if (!cleaned || cleaned === '+998') return '+998 (90) 123-45-67';
  return cleaned;
};

export default function OperatorCallsPage() {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all', 'incoming', 'outgoing', 'recorded'
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCalls: 0, incoming: 0, outgoing: 0, answered: 0, recorded: 0 });

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leads/calls', {
        params: {
          page,
          limit,
          direction: directionFilter,
          dateRange,
          startDate,
          endDate,
          search: searchQuery
        }
      });
      if (res.data?.success) {
        setCallLogs(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page, limit, directionFilter, dateRange, startDate, endDate, searchQuery]);

  // Use Global SIP Context
  const {
    sipRegistered,
    softphoneOpen,
    setSoftphoneOpen,
    dialNumber,
    setDialNumber,
    inCall,
    callTimer,
    incomingCall,
    makeCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    isMuted,
    sendDTMF,
  } = useSip();

  const getPageNumbers = (current, total) => {
    if (!total || total <= 1) return [1];
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const cleanPhoneForDial = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('998') && digits.length === 12) {
      return digits.slice(3);
    }
    if (digits.length === 9) {
      return digits;
    }
    if (digits.length > 9 && digits.startsWith('8')) {
      return digits.slice(1);
    }
    return digits || String(phone).replace(/[\s+()-]/g, '');
  };

  const handleStartCall = (targetPhone = null) => {
    const rawNumber = targetPhone || dialNumber || '';
    const cleanedDigits = cleanPhoneForDial(rawNumber);
    const numberToCall = cleanedDigits || rawNumber.replace(/[\s+()-]/g, '');
    if (numberToCall) {
      makeCall(numberToCall);
    } else {
      setSoftphoneOpen(true);
    }
  };

  const handleDialClick = (digit) => {
    if (dialNumber.length < 15) {
      setDialNumber(prev => prev + digit);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans pb-28">

      {/* TOP HEADER BAR */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            Qo'ng'iroqlar Tarixi va Ovoz Yozuvlari
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Uztelecom liniyasi orqali amalga oshirilgan barcha kiruvchi va chiquvchi audio muloqotlar</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCalls}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 shadow-2xs">
            <span>Jami: {summary.totalCalls || pagination.total} ta qo'ng'iroq</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="p-4 sm:p-6 w-full space-y-4">
        
        {/* SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Kiruvchi Muloqotlar</p>
              <p className="text-xl font-black text-slate-900">{summary.incoming} <span className="text-xs font-medium text-slate-500">ta</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Chiquvchi Muloqotlar</p>
              <p className="text-xl font-black text-slate-900">{summary.outgoing} <span className="text-xs font-medium text-slate-500">ta</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Muloqot Bo'lganlar</p>
              <p className="text-xl font-black text-teal-600">{summary.answered} <span className="text-xs font-medium text-slate-500">ta</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Audio Yozuvi Mavjudlar</p>
              <p className="text-xl font-black text-purple-600">{summary.recorded} <span className="text-xs font-medium text-slate-500">ta yozuv</span></p>
            </div>
          </div>
        </div>

        {/* DATE FILTER & DIRECTION & SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          
          {/* Row 1: Date Range Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-extrabold text-slate-700">Sana oralig'i:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              {[
                { key: 'all', label: 'Barcha vaqt' },
                { key: 'today', label: 'Bugun' },
                { key: 'yesterday', label: 'Kecha' },
                { key: 'week', label: 'Oxirgi 7 kun' },
                { key: 'month', label: 'Bu oy' },
                { key: 'custom', label: 'Kalendar' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setDateRange(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    dateRange === tab.key 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-bold focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-400 font-bold">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Row 2: Direction Filter Pills + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs overflow-x-auto custom-scrollbar">
              <button
                onClick={() => { setDirectionFilter('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'all' ? 'bg-white text-blue-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Barchasi ({summary.totalCalls || pagination.total})
              </button>
              <button
                onClick={() => { setDirectionFilter('incoming'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'incoming' ? 'bg-white text-blue-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Kiruvchi ({summary.incoming})
              </button>
              <button
                onClick={() => { setDirectionFilter('outgoing'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'outgoing' ? 'bg-white text-emerald-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Chiquvchi ({summary.outgoing})
              </button>
              <button
                onClick={() => { setDirectionFilter('recorded'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'recorded' ? 'bg-white text-purple-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Audio Record ({summary.recorded})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Raqam, ism yoki lid qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* CALLS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3.5 whitespace-nowrap">Yo'nalish</th>
                  <th className="py-2 px-3 whitespace-nowrap">Sana & Vaqt</th>
                  <th className="py-2 px-3 whitespace-nowrap">Mijoz Ismi</th>
                  <th className="py-2 px-3 whitespace-nowrap">Lid ID</th>
                  <th className="py-2 px-3 whitespace-nowrap">Telefon</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Davomiyligi</th>
                  <th className="py-2 px-3 whitespace-nowrap">Holat</th>
                  <th className="py-2 px-3.5 text-right whitespace-nowrap min-w-[320px]">Ovoz Yozuvi & Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin shadow-xs" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">Qo'ng'iroqlar tarixi yuklanmoqda...</p>
                          <p className="text-[11px] text-slate-400">Serverdan audio yozuvlar va muloqotlar sinxronlanmoqda</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : callLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400 font-medium space-y-1">
                      <History className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold text-slate-600">Qo'ng'iroqlar topilmadi</p>
                    </td>
                  </tr>
                ) : (
                  callLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Direction */}
                      <td className="py-1.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          {item.direction === 'incoming' ? (
                            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                              <ArrowDownLeft className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                              <ArrowUpRight className="w-3 h-3" />
                            </div>
                          )}
                          <span className="text-[11px]">{item.direction === 'incoming' ? 'Kiruvchi' : 'Chiquvchi'}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-mono font-semibold text-slate-500 text-[11px]">
                        {item.date} {item.time}
                      </td>

                      {/* Name */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-extrabold text-blue-600 text-xs">{cleanText(item.name, 'Mijoz')}</td>

                      {/* Lead ID */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold">
                        {item.leadId ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 text-[10px] shadow-2xs font-extrabold flex items-center w-max gap-1">
                            🎯 Lead #{item.leadId}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200 text-[10px] font-semibold flex items-center w-max gap-1">
                            ✨ Yangi raqam
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">{formatPhone(item.phone)}</td>

                      {/* Duration */}
                      <td className="py-1.5 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-700 text-xs">
                        {item.duration || '00:00'}
                      </td>

                      {/* Status */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          (item.status || '').includes('yakunlandi') || (item.status || '').includes('Muvaffaq')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.status || 'Bajarildi'}
                        </span>
                      </td>

                      {/* Audio Record & Call Button */}
                      <td className="py-1.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.hasRecord && item.audioUrl ? (
                            <CustomAudioPlayer 
                              src={item.audioUrl} 
                              compact={true} 
                              className="min-w-[260px] w-64 sm:w-72" 
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-3">Audio yo'q</span>
                          )}

                          <button
                            onClick={() => handleStartCall(item.phone)}
                            className="w-6.5 h-6.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 flex items-center justify-center shrink-0 transition-all shadow-2xs active:scale-95"
                            title="Qayta qo'ng'iroq qilish"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="bg-slate-50/70 px-6 py-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Jami: <strong className="text-slate-800 font-bold">{pagination.total}</strong> ta qo'ng'iroq</span>
            <span>·</span>
            <span>Sahifa: <strong className="text-[#0b92a8] font-bold">{pagination.page}</strong> / {pagination.totalPages}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
            {/* Items per page selector dropdown */}
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235c6b73%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            {/* Previous Page Button */}
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 stroke-[2.5]" />
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1.5">
              {getPageNumbers(pagination.page, pagination.totalPages).map((p, idx) => (
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-10 flex items-center justify-center text-slate-400 font-bold select-none text-xs">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-2xl text-sm font-bold transition-all flex items-center justify-center ${
                      pagination.page === p
                        ? 'bg-[#0b92a8] text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    {p}
                  </button>
                )
              ))}
            </div>

            {/* Next Page Button */}
            <button
              onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 stroke-[2.5]" />
            </button>
          </div>
        </div>

      </div>



      {/* BOTTOM FLOATING DIALING BAR */}
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 fixed bottom-0 left-0 lg:left-64 right-0 z-30 shadow-lg">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Telefon raqam terish..."
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          <button
            onClick={() => setSoftphoneOpen(!softphoneOpen)}
            className={`p-2 border rounded-xl transition-all ${
              softphoneOpen ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Keypad Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {inCall ? (
          <button
            onClick={endCall}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 active:scale-95 transition-all"
          >
            <PhoneOff className="w-4 h-4" /> Tugatish ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})
          </button>
        ) : (
          <button
            onClick={() => handleStartCall()}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <PhoneCall className="w-4 h-4" /> Qo'ng'iroq (Uztelecom)
          </button>
        )}
      </div>

    </div>
  );
}
