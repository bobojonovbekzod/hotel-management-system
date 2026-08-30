import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Search, Filter, Phone, Calendar, Award, Briefcase, 
  CheckCircle, XCircle, Clock, Trash2, UserCheck, ChevronLeft, ChevronRight,
  Building2, MessageSquare, RefreshCw, Printer, FileText, X, Check, Shield
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CandidatesPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCandidateForPrint, setSelectedCandidateForPrint] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [page, selectedBranch, selectedStatus, search]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim(),
        branchId: selectedBranch || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      };
      const res = await api.get('/candidates', { params });
      if (res.data?.success) {
        setCandidates(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Nomzodlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await api.patch(`/candidates/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        toast.success("Nomzod statusi yangilandi");
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        if (selectedCandidateForPrint && selectedCandidateForPrint.id === id) {
          setSelectedCandidateForPrint(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Statusni o'zgartirishda xatolik");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu nomzodni o'chirmoqchimisiz?")) return;
    try {
      const res = await api.delete(`/candidates/${id}`);
      if (res.data?.success) {
        toast.success("Nomzod o'chirildi");
        if (selectedCandidateForPrint && selectedCandidateForPrint.id === id) {
          setSelectedCandidateForPrint(null);
        }
        fetchCandidates();
      }
    } catch (err) {
      console.error(err);
      toast.error("O'chirishda xatolik");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const parseAnswers = (answersJson) => {
    try {
      if (!answersJson) return [];
      return typeof answersJson === 'string' ? JSON.parse(answersJson) : answersJson;
    } catch (e) {
      return [];
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Clock size={12} /> Yangi</span>;
      case 'interviewed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><UserCheck size={12} /> Suhbatga chaqirildi</span>;
      case 'hired':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle size={12} /> Ishga olindi</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><XCircle size={12} /> Rad etildi</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            inset: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }
          .print-modal-card {
            position: static !important;
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            border-radius: 0 !important;
          }
          #anketa-printable-area, #anketa-printable-area * {
            visibility: visible !important;
          }
          #anketa-printable-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 5px 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-primary-600" /> Vakansiya Nomzodlari
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">
            Telegram <span className="font-semibold text-primary-600">@family_hotel_job_bot</span> orqali testdan o'tgan (9+ ball) sara nomzodlar
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchCandidates()}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yangilash
          </button>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Jami sara nomzodlar</div>
            <div className="text-xl font-bold text-primary-600">{totalCount} ta</div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card p-4 space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Nomzod ismi, telefon..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Branch Filter */}
          {['owner', 'hr', 'superadmin', 'supervisor'].includes(user?.role) ? (
            <select
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
              className="input-field text-xs"
            >
              <option value="">Barcha filiallar</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <div className="input-field text-xs bg-slate-100 font-bold text-slate-700 flex items-center justify-between">
              <span>Filial: {branches.find(b => b.id === user?.branchId)?.name || 'O\'z filialingiz'}</span>
              <Shield size={14} className="text-indigo-500" />
            </div>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="input-field text-xs"
          >
            <option value="all">Barcha statuslar</option>
            <option value="new">Yangi</option>
            <option value="interviewed">Suhbatga chaqirildi</option>
            <option value="hired">Ishga olindi</option>
            <option value="rejected">Rad etildi</option>
          </select>

          <div className="text-right text-xs text-slate-500 self-center font-medium">
            Ko'rsatilmoqda: <span className="text-slate-900 font-bold">{candidates.length}</span> / {totalCount}
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2 no-print">
          <RefreshCw className="animate-spin" size={18} /> Nomzodlar yuklanmoqda...
        </div>
      ) : candidates.length === 0 ? (
        <div className="card p-12 text-center space-y-3 no-print">
          <Users className="mx-auto text-slate-300" size={48} />
          <h3 className="text-base font-semibold text-slate-700">Hali testdan o'tgan nomzodlar yo'q</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Telegram bot orqali 10 talik testdan 9 yoki 10 ball to'plagan nomzodlar bu yerda avtomatik aks etadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 no-print">
          {candidates.map((c) => (
            <div 
              key={c.id} 
              className="card p-5 hover:shadow-md transition-all border border-slate-200/80 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
                    {c.name ? c.name.charAt(0).toUpperCase() : 'N'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${
                        c.position === 'Tozalik xodimi'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {c.position === 'Tozalik xodimi' ? '🧹 Tozalik xodimi' : '🛎️ Admin'}
                      </span>
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 size={13} className="text-indigo-500" />
                        {c.branch?.name || 'Har qanday filial'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(c.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Anketa Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border shadow-xs ${
                    c.score === 10 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    <Award size={15} />
                    <span>{c.score} / {c.totalQuestions || 10} Ball</span>
                    <span className="text-[10px] font-normal text-slate-500">({c.score === 10 ? 'Ideal' : 'A\'lo'})</span>
                  </div>

                  <button
                    onClick={() => setSelectedCandidateForPrint(c)}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText size={14} /> Anketa (Chop etish)
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium block">Telefon Raqami</span>
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Phone size={14} className="text-emerald-600" />
                    <a href={`tel:${c.phone}`} className="hover:underline hover:text-emerald-700">
                      {c.phone}
                    </a>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium block">Ish Staji va Ma'lumoti</span>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Briefcase size={14} className="text-indigo-600" />
                    {c.yearsOfExperience || 'Tajribasiz'} ({c.educationString || 'O\'rta'})
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium block">Manzil va Tillar</span>
                  <p className="text-slate-800 font-semibold line-clamp-2">
                    📍 {c.addressString || 'Ko\'rsatilmagan'} | 🗣️ {c.languagesString || 'O\'zbek tili'}
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Statusni o'zgartirish:</span>
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                    className="input-field py-1 text-xs font-semibold w-auto bg-white"
                  >
                    <option value="new">⏱️ Yangi</option>
                    <option value="interviewed">👤 Suhbatga chaqirildi</option>
                    <option value="hired">✅ Ishga olindi</option>
                    <option value="rejected">❌ Rad etildi</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Nomzodni o'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between card p-4 text-xs no-print">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Oldingi
          </button>

          <span className="font-semibold text-slate-700">
            Sahifa {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
          >
            Keyingi <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* OFFICIALLY STYLED CANDIDATE APPLICATION FORM MODAL (PRINTABLE ANKETA) */}
      {selectedCandidateForPrint && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCandidateForPrint(null); }}
          className="print-modal-overlay fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-center items-start p-3 sm:p-6 overflow-y-auto"
        >
          <div className="print-modal-card bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-4 sm:my-8">
            
            {/* Top Modal Controls (Hidden during print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 no-print bg-slate-50 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <FileText className="text-primary-600" size={22} /> 
                <span>Nomzod Shaxsiy Anketasi</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Printer size={16} /> 🖨️ Chop etish (Print A4)
                </button>

                <button
                  onClick={() => setSelectedCandidateForPrint(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer"
                  title="Yopish"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* PRINTABLE ANKETA PAPER DOCUMENT */}
            <div id="anketa-printable-area" className="p-4 sm:p-8 text-slate-900 space-y-6 bg-white">
              
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                    FAMILY HOTEL MEHMONXONALAR TARMOQ'I
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase mt-1">
                    ISHGA KIRUVCHI NOMZOD SHAXSIY ANKETASI
                  </h2>
                  <div className="text-xs text-slate-600 font-medium mt-1">
                    Rasmiy HR Hujjati № FH-ANK-{selectedCandidateForPrint.id.toString().padStart(4, '0')}
                  </div>
                </div>

                <div className="w-24 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center p-2 text-slate-400 text-[10px]">
                  <Users size={28} className="mb-1 opacity-50" />
                  <span>3x4 Rasm O'rni</span>
                </div>
              </div>

              {/* 1. Personal Info Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border-l-4 border-slate-900">
                  I. SHAXSIY MA'LUMOTLAR
                </h3>
                
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="w-1/3 bg-slate-50 p-2.5 font-bold border-r border-slate-300">Nomzodning F.I.SH:</td>
                      <td className="p-2.5 font-extrabold text-sm text-slate-900">{selectedCandidateForPrint.name}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Topshirayotgan Lavozimi:</td>
                      <td className="p-2.5 font-bold text-indigo-900">
                        {selectedCandidateForPrint.position === 'Tozalik xodimi' ? '🧹 Tozalik xodimi (Farrosh / Housekeeper)' : '🛎️ Administrator (Front Desk Manager)'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Tanlagan Filiali:</td>
                      <td className="p-2.5 font-bold">{selectedCandidateForPrint.branch?.name || 'Barcha filiallar'}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Telefon Raqami:</td>
                      <td className="p-2.5 font-extrabold text-emerald-900">{selectedCandidateForPrint.phone}</td>
                    </tr>
                    {selectedCandidateForPrint.addressString && (
                      <tr className="border-b border-slate-300">
                        <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Yashash Manzili:</td>
                        <td className="p-2.5 font-medium">{selectedCandidateForPrint.addressString}</td>
                      </tr>
                    )}
                    {selectedCandidateForPrint.educationString && (
                      <tr className="border-b border-slate-300">
                        <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Ma'lumoti:</td>
                        <td className="p-2.5 font-medium">{selectedCandidateForPrint.educationString}</td>
                      </tr>
                    )}
                    {selectedCandidateForPrint.languagesString && (
                      <tr className="border-b border-slate-300">
                        <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Tillar Bilish Darajasi:</td>
                        <td className="p-2.5 font-medium">{selectedCandidateForPrint.languagesString}</td>
                      </tr>
                    )}
                    {selectedCandidateForPrint.availabilityString && (
                      <tr className="border-b border-slate-300">
                        <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Ishga Chiqish Tayyorgarligi:</td>
                        <td className="p-2.5 font-bold text-blue-900">{selectedCandidateForPrint.availabilityString}</td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Arizaning Kelib Tushgan Vaqti:</td>
                      <td className="p-2.5 font-medium">
                        {new Date(selectedCandidateForPrint.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Experience Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border-l-4 border-slate-900">
                  II. MEHNAT TAJRIBASI VA STAJI
                </h3>
                
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="w-1/3 bg-slate-50 p-2.5 font-bold border-r border-slate-300">Umumiy Ish Staji:</td>
                      <td className="p-2.5 font-bold">{selectedCandidateForPrint.yearsOfExperience || 'Tajribasiz'}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-2.5 font-bold border-r border-slate-300">Oldingi Ish Joylari va Tajribasi:</td>
                      <td className="p-2.5 leading-relaxed font-medium">{selectedCandidateForPrint.experience || 'Tavsif berilmagan'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Test Results Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border-l-4 border-slate-900">
                  III. KASBIY VA PSIXOLOGIK SARALASH TESTI NATIJASI
                </h3>
                
                <div className="border border-slate-300 p-3 rounded-lg flex items-center justify-between bg-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Saralash Testi Umumiy Bali:</span>
                    <span className="text-xl font-black text-emerald-700">
                      {selectedCandidateForPrint.score} / {selectedCandidateForPrint.totalQuestions || 10} Ball ({Math.round((selectedCandidateForPrint.score / (selectedCandidateForPrint.totalQuestions || 10)) * 100)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-md uppercase">
                      ✅ Saralashdan O'tdi
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. HR & Director Decision Section */}
              <div className="pt-4 space-y-4 border-t border-slate-300">
                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div className="border border-slate-300 p-3 rounded-lg space-y-3">
                    <div className="font-bold uppercase text-slate-800">HR MENEJER XULOSASI:</div>
                    <div className="h-10 border-b border-dashed border-slate-400"></div>
                    <div className="flex justify-between text-[11px] font-medium pt-2">
                      <span>Imzo: _______________</span>
                      <span>Sana: ___ . ___ . 2026 y.</span>
                    </div>
                  </div>

                  <div className="border border-slate-300 p-3 rounded-lg space-y-3">
                    <div className="font-bold uppercase text-slate-800">BOSH DIREKTOR / OWNER QARORI:</div>
                    <div className="flex items-center gap-4 text-[11px] font-bold py-1">
                      <span>[  ] Suhbatga chaqirilsin</span>
                      <span>[  ] Ishga olinsin</span>
                      <span>[  ] Rad etilsin</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium pt-2">
                      <span>Imzo: _______________</span>
                      <span>Muhr o'rni (M.O'.)</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
