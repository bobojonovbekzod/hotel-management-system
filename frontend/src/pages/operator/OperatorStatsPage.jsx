import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  PhoneCall, 
  CheckCheck, 
  Target, 
  Flame, 
  Layers, 
  CircleDot, 
  Award, 
  Zap, 
  Sparkles, 
  Calendar, 
  Kanban, 
  History, 
  ArrowRight,
  Headset,
  PhoneOff,
  Grid
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useSip } from '../../contexts/SipContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function OperatorStatsPage() {
  const [kpiTimePeriod, setKpiTimePeriod] = useState('month'); // 'today', 'week', 'month'
  const [selectedMonth, setSelectedMonth] = useState(''); // '' means current month, '0' = Jan, etc.
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Use Global SIP Context
  const {
    sipRegistered,
    softphoneOpen,
    setSoftphoneOpen,
    dialNumber,
    setDialNumber,
    inCall,
    callTimer,
    makeCall,
    endCall,
    sendDTMF,
    formatTimer
  } = useSip();

  // Stats State
  const [stats, setStats] = useState({
    totalCalls: 0,
    talkTime: '0 daq',
    bookedDeals: 0,
    revenue: 0,
    convRate: '0%',
    noAnswer: 0,
    totalLeads: 0,
    targetRevenue: 25000000,
    targetProgress: 0,
    sourceBreakdown: [],
    monthlyLeads: []
  });

  const [leads, setLeads] = useState([]);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const params = { period: kpiTimePeriod };
      if (kpiTimePeriod === 'month' && selectedMonth !== '') {
        params.month = selectedMonth;
        params.year = selectedYear;
      }
      const res = await api.get('/leads/stats', { params });
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      if (res.data?.success) {
        setLeads(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLeads()]);
      setLoading(false);
    };
    load();
  }, [kpiTimePeriod, selectedMonth, selectedYear]);

  // Real-time socket
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.on('new_lead_received', () => {
      fetchStats();
      fetchLeads();
    });
    socket.on('lead_updated', () => {
      fetchStats();
      fetchLeads();
    });
    return () => socket.disconnect();
  }, []);

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

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans pb-16">

      {/* TOP HEADER */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            Operator KPI & Statistika
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Sotuvlar, muloqot vaqti va samaradorlik ko'rsatkichlaringizning jonli tahlili</p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          <div className="flex items-center gap-2">
            {kpiTimePeriod === 'month' && (
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 shadow-2xs focus:outline-none focus:border-blue-500"
              >
                <option value="">Joriy oy</option>
                <option value="0">Yanvar</option>
                <option value="1">Fevral</option>
                <option value="2">Mart</option>
                <option value="3">Aprel</option>
                <option value="4">May</option>
                <option value="5">Iyun</option>
                <option value="6">Iyul</option>
                <option value="7">Avgust</option>
                <option value="8">Sentabr</option>
                <option value="9">Oktabr</option>
                <option value="10">Noyabr</option>
                <option value="11">Dekabr</option>
              </select>
            )}

            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs">
              <button
                onClick={() => { setKpiTimePeriod('today'); setSelectedMonth(''); }}
                className={`px-4 py-2 rounded-xl transition-all ${kpiTimePeriod === 'today' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Bugun
              </button>
              <button
                onClick={() => { setKpiTimePeriod('week'); setSelectedMonth(''); }}
                className={`px-4 py-2 rounded-xl transition-all ${kpiTimePeriod === 'week' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Haftalik
              </button>
              <button
                onClick={() => setKpiTimePeriod('month')}
                className={`px-4 py-2 rounded-xl transition-all ${kpiTimePeriod === 'month' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Oylik
              </button>
            </div>
          </div>

          <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 shadow-2xs ${
            sipRegistered ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${sipRegistered ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            Uztelecom: {sipRegistered ? 'Online' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* MAIN STATS CONTENT */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-16">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin shadow-md" />
            <BarChart3 className="w-5 h-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Statistika va KPI yuklanmoqda...</p>
            <p className="text-xs text-slate-400">Hisobotlar va konversiyalar hisoblanmoqda</p>
          </div>
        </div>
      ) : (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* 4 KPI CARDS (Owner Dashboard Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Jami Qo'ng'iroqlar</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.totalCalls} <span className="text-sm font-normal text-slate-500">ta</span></h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <PhoneCall className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Muloqot Vaqti</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.talkTime}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Yopilgan Sotuvlar</p>
              <h3 className="text-2xl font-bold text-emerald-600">{(stats.revenue || 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">so'm</span></h3>
              <p className="text-xs text-slate-400 mt-1">{stats.bookedDeals} ta bitim</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Konversiya (Sotuv %)</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.convRate}</h3>
              <p className="text-xs text-slate-400 mt-1">Ko'tarmagan: {stats.noAnswer}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <Target className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* TARGET & SOURCE BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Target card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" /> Oylik Sotuv Rejasi
              </h3>
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                {stats.targetProgress}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-600">Tushum: <span className="text-emerald-600">{(stats.revenue || 0).toLocaleString()}</span></span>
                <span className="text-slate-400">Reja: {(stats.targetRevenue || 25000000).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(2, Math.min(100, stats.targetProgress))}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Source breakdown card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" /> Lidlar Manbasi
            </h3>
            <div className="space-y-3 text-xs">
              {stats.sourceBreakdown && stats.sourceBreakdown.length > 0 ? (
                stats.sourceBreakdown.map((src, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-xs">
                      <span className="text-slate-700 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-pink-500' : idx === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        {src.name}
                      </span>
                      <span className="text-slate-900 font-extrabold">{src.count} ta lid ({src.percent}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full ${idx === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' : idx === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} rounded-full`} 
                        style={{ width: `${Math.max(4, src.percent)}%` }} 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-slate-400 text-xs italic flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-slate-400" />
                  Manbalar bo'yicha ma'lumotlar to'planmoqda...
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MONTHLY LEADS CHART */}
        {stats.monthlyLeads && stats.monthlyLeads.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm mt-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Oylik Lidlar Dinamikasi ({selectedYear})
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyLeads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" name="Lidlar soni" radius={[6, 6, 0, 0]}>
                    {stats.monthlyLeads.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.month === (['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][new Date().getMonth()]) && selectedMonth === '' ? '#3b82f6' : (index.toString() === selectedMonth ? '#3b82f6' : '#94a3b8')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* QUICK NAVIGATION ACTION CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Link
            to="/operator/pipeline"
            className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Kanban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-800">Sotuv Voronkasiga O'tish</h4>
                <p className="text-xs text-slate-500 mt-0.5">{leads.length} ta umumiy lidlar bazasi</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/operator/calls"
            className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-800">Qo'ng'iroqlar Tarixiga O'tish</h4>
                <p className="text-xs text-slate-500 mt-0.5">Audio yozuvlar va muloqotlar</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

      </div>
      )}



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
