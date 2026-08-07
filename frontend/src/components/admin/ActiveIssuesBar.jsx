import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function ActiveIssuesBar() {
  const [issues, setIssues] = useState([]);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const res = await api.get('/shifts/issues/active');
      if (res.data.success) {
        setIssues(res.data.data);
      }
    } catch (error) {
      console.error("Issues yuklashda xato:", error);
    }
  };

  const handleResolve = async (id) => {
    try {
      setResolving(true);
      const res = await api.put(`/shifts/issues/${id}/resolve`);
      if (res.data.success) {
        toast.success("Muammo hal qilindi!");
        setExpandedIssue(null);
        fetchIssues();
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setResolving(false);
    }
  };

  if (issues.length === 0) return null;

  return (
    <>
      {/* Yupqa Banner */}
      <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between text-sm shadow-sm relative z-40 animate-[pulse_2s_ease-in-out_infinite]">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle size={16} className="animate-pulse" />
          <span>O'tgan smenadan hal qilinmagan muammolar bor! ({issues.length} ta)</span>
        </div>
        <button 
          onClick={() => setExpandedIssue(issues[0])}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-white text-xs font-bold transition-colors"
        >
          Ko'rish va Hal qilish
        </button>
      </div>

      {/* Muammo tafsilotlari Modali */}
      {expandedIssue && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-300 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={24} />
                  Smena muammosi
                </h3>
                <button 
                  onClick={() => setExpandedIssue(null)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                <p className="text-sm text-slate-500 mb-1">
                  Xabar qoldirgan: <span className="font-bold text-slate-800">{expandedIssue.admin?.name || 'Noma\'lum'}</span>
                </p>
                <p className="text-sm text-slate-500 mb-3">
                  Sana: {new Date(expandedIssue.createdAt).toLocaleString()}
                </p>
                <div className="bg-white p-3 rounded-lg border border-red-200 text-slate-800 text-sm whitespace-pre-wrap">
                  {expandedIssue.issueDescription}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setExpandedIssue(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Yopish
                </button>
                <button 
                  onClick={() => handleResolve(expandedIssue.id)}
                  disabled={resolving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm shadow-emerald-500/30"
                >
                  {resolving ? 'Hal qilinmoqda...' : (
                    <>
                      <CheckCircle2 size={18} />
                      Hal qilindi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
