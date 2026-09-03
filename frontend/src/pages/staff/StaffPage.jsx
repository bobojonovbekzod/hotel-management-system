import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Building2, UserPlus, Users, Edit2, ShieldCheck, UserCog, User, Printer, Image as ImageIcon, Upload, Eye, EyeOff, Wallet, Trash2, Headset } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';
import { FinanceActionModal } from '../owner/PayrollPage';

const roleConfig = {
  director: { label: 'Direktor', icon: ShieldCheck, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  supervisor: { label: 'Nazoratchi', icon: UserCog, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  admin: { label: 'Admin', icon: UserCog, color: 'text-primary-400 bg-primary-500/10 border-primary-500/20' },
  operator: { label: 'Call Operator', icon: Headset, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  hr: { label: 'HR Menejer', icon: Users, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  investor: { label: 'Investor', icon: UserCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  cleaner: { label: 'Tozalik xodimi', icon: User, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

const emptyForm = {
  name: '', username: '', password: '', role: 'admin',
  phone: '', salary: '', salaryType: 'static', kpiPercentage: '', investorSharePercentage: '', branchId: '',
  birthDate: '', gender: '', telegram: ''
};

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceUser, setFaceUser] = useState(null);
  const [faceImageBase64, setFaceImageBase64] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingFace, setUploadingFace] = useState(false);

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeUser, setFinanceUser] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, user: null });

  useEffect(() => {
    fetchStaff();
    if (['owner', 'supervisor', 'hr'].includes(user?.role)) fetchBranches();
  }, [filterBranch, filterRole]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBranch) params.branchId = filterBranch;
      if (filterRole) params.role = filterRole;
      const res = await api.get('/users', { params });
      setStaff(res.data.data);
    } catch {
      toast.error('Xodimlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data);
    } catch { }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.data);
      if (res.data.data.length > 0) setSelectedDevice(res.data.data[0].id);
    } catch { }
  };

  const openFinanceModal = (u) => {
    setFinanceUser(u);
    setShowFinanceModal(true);
  };

  const openFaceModal = (u) => {
    setFaceUser(u);
    setFaceImageBase64('');
    setPhotoFile(null);
    setShowFaceModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          setFaceImageBase64(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      toast.error('Rasm yuklang');
      return;
    }
    setUploadingFace(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      await api.post(`/users/${faceUser.id}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Rasm saqlandi!');
      setShowFaceModal(false);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Yuklashda xatolik');
    } finally {
      setUploadingFace(false);
    }
  };

  const handleFaceDelete = async () => {
    if (!window.confirm('Rostdan ham ushbu xodimning rasmini o\'chirib tashlamoqchimisiz?')) return;
    try {
      setUploadingFace(true);
      await api.delete(`/users/${faceUser.id}/photo`);
      toast.success('Rasm o\'chirildi');
      setShowFaceModal(false);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setUploadingFace(false);
    }
  };

  const openAdd = () => {
    setEditUser(null);
    setForm({
      ...emptyForm,
      branchId: user?.role === 'director' ? String(user.branchId) : '',
    });
    setShowForm(true);
  };

  const handleEdit = (userItem) => {
    setEditUser(userItem.id);
    setForm({
      name: userItem.name,
      username: userItem.username,
      password: '',
      role: userItem.role,
      phone: userItem.phone || '',
      salary: userItem.salary || '',
      salaryType: userItem.salaryType || 'static',
      kpiPercentage: userItem.kpiPercentage || '',
      branchId: userItem.branch?.id ? String(userItem.branch.id) : '',
      birthDate: userItem.birthDate ? new Date(userItem.birthDate).toISOString().split('T')[0] : '',
      gender: userItem.gender || '',
      telegram: userItem.telegram || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username) {
      toast.error('Ism va username shart!');
      return;
    }
    if (!editUser && !form.password) {
      toast.error('Yangi xodim uchun parol kiritilishi shart!');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        username: form.username,
        role: form.role,
        phone: form.phone ? form.phone.replace(/\s+/g, '') : '',
        salary: form.salary,
        salaryType: form.salaryType,
        kpiPercentage: form.kpiPercentage,
        investorSharePercentage: form.investorSharePercentage ? parseFloat(form.investorSharePercentage) : 0,
        branchId: form.branchId || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        telegram: form.telegram || undefined,
      };
      if (form.password) payload.password = form.password;

      if (editUser) {
        await api.put(`/users/${editUser}`, payload);
        toast.success('Xodim ma\'lumotlari yangilandi!');
      } else {
        await api.post('/users', payload);
        toast.success('Yangi xodim qo\'shildi!');
      }
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Xodim faolsizlantirildi' : 'Xodim faollashtirildi');
      fetchStaff();
    } catch {
      toast.error('Xato');
    }
  };

  const handleDeleteClick = (u) => {
    setConfirmDialog({ isOpen: true, user: u });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${confirmDialog.user.id}`);
      toast.success('Xodim o\'chirildi');
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setConfirmDialog({ isOpen: false, user: null });
    }
  };

  const grouped = {};
  staff.forEach((u) => {
    const bn = u.branch?.name || 'Bosh ofis';
    if (!grouped[bn]) grouped[bn] = [];
    grouped[bn].push(u);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-primary-400" /> Xodimlar
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">{staff.length} ta xodim mavjud</p>
        </div>
        <div className="flex gap-3">

          {['owner', 'hr'].includes(user?.role) && (
            <button id="add-staff-btn" onClick={openAdd} className="btn-primary">
              <UserPlus size={18} /> Yangi xodim qo'shish
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['owner', 'supervisor', 'hr'].includes(user?.role) && (
          <select
            className="input-field w-auto min-w-[200px]"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">Barcha filiallar</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <select
          className="input-field w-auto min-w-[150px]"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Barcha rollar</option>
          <option value="director">Direktor</option>
          <option value="supervisor">Nazoratchi</option>
          <option value="admin">Admin</option>
          <option value="cleaner">Tozalik xodimi</option>
        </select>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="card py-16 text-center border-slate-200">
          <Users size={48} className="mx-auto mb-4 text-slate-700" />
          <p className="text-slate-600 font-medium">Xodim topilmadi</p>
          <button onClick={openAdd} className="btn-primary mt-6 mx-auto">
            <UserPlus size={18} /> Birinchi xodimni qo'shish
          </button>
        </div>
      ) : ['owner', 'supervisor', 'hr'].includes(user?.role) ? (
        // Owner/Supervisor: filial bo'yicha guruhlangan
        Object.entries(grouped).map(([branchName, members]) => (
          <div key={branchName} className="card p-0 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-white shadow-sm flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400">
                <Building2 size={18} />
              </div>
              <h3 className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                {branchName}
                <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                  {members.length} ta
                </span>
              </h3>
            </div>
            <div className="p-4">
              <StaffTable
                staff={members}
                onEdit={['owner', 'supervisor', 'hr'].includes(user?.role) ? handleEdit : null}
                onToggle={['owner', 'supervisor', 'hr'].includes(user?.role) ? handleToggleActive : null}
                onFaceId={['owner', 'supervisor', 'hr'].includes(user?.role) ? openFaceModal : null}
                onFinance={['owner', 'director'].includes(user?.role) ? openFinanceModal : null}
                onDelete={['owner', 'hr'].includes(user?.role) ? handleDeleteClick : null}
              />
            </div>
          </div>
        ))
      ) : (
        <div className="card">
          <StaffTable
            staff={staff}
            onEdit={['owner', 'supervisor', 'hr'].includes(user?.role) ? handleEdit : null}
            onToggle={['owner', 'supervisor', 'hr'].includes(user?.role) ? handleToggleActive : null}
            onFaceId={['owner', 'supervisor', 'hr'].includes(user?.role) ? openFaceModal : null}
            onFinance={['owner', 'director'].includes(user?.role) ? openFinanceModal : null}
            onDelete={['owner', 'hr'].includes(user?.role) ? handleDeleteClick : null}
          />
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-content max-w-2xl">
            {submitting && <FullScreenLoader />}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {editUser ? <Edit2 size={20} className="text-primary-400" /> : <UserPlus size={20} className="text-primary-400" />}
                  {editUser ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}
                </h2>
                {editUser && <p className="text-slate-600 text-sm mt-1">@{form.username}</p>}
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">&times;</button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Role selection */}
                <div>
                  <label className="label">Lavozim</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {Object.entries(roleConfig).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({ ...form, role: key })}
                          className={`py-2 px-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${form.role === key
                            ? 'bg-primary-500/10 border-primary-500/50 text-white shadow-sm ring-1 ring-primary-500/30'
                            : 'bg-white shadow-sm border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                          <Icon size={16} className={form.role === key ? 'text-primary-400' : 'text-slate-500'} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Branch (owner/supervisor only) */}
                {['owner', 'supervisor', 'hr'].includes(user?.role) && (
                  <div>
                    <label className="label">Filial {['operator', 'hr'].includes(form.role) ? '(Ixtiyoriy / Barcha filiallar)' : '*'}</label>
                    <select
                      id="staff-branch"
                      className="input-field"
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      required={!['operator', 'hr'].includes(form.role)}
                    >
                      <option value="">{['operator', 'hr'].includes(form.role) ? 'Barcha filiallar (Kompaniya miqyosida)' : 'Filial tanlang'}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Ism familiya *</label>
                    <input
                      id="staff-name"
                      className="input-field"
                      placeholder="Masalan: Malika Rahimova"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Telefon raqami</label>
                    <input
                      className="input-field font-mono"
                      placeholder="+998 90 123 45 67"
                      value={form.phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^\d+]/g, '');
                        if (!val.startsWith('+998')) {
                          val = '+998' + val.replace(/^\+?9?9?8?/, '');
                        }
                        // Format: +998 XX XXX XX XX
                        const numbers = val.replace(/[^\d]/g, '').substring(3);
                        let formatted = '+998';
                        if (numbers.length > 0) formatted += ' ' + numbers.substring(0, 2);
                        if (numbers.length > 2) formatted += ' ' + numbers.substring(2, 5);
                        if (numbers.length > 5) formatted += ' ' + numbers.substring(5, 7);
                        if (numbers.length > 7) formatted += ' ' + numbers.substring(7, 9);
                        setForm({ ...form, phone: formatted });
                      }}
                      maxLength={17}
                    />
                  </div>
                </div>

                {/* HR Info: BirthDate, Gender, Telegram */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Tug'ilgan sana</label>
                    <input
                      type="date"
                      className="input-field"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Jinsi</label>
                    <select
                      className="input-field"
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="">Tanlang</option>
                      <option value="male">Erkak</option>
                      <option value="female">Ayol</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Telegram</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
                      <input
                        className="input-field pl-8"
                        placeholder="username"
                        value={form.telegram ? form.telegram.replace('@', '') : ''}
                        onChange={(e) => setForm({ ...form, telegram: e.target.value ? '@' + e.target.value.replace('@', '') : '' })}
                      />
                    </div>
                  </div>
                </div>

                {/* Username & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Username *</label>
                    <input
                      id="staff-username"
                      className="input-field"
                      placeholder="masalan: admin4"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      disabled={!!editUser}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{editUser ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}</label>
                    <div className="relative">
                      <input
                        id="staff-password"
                        type={showPassword ? 'text' : 'password'}
                        className="input-field pr-12"
                        placeholder={editUser ? 'Bo\'sh qoldiring' : 'Parol kiriting'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                {/* Salary Type & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Oylik turi</label>
                    <select
                      className="input-field"
                      value={form.salaryType}
                      onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
                    >
                      <option value="static">Oylik maosh</option>
                      <option value="per_shift">Kunbay / Smenabay</option>
                      <option value="per_room">Xonabay (faqat tozalash)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      {form.salaryType === 'static' 
                        ? 'Oylik (so\'m)' 
                        : form.salaryType === 'per_shift' 
                          ? 'Kunlik / Smena narxi' 
                          : 'Bitta xona tozalash narxi'}
                    </label>
                    <input
                      id="staff-salary"
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      placeholder={form.salaryType === 'static' ? "Masalan: 3 000 000" : form.salaryType === 'per_shift' ? "Masalan: 100 000" : "Masalan: 10 000"}
                      value={formatNumberInput(form.salary)}
                      onChange={(e) => setForm({ ...form, salary: parseNumberInput(e.target.value) })}
                    />
                  </div>
                </div>
                {/* KPI foizi har doim ko'rinishi kerak (Stavka uchun ham kerak bo'lishi mumkin) */}
                {form.role === 'admin' ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">ℹ️</span>
                    <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                      Adminlar uchun Kassa ulushi (KPI) endi "Filiallar" sahifasida maxsus reja orqali belgilanadi.
                    </p>
                  </div>
                ) : (
                  <div className={`${form.salaryType === 'static' ? 'opacity-50' : ''}`}>
                    <label className="label">Kassadan tushadigan ulush (%)</label>
                    <input
                      type="number"
                      className="input-field disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Masalan: 5"
                      value={form.kpiPercentage}
                      disabled={form.salaryType === 'static'}
                      onChange={(e) => setForm({ ...form, kpiPercentage: e.target.value })}
                    />
                    {form.salaryType === 'static' && (
                      <p className="text-xs text-amber-500 font-medium mt-1">
                        Statik oylik maosh rejimida kassa ulushi yozilmaydi
                      </p>
                    )}
                  </div>
                )}

                {/* Info box for quick password copy */}
                {!editUser && form.username && form.password && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <ShieldCheck size={14} /> Xodimga quyidagi ma'lumotlarni yuboring:
                    </p>
                    <div className="space-y-1 bg-white shadow-sm p-3 rounded-lg border border-emerald-500/10">
                      <p className="text-sm text-slate-800 flex justify-between">
                        <span className="text-slate-600">Sayt:</span>
                        <span className="font-mono text-emerald-300">https://hotelbase.uz/login</span>
                      </p>
                      <p className="text-sm text-slate-800 flex justify-between">
                        <span className="text-slate-600">Username:</span>
                        <span className="font-mono text-emerald-300 font-bold">{form.username}</span>
                      </p>
                      <p className="text-sm text-slate-800 flex justify-between">
                        <span className="text-slate-600">Parol:</span>
                        <span className="font-mono text-emerald-300 font-bold">{form.password}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">
                    Bekor qilish
                  </button>
                  <button
                    id="staff-submit-btn"
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1 justify-center"
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : editUser ? 'Saqlash' : 'Xodimni qo\'shish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showFaceModal && faceUser && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowFaceModal(false)}>
          <div className="modal-content p-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
              <ImageIcon className="text-primary-400" /> Rasm yuklash
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              Xodim: <strong>{faceUser.name}</strong> (@{faceUser.username})
            </p>
            <form onSubmit={handleFaceUpload} className="space-y-4">
              <div>
                <label className="label">Rasm (JPG/PNG)</label>
                <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl text-center hover:border-primary-500 transition-colors">
                  <input type="file" accept="image/jpeg, image/png" onChange={handleImageChange} className="w-full text-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20" required />
                </div>
                {faceImageBase64 && (
                  <div className="mt-4 flex justify-center">
                    <img src={faceImageBase64} alt="Preview" className="w-32 h-32 object-cover rounded-xl border-2 border-primary-500" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 flex-col sm:flex-row">
                <div className="flex gap-3 w-full">
                  <button type="button" onClick={() => setShowFaceModal(false)} className="btn-secondary flex-1">Bekor qilish</button>
                  <button type="submit" disabled={uploadingFace} className="btn-primary flex-1 justify-center">
                    {uploadingFace ? 'Yuklanmoqda...' : <><Upload size={18} /> Yuklash</>}
                  </button>
                </div>
                {faceUser?.photoUrl && (
                  <button type="button" onClick={handleFaceDelete} disabled={uploadingFace} className="px-4 py-2 border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Trash2 size={18} /> O'chirish
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <ConfirmModal
          title="O'chirishni tasdiqlang"
          message={`Siz rostdan ham ${confirmDialog.user?.name} xodimini o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDialog({ isOpen: false, user: null })}
        />
      )}

      {/* Finance Action Modal (Avans / Jarima) */}
      {showFinanceModal && financeUser && (
        <FinanceActionModal
          user={financeUser}
          month={new Date().toISOString().slice(0, 7)}
          onClose={(refresh) => {
            setShowFinanceModal(false);
            setFinanceUser(null);
            if (refresh) fetchStaff();
          }}
          currentUser={user}
        />
      )}
    </div>
  );
}

function StaffTable({ staff, onEdit, onToggle, onFaceId, onFinance, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-th">Xodim</th>
            <th className="table-th">Lavozim</th>
            <th className="table-th">Username</th>
            <th className="table-th">Telefon</th>
            <th className="table-th text-right">Maosh</th>
            <th className="table-th text-center">Holat</th>
            {(onEdit || onToggle || onFaceId || onFinance || onDelete) && (
              <th className="table-th text-right">Amallar</th>
            )}
          </tr>
        </thead>
        <tbody>
          {staff.map((u) => {
            const cfg = roleConfig[u.role] || roleConfig.admin;
            const Icon = cfg.icon;

            const hasPhoto = !!u.photoUrl && u.photoUrl !== 'uploaded_via_base64';
            const backendBaseURL = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : `http://${window.location.hostname}:5000`;
            const photoUrl = hasPhoto ? `${backendBaseURL}${u.photoUrl}` : null;

            return (
              <tr key={u.id} className="table-row group">
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-inner"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none'; // hide broken img
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[13px] font-bold text-slate-800 shadow-inner">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      {u.isFaceRegistered && (
                        <span
                          className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900"
                          title="Face ID faol"
                        />
                      )}
                    </div>
                    <span className="font-semibold text-slate-900 tracking-tight">{u.name}</span>
                  </div>
                </td>
                <td className="table-td">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold border ${cfg.color}`}>
                    <Icon size={12} /> {cfg.label}
                  </span>
                </td>
                <td className="table-td">
                  <span className="font-mono text-[13px] font-medium text-slate-600">
                    @{u.username}
                  </span>
                </td>
                <td className="table-td text-slate-600 font-medium text-sm">{u.phone || '—'}</td>
                <td className="table-td text-right">
                  {u.salaryType === 'per_shift' ? (
                    <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">Kunbay/Smenabay</span>
                  ) : u.salaryType === 'per_room' ? (
                    <span className="inline-flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-xs font-medium border border-purple-100">Xonabay</span>
                  ) : u.salary ? (
                    <span className="text-slate-900 font-semibold">{Number(u.salary).toLocaleString('ru-RU').replace(/,/g, ' ')} <span className="text-xs font-medium text-slate-600">so'm</span></span>
                  ) : '—'}
                </td>
                <td className="table-td text-center">
                  {onToggle ? (
                    <button
                      onClick={() => onToggle(u)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${u.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                        }`}
                      title={u.isActive ? 'Faolsizlantirish uchun bosing' : 'Faollashtirish uchun bosing'}
                    >
                      {u.isActive ? 'Faol' : 'Nofaol'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${u.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                      {u.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  )}
                </td>
                {(onEdit || onToggle || onFaceId || onFinance || onDelete) && (
                  <td className="table-td text-right">
                    {onFaceId && (
                    <button
                      onClick={() => onFaceId(u)}
                      className={`mr-2 p-1.5 rounded-lg transition-colors ${u.photoUrl ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-primary-400 hover:bg-primary-500/10'}`}
                      title="Rasm yuklash"
                    >
                      <ImageIcon size={16} />
                    </button>
                  )}
                  {onFinance && (
                    <button
                      onClick={() => onFinance(u)}
                      className="text-slate-600 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-indigo-500/10 mr-2"
                      title="Moliya (Oylik va jarimalar)"
                    >
                      <Wallet size={16} />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(u)}
                      className="text-slate-600 hover:text-primary-400 transition-colors p-1.5 rounded-lg hover:bg-primary-500/10 mr-2"
                      title="Tahrirlash"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(u)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PayrollModal({ staff, branchName, onClose }) {
  const currentMonth = new Date().toLocaleString('uz-UZ', { month: 'long', year: 'numeric' });
  return (
    <div className="fixed inset-0 z-[100] bg-white text-black overflow-y-auto print-area print:bg-white print:text-black">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h2 className="text-xl font-bold text-slate-900">Maosh tarqatish varaqasi</h2>
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
              <Printer size={18} /> Chop etish
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl font-medium transition-colors shadow-sm">
              Yopish
            </button>
          </div>
        </div>

        <div className="text-center mb-6 text-black">
          <h1 className="text-2xl font-bold uppercase underline">Maosh tarqatish qaydnomasi</h1>
          <p className="text-lg mt-3 font-medium">Filial: <span className="font-bold">{branchName}</span></p>
          <p className="text-md mt-1">Davr: <span className="font-bold capitalize">{currentMonth}</span></p>
        </div>

        <table className="w-full border-collapse border border-black text-[13px] text-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2.5 w-12 text-center font-bold">T/R</th>
              <th className="border border-black p-2.5 text-left font-bold">F.I.O</th>
              <th className="border border-black p-2.5 text-left font-bold">Lavozimi</th>
              <th className="border border-black p-2.5 text-right font-bold w-40">Belgilangan maosh</th>
              <th className="border border-black p-2.5 text-right font-bold w-40">Berilgan summa</th>
              <th className="border border-black p-2.5 w-32 text-center font-bold">Imzo</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u, idx) => {
              const cfg = roleConfig[u.role] || roleConfig.admin;
              return (
                <tr key={u.id}>
                  <td className="border border-black p-2.5 text-center font-medium">{idx + 1}</td>
                  <td className="border border-black p-2.5 font-bold uppercase">{u.name}</td>
                  <td className="border border-black p-2.5">{cfg.label}</td>
                  <td className="border border-black p-2.5 text-right font-bold">
                    {u.salary ? Number(u.salary).toLocaleString() + " so'm" : "—"}
                  </td>
                  <td className="border border-black p-2.5"></td>
                  <td className="border border-black p-2.5"></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-16 flex justify-between items-end text-black">
          <div className="text-center">
            <div className="w-48 border-b border-black mb-2"></div>
            <p className="text-sm font-semibold">Tashkilot rahbari (M.O')</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-black mb-2"></div>
            <p className="text-sm font-semibold">Buxgalter / Kassa</p>
          </div>
        </div>
      </div>
    </div>
  );
}


