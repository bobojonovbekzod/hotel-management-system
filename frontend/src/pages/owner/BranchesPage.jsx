import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Building2, Plus, MapPin, Phone, Users, BedDouble, Edit2, Trash2 } from 'lucide-react';
import FullScreenLoader from '../../components/common/FullScreenLoader';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (error) {
      toast.error('Filiallarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast.error('Nom va manzil kiritilishi shart!');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/branches/${editingId}`, formData);
        if (res.data.success) {
          toast.success('Filial yangilandi!');
        }
      } else {
        const res = await api.post('/branches', formData);
        if (res.data.success) {
          toast.success('Yangi filial qo\'shildi!');
        }
      }
      setIsModalOpen(false);
      fetchBranches();
      setFormData({ name: '', address: '', phone: '' });
      setEditingId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (branch) => {
    setFormData({ name: branch.name, address: branch.address, phone: branch.phone || '' });
    setEditingId(branch.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/branches/${deletingId}`);
      toast.success('Filial o\'chirildi!');
      fetchBranches();
      setDeleteModalOpen(false);
    } catch (error) {
      toast.error('O\'chirishda xatolik yuz berdi');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Filiallar</h1>
            <p className="text-slate-400 text-sm mt-1">Sizning biznesingizdagi barcha mehmonxonalar</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', address: '', phone: '' });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Yangi Filial
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-48">
             <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : branches.length === 0 ? (
          <div className="col-span-full card py-16 text-center border-slate-800 border-dashed bg-slate-900/30">
            <Building2 size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 font-medium text-lg">Hali hech qanday filial qo'shilmagan</p>
            <p className="text-slate-500 text-sm mt-1">Birinchi filiali qo'shish uchun "Yangi Filial" tugmasini bosing.</p>
          </div>
        ) : (
          branches.map(branch => (
            <div key={branch.id} className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-slate-700 transition-colors">
              <div className="p-5 border-b border-slate-800">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400 border border-primary-500/20">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{branch.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${branch.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {branch.isActive ? 'Faol' : 'Faol emas'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(branch)} className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(branch.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-300">{branch.address || 'Manzil ko\'rsatilmagan'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-slate-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-300">{branch.phone || '—'}</span>
                </div>
              </div>

              <div className="p-5 bg-slate-900/40 grid grid-cols-2 gap-4 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                    <BedDouble size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Xonalar</p>
                    <p className="text-lg font-bold text-slate-200 leading-none mt-1">{branch._count?.rooms || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Xodimlar</p>
                    <p className="text-lg font-bold text-slate-200 leading-none mt-1">{branch._count?.users || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            {submitting && <FullScreenLoader />}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="text-primary-400" /> : <Plus className="text-primary-400" />}
                {editingId ? 'Filialni Tahrirlash' : 'Yangi Filial'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Filial Nomi *</label>
                <input
                  required
                  type="text"
                  className="input-field"
                  placeholder="Masalan: Chilonzor Filiali"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Manzili *</label>
                <input
                  required
                  type="text"
                  className="input-field"
                  placeholder="Masalan: Toshkent shahar, Chilonzor tumani..."
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Telefon Raqam</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="+998 90 123 45 67"
                  value={formData.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d+]/g, '');
                    if (!val.startsWith('+998')) {
                      val = '+998' + val.replace(/^\+?9?9?8?/, '');
                    }
                    const numbers = val.replace(/[^\d]/g, '').substring(3);
                    let formatted = '+998';
                    if (numbers.length > 0) formatted += ' ' + numbers.substring(0, 2);
                    if (numbers.length > 2) formatted += ' ' + numbers.substring(2, 5);
                    if (numbers.length > 5) formatted += ' ' + numbers.substring(5, 7);
                    if (numbers.length > 7) formatted += ' ' + numbers.substring(7, 9);
                    setFormData({ ...formData, phone: formatted });
                  }}
                  maxLength={17}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary min-w-[120px] justify-center"
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Saqlash'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteModalOpen(false)}>
          <div className="modal-content max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border-4 border-red-500/20">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Filialni o'chirish</h3>
              <p className="text-slate-400 text-sm">
                Siz rostdan ham ushbu filialni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 flex gap-3 border-t border-slate-800 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn-secondary flex-1"
                disabled={isDeleting}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center h-10"
              >
                {isDeleting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Ha, o'chirish"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
