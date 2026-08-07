import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

export default function RequestApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/requests');
      setRequests(res.data.data);
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.put(`/inventory/requests/${id}/approve`);
      toast.success("So'rov tasdiqlandi. Ombordan filialga o'tkazildi.");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Rad etish sababini kiriting (ixtiyoriy):");
    if (reason === null) return; // bekor qildi

    try {
      await api.put(`/inventory/requests/${id}/reject`, { notes: reason });
      toast.success("So'rov rad etildi.");
      fetchRequests();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  if (loading) return <div className="p-10 text-center">Yuklanmoqda...</div>;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="text-primary-500" size={32} /> Filiallar So'rovlari
          </h1>
          <p className="text-slate-600 mt-1">Filiallardan kelgan tovar so'rovlarini ko'rib chiqing</p>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800">Yangi so'rovlar yo'q</h3>
          <p className="text-slate-500 mt-2">Barcha filiallar ta'minlangan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingRequests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{req.branch?.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock size={14}/> {format(new Date(req.createdAt), 'dd MMMM, HH:mm', { locale: uz })}
                  </p>
                </div>
                <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                  Kutmoqda
                </span>
              </div>

              <div className="py-4 border-y border-slate-100 mb-4">
                <p className="text-sm text-slate-500 mb-1">So'ralayotgan mahsulot:</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">{req.requestedQuantity}</span>
                  <span className="text-sm font-medium text-slate-600 mb-1">{req.product?.measurementUnit}</span>
                  <span className="text-lg font-bold text-primary-600 ml-2">{req.product?.name}</span>
                </div>
                {req.notes && (
                  <div className="mt-3 bg-slate-50 p-3 rounded-lg text-sm text-slate-700 border border-slate-100 italic">
                    "{req.notes}"
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">So'radi: {req.requestedBy?.name}</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleReject(req.id)}
                  className="flex-1 btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200"
                >
                  <XCircle size={18} /> Rad etish
                </button>
                <button 
                  onClick={() => handleApprove(req.id)}
                  className="flex-1 btn-primary bg-emerald-500 hover:bg-emerald-600"
                >
                  <CheckCircle2 size={18} /> Tasdiqlash
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tarix */}
      {historyRequests.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4">So'rovlar tarixi</h2>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-6 py-3">Sana</th>
                  <th className="px-6 py-3">Filial</th>
                  <th className="px-6 py-3">Mahsulot</th>
                  <th className="px-6 py-3 text-right">Miqdor</th>
                  <th className="px-6 py-3 text-center">Holati</th>
                  <th className="px-6 py-3">Kim ko'rdi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(req.createdAt), 'dd.MM.yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.branch?.name}</td>
                    <td className="px-6 py-4 text-slate-800">{req.product?.name}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {req.requestedQuantity} <span className="font-normal text-xs text-slate-500">{req.product?.measurementUnit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {req.status === 'approved' ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full text-xs font-bold">Tasdiqlangan</span>
                      ) : (
                        <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs font-bold">Rad etilgan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {req.approvedBy?.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
