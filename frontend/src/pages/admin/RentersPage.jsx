import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';
import { CalendarDays, AlertTriangle, ArrowRight, User } from 'lucide-react';
import ManageBookingModal from '../../components/admin/ManageBookingModal';

export default function RentersPage() {
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manageBookingId, setManageBookingId] = useState(null);

  useEffect(() => {
    fetchRenters();
  }, []);

  const fetchRenters = async () => {
    try {
      const res = await api.get('/bookings', { params: { bookingType: 'monthly', status: 'active' } });
      setRenters(res.data.data);
    } catch {
      toast.error("Ijarachilarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = (id) => {
    setManageBookingId(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <CalendarDays size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Oylik Ijarachilar</h1>
          <p className="text-slate-600">Uzoq muddatli yashovchi mijozlar ro'yxati</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-10 text-center text-slate-600">Yuklanmoqda...</div>
        ) : renters.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center">
            <User size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-600">Joriy filialda oylik ijarachilar yo'q.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Xona / Mijoz</th>
                  <th className="table-th">To'langan muddat (Paid until)</th>
                  <th className="table-th text-right">Oylik ijara narxi</th>
                  <th className="table-th text-right">Jami To'langan</th>
                  <th className="table-th text-center">Holat</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {renters.map(r => {
                  const expectedAmount = Number(r.totalPrice || r.monthlyFee || (r.room?.pricePerNight * 30 || 0));
                  const paid = Number(r.paidAmount || 0);
                  const isZeroPaid = paid <= 0;
                  const isPartialPaid = paid > 0 && paid < expectedAmount;
                  const isFullyPaid = paid >= expectedAmount;
                  
                  let rowClass = "border-b border-slate-200 transition-colors duration-150";
                  
                  // Har doim to'lov holatiga qarab rang beramiz (Overstay bo'lishi yoki bo'lmasligidan qat'i nazar)
                  if (isFullyPaid) {
                    rowClass += " bg-emerald-500/10 hover:bg-emerald-500/20";
                  } else if (isPartialPaid) {
                    rowClass += " bg-yellow-500/10 hover:bg-yellow-500/20";
                  } else {
                    rowClass += " bg-red-500/10 hover:bg-red-500/20";
                  }
                  
                  // Agar vaqti tugagan bo'lsa (Overstay), ranglarni biroz to'qroq (ko'zga tashlanadigan) qilamiz
                  if (r.isOverstay) {
                    if (isFullyPaid) rowClass = rowClass.replace('10', '20').replace('20', '30');
                    else if (isPartialPaid) rowClass = rowClass.replace('10', '20').replace('20', '30');
                    else rowClass = rowClass.replace('10', '20').replace('20', '30');
                  }

                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 font-bold border border-slate-300">
                            {r.room?.roomNumber}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{r.primaryGuest?.firstName} {r.primaryGuest?.lastName}</p>
                            <p className="text-xs text-slate-600">{r.primaryGuest?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2 text-sm text-slate-800">
                          <span className={r.isOverstay ? 'text-red-400 font-bold' : 'text-emerald-400 font-medium'}>
                            {format(new Date(r.checkOutExpected), 'dd.MM.yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="table-td text-right font-medium text-slate-800">
                        {r.monthlyFee ? r.monthlyFee.toLocaleString() : (r.room?.pricePerNight * 30 || 0).toLocaleString()} <span className="text-xs text-slate-600">so'm</span>
                      </td>
                      <td className="table-td text-right font-medium text-emerald-400">
                        {r.paidAmount.toLocaleString()} <span className="text-xs text-slate-600 text-emerald-400/50">so'm</span>
                      </td>
                      <td className="table-td text-center">
                        {r.isOverstay ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isFullyPaid ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            <AlertTriangle size={12} /> Muddati o'tgan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500 border border-blue-500/30">
                            Aktiv
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <button 
                          onClick={() => handleManage(r.id)}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Boshqarish
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {manageBookingId && (
        <ManageBookingModal
          bookingId={manageBookingId}
          onClose={() => setManageBookingId(null)}
          onSuccess={() => { setManageBookingId(null); fetchRenters(); }}
        />
      )}
    </div>
  );
}
