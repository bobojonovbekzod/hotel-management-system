import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Building2, Plus, Edit2, ShieldCheck, X, Activity, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  
  // Form states for Add
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states for Edit
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubscription, setEditSubscription] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data.data);
    } catch (error) {
      toast.error('Kompaniyalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/companies', {
        companyName,
        ownerName,
        ownerUsername,
        ownerPassword,
        ownerPhone
      });
      toast.success('Yangi kompaniya muvaffaqiyatli yaratildi');
      setShowAddModal(false);
      // Reset form
      setCompanyName('');
      setOwnerName('');
      setOwnerUsername('');
      setOwnerPassword('');
      setOwnerPhone('');
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditIsActive(company.isActive);
    setEditSubscription(company.subscriptionEndsAt ? new Date(company.subscriptionEndsAt).toISOString().split('T')[0] : '');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/companies/${editingCompany.id}`, {
        name: editName,
        isActive: editIsActive,
        subscriptionEndsAt: editSubscription || null
      });
      toast.success('Kompaniya ma\'lumotlari yangilandi');
      setShowEditModal(false);
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const getLicenseStatus = (date) => {
    if (!date) return { label: 'Cheksiz', color: 'text-slate-400 bg-slate-800 border-slate-700' };
    const end = new Date(date);
    const now = new Date();
    if (end < now) return { label: 'Tugagan', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    
    // Less than 7 days
    const diffTime = Math.abs(end - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 7) return { label: 'Yaqinlashmoqda', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    
    return { label: 'Faol', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-primary-400" /> Kompaniyalar (Mijozlar)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Superadmin boshqaruv paneli</p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} /> Yangi Mijoz Qushish
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Yuklanmoqda...</div>
          ) : companies.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Hech qanday kompaniya topilmadi.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="table-th">ID</th>
                  <th className="table-th">Kompaniya Nomi</th>
                  <th className="table-th">Litsenziya muddati</th>
                  <th className="table-th">Filiallar / Xodimlar</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-center">Boshqaruv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {companies.map((company) => {
                  const lic = getLicenseStatus(company.subscriptionEndsAt);
                  return (
                    <tr key={company.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td text-slate-400 font-mono text-xs">#{company.id}</td>
                      <td className="table-td">
                        <div className="font-bold text-white">{company.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Yaratilgan: {format(new Date(company.createdAt), 'dd.MM.yyyy')}
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${lic.color}`}>
                            {lic.label}
                          </span>
                          {company.subscriptionEndsAt && (
                            <span className="text-sm text-slate-300 flex items-center gap-1">
                              <CalendarDays size={14} className="text-slate-500"/>
                              {format(new Date(company.subscriptionEndsAt), 'dd.MM.yyyy')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-td text-slate-400">
                        <span className="text-white font-medium">{company._count.branches}</span> ta filial <br/>
                        <span className="text-white font-medium">{company._count.users}</span> ta xodim
                      </td>
                      <td className="table-td">
                        {company.isActive ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-sm font-medium"><Activity size={14}/>Faol</span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1 text-sm font-medium"><X size={14}/>Bloklangan</span>
                        )}
                      </td>
                      <td className="table-td text-center">
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 rounded-lg transition-colors inline-block"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content w-full max-w-md p-0 bg-slate-900 border border-slate-800">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Yangi mijoz qo'shish</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="label">Kompaniya Nomi</label>
                  <input type="text" required className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="border-t border-slate-800 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Asosiy Owner Ma'lumotlari</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Ismi</label>
                      <input type="text" required className="input-field" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Telefon</label>
                      <input type="text" className="input-field" placeholder="+998901234567" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Login (Username)</label>
                      <input type="text" required className="input-field" value={ownerUsername} onChange={e => setOwnerUsername(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Parol</label>
                      <input type="text" required className="input-field" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Bekor qilish</button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Yaratilmoqda...' : 'Yaratish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCompany && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal-content w-full max-w-sm p-0 bg-slate-900 border border-slate-800">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Kompaniyani Tahrirlash</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="label">Kompaniya Nomi</label>
                  <input type="text" required className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Litsenziya tugash sanasi</label>
                  <input type="date" className="input-field" value={editSubscription} onChange={e => setEditSubscription(e.target.value)} />
                  <p className="text-xs text-slate-500 mt-1">Bo'sh qoldirilsa, litsenziya cheksiz bo'ladi.</p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input 
                    type="checkbox" 
                    id="isActiveCheck"
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-primary-500 focus:ring-primary-500/20"
                    checked={editIsActive}
                    onChange={e => setEditIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Kompaniya faolmi? (Tizimga kirishiga ruxsat)
                  </label>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Bekor qilish</button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
