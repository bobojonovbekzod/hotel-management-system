import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Phone, Calendar, Award, Briefcase, 
  CheckCircle, XCircle, Clock, Trash2, UserCheck, ChevronLeft, ChevronRight,
  Building2, MessageSquare, RefreshCw
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
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
        fetchCandidates();
      }
    } catch (err) {
      console.error(err);
      toast.error("O'chirishda xatolik");
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="card p-4 space-y-4">
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
        <div className="card p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <RefreshCw className="animate-spin" size={18} /> Nomzodlar yuklanmoqda...
        </div>
      ) : candidates.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Users className="mx-auto text-slate-300" size={48} />
          <h3 className="text-base font-semibold text-slate-700">Hali testdan o'tgan nomzodlar yo'q</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Telegram bot orqali 10 talik testdan 9 yoki 10 ball to'plagan nomzodlar bu yerda avtomatik aks etadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
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

                {/* Score Badge */}
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
                  <span className="text-slate-400 font-medium block">Ish Staji (Tajribasi)</span>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Briefcase size={14} className="text-indigo-600" />
                    {c.yearsOfExperience || 'Belgilanmagan'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium block">Oldingi Ish Joylari</span>
                  <p className="text-slate-800 font-medium line-clamp-2">
                    {c.experience || 'Tavsif berilmagan'}
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
        <div className="flex items-center justify-between card p-4 text-xs">
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
    </div>
  );
}
