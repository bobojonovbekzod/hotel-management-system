import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Trash2, Server, Key, Network } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function DevicesPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    port: '80',
    username: 'admin',
    password: '',
    branchId: ''
  });

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.data);
    } catch (error) {
      toast.error('Qurilmalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    if (user?.role === 'owner') {
      api.get('/branches').then(res => setBranches(res.data.data)).catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (user.role !== 'owner') payload.branchId = user.branchId;
      else if (!payload.branchId) {
        toast.error("Filialni tanlash majburiy");
        return;
      }
      
      await api.post('/devices', payload);
      toast.success("Qurilma qo'shildi");
      setShowModal(false);
      fetchDevices();
      setFormData({ name: '', ipAddress: '', port: '80', username: 'admin', password: '' });
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/devices/${confirmDialog.id}`);
      toast.success("O'chirildi");
      fetchDevices();
    } catch (error) {
      toast.error("O'chirishda xatolik");
    } finally {
      setConfirmDialog({ isOpen: false, id: null });
    }
  };

  if (loading) return <div className="text-center p-10 text-slate-400">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="text-primary-400" /> Face ID Qurilmalari
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hikvision qurilmalarini tarmoqqa ulash</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={18} /> Qurilma qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map(device => (
          <div key={device.id} className="card border-primary-500/20 bg-primary-500/5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{device.name}</h3>
                  <span className="text-xs font-semibold text-primary-400 px-2 py-0.5 rounded bg-primary-500/20">
                    Hikvision
                  </span>
                </div>
              </div>
              <button onClick={() => setConfirmDialog({ isOpen: true, id: device.id })} className="text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="space-y-2 mt-6">
              <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 p-2 rounded-lg">
                <Network size={16} className="text-slate-500" />
                <span className="text-slate-400 w-16">IP Manzil:</span>
                <span className="font-mono">{device.ipAddress}:{device.port}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 p-2 rounded-lg">
                <Key size={16} className="text-slate-500" />
                <span className="text-slate-400 w-16">Login:</span>
                <span className="font-mono">{device.username}</span>
              </div>
            </div>
          </div>
        ))}

        {devices.length === 0 && (
          <div className="col-span-full card py-12 text-center text-slate-400 border-dashed border-slate-700">
            Hali hech qanday qurilma ulanmagan
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content p-6">
            <h2 className="text-xl font-bold text-white mb-4">Qurilma qo'shish</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Qurilma nomi (Masalan: Asosiy eshik)</label>
                <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              {user?.role === 'owner' && (
                <div>
                  <label className="label">Filial *</label>
                  <select required className="input-field" value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})}>
                    <option value="">Filialni tanlang...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="label">IP Manzil (Local IP)</label>
                  <input required className="input-field" placeholder="192.168.1.x" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} />
                </div>
                <div>
                  <label className="label">Port</label>
                  <input required type="number" className="input-field" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Login</label>
                  <input required className="input-field" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div>
                  <label className="label">Parol</label>
                  <input required type="password" className="input-field" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDialog.isOpen && (
        <ConfirmModal 
          title="Uskunani o'chirish"
          message="Rostdan ham uskunani o'chirmoqchimisiz?"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
        />
      )}
    </div>
  );
}
