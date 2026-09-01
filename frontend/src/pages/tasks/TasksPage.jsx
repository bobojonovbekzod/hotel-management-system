import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  CheckSquare, Plus, Clock, CheckCircle2, Circle, Filter, 
  Trash2, X
} from 'lucide-react';
import { format } from 'date-fns';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  
  // Filters
  const [filterBranch, setFilterBranch] = useState(user?.role !== 'owner' ? user?.branchId || '' : '');

  // Forms
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    branchId: '',
    assigneeId: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchTasks();
    if (user?.role === 'owner') {
      fetchBranches();
    }
    fetchUsers();
  }, [filterBranch]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = filterBranch ? `/tasks?branchId=${filterBranch}` : '/tasks';
      const res = await api.get(url);
      setTasks(res.data.data);
    } catch (err) {
      toast.error('Vazifalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data);
    } catch (err) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers(res.data.data);
    } catch (err) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.branchId || !form.assigneeId) {
      return toast.error("Majburiy maydonlarni to'ldiring");
    }
    try {
      await api.post('/tasks', form);
      toast.success('Vazifa yaratildi');
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', branchId: '', assigneeId: '', dueDate: '' });
      fetchTasks();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Haqiqatan ham o`chirasizmi?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('O`chirildi');
      fetchTasks();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success("Holat o'zgardi");
      // Local yangilash
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      toast.error('Ruxsat etilmagan harakat yoki xatolik');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    const task = tasks.find(t => t.id === parseInt(taskId));
    
    // Check permission (Owner, Branch Director/Supervisor, Assignee, Creator)
    const canMoveTask = user?.role === 'owner' || 
      ['director', 'supervisor'].includes(user?.role) || 
      task?.assigneeId === user?.id || 
      task?.creatorId === user?.id;

    if (task && task.status !== newStatus) {
      if (canMoveTask) {
        handleStatusChange(parseInt(taskId), newStatus);
      } else {
        toast.error("Vazifa holatini o'zgartirishga ruxsat yo'q!");
      }
    }
  };

  // Render bitta ustun
  const renderColumn = (title, status, icon, iconColor, bgColor) => {
    const colTasks = tasks.filter(t => t.status === status);
    
    return (
      <div 
        className={`flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden min-h-[500px] ${bgColor}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {React.cloneElement(icon, { className: iconColor, size: 20 })}
            {title}
          </h3>
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">
            {colTasks.length}
          </span>
        </div>
        
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          {colTasks.map(task => (
            <div 
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative"
            >
              {user?.role === 'owner' && (
                <button 
                  onClick={() => handleDelete(task.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              )}
              
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                  task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                  task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {task.priority}
                </span>
                {task.branch && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{task.branch.name}</span>}
              </div>

              <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
              
              {task.description && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">{task.description}</p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]" title={`Ijrachi: ${task.assignee?.name}`}>
                    {task.assignee?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="truncate max-w-[80px]">{task.assignee?.name || 'Xodim'}</span>
                </div>
                
                {task.dueDate && (
                  <div className={`flex items-center gap-1 text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                    <Clock size={14} />
                    {format(new Date(task.dueDate), 'dd MMM')}
                  </div>
                )}
              </div>

              {/* Mobile / Touchscreen Quick Status Switcher */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Holati:</span>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="TODO">⏳ Bajarilishi kerak</option>
                  <option value="IN_PROGRESS">🔄 Jarayonda</option>
                  <option value="DONE">✅ Bajarildi</option>
                </select>
              </div>
            </div>
          ))}

          {colTasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl m-2">
              Vazifalar yo'q
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <CheckSquare className="text-indigo-500" size={32} /> Vazifalar (Tasks)
          </h1>
          <p className="text-slate-600 mt-1">Xodimlar uchun vazifalarni boshqarish va nazorat qilish</p>
        </div>

        {user?.role === 'owner' && (
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} /> Yangi Vazifa
          </button>
        )}
      </div>

      {/* Filters - Faqat owner uchun */}
      {user?.role === 'owner' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium mr-2">
            <Filter size={18} className="text-indigo-500" /> Filtrlar:
          </div>
          
          <select 
            className="input-field max-w-[200px] text-sm"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">Barcha filiallar</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderColumn('Bajarilishi kerak', 'TODO', <Circle />, 'text-slate-400', 'hover:bg-slate-100/50')}
        {renderColumn('Jarayonda', 'IN_PROGRESS', <Clock />, 'text-amber-500', 'hover:bg-amber-50/50')}
        {renderColumn('Bajarildi', 'DONE', <CheckCircle2 />, 'text-emerald-500', 'hover:bg-emerald-50/50')}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content w-full max-w-lg p-0 bg-white overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Yangi vazifa berish</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div>
                <label className="label">Vazifa nomi *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Masalan: Santexnik chaqirish"
                  required
                />
              </div>

              <div>
                <label className="label">Tavsif (Batafsil)</label>
                <textarea 
                  className="input-field min-h-[100px]" 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Vazifa haqida to'liq ma'lumot..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Filial *</label>
                  <select 
                    className="input-field"
                    value={form.branchId}
                    onChange={e => setForm({...form, branchId: e.target.value})}
                    required
                  >
                    <option value="">Tanlang...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Xodimga biriktirish *</label>
                  <select 
                    className="input-field"
                    value={form.assigneeId}
                    onChange={e => setForm({...form, assigneeId: e.target.value})}
                    required
                    disabled={!form.branchId}
                  >
                    <option value="">Tanlang...</option>
                    {allUsers.filter(u => u.branch?.id === parseInt(form.branchId)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Muhimligi</label>
                  <select 
                    className="input-field"
                    value={form.priority}
                    onChange={e => setForm({...form, priority: e.target.value})}
                  >
                    <option value="LOW">Past</option>
                    <option value="MEDIUM">O'rta</option>
                    <option value="HIGH">Yuqori</option>
                    <option value="URGENT">Shoshilinch!</option>
                  </select>
                </div>

                <div>
                  <label className="label">Muddat (Muddati)</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={form.dueDate}
                    onChange={e => setForm({...form, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary">Yaratish va Yuborish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
