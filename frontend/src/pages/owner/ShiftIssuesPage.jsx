import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ShieldAlert, CheckCircle2, AlertTriangle, Calendar, Building2, UserCheck } from 'lucide-react';
import FullScreenLoader from '../../components/common/FullScreenLoader';

export default function ShiftIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'resolved'

  useEffect(() => {
    fetchIssues();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) {
        setBranches(res.data.data);
      }
    } catch (e) {
      // maybe not allowed or error
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/issues/history');
      if (res.data.success) {
        setIssues(res.data.data);
      }
    } catch (error) {
      toast.error("Muammolar tarixini yuklashda xato yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (filter === 'active' && issue.isIssueResolved) return false;
    if (filter === 'resolved' && !issue.isIssueResolved) return false;
    if (selectedBranch !== 'all' && issue.branchId !== Number(selectedBranch)) return false;
    return true;
  });

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <ShieldAlert className="text-red-500" /> Smena Muammolari (KPI)
          </h1>
          <p className="text-slate-600 text-sm mt-1">Xodimlar faoliyati bo'yicha barcha yuz bergan muammolar tarixi</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-slate-400"
            >
              <option value="all">Barcha filiallar</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Barchasi ({issues.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              filter === 'active' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-slate-600 hover:text-red-600 hover:bg-red-50/50'
            }`}
          >
            <AlertTriangle size={14} /> Faol ({issues.filter(i => !i.isIssueResolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              filter === 'resolved' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50'
            }`}
          >
            <CheckCircle2 size={14} /> Hal qilingan ({issues.filter(i => i.isIssueResolved).length})
          </button>
        </div>
      </div>
    </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Holati</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Filial & Sana</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Xabar Qildi (Admin)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[300px]">Muammo Matni</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hal Qildi (KPI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    Siz tanlagan toifada muammolar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 align-top">
                      {issue.isIssueResolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <CheckCircle2 size={14} /> Hal qilingan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-pulse">
                          <AlertTriangle size={14} /> Faol Muammo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Building2 size={14} className="text-slate-400" />
                          {issue.branch?.name || 'Barcha filiallar'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar size={12} />
                          {new Date(issue.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {issue.admin?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{issue.admin?.name || 'Noma\'lum'}</p>
                          <p className="text-xs text-slate-500 capitalize">{issue.admin?.role || 'admin'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className={`p-3 rounded-xl border text-sm ${issue.isIssueResolved ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        {issue.issueDescription}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {issue.isIssueResolved ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
                            {issue.issueResolvedBy?.name?.charAt(0) || <UserCheck size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{issue.issueResolvedBy?.name || 'Noma\'lum'}</p>
                            <p className="text-xs text-emerald-600 font-medium">Muammoni hal qildi</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-2">Hali hal qilinmagan</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
