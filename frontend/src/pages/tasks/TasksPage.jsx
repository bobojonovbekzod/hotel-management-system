import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  CheckSquare, Plus, Clock, CheckCircle2, Circle, Filter, 
  Trash2, X, Image as ImageIcon, Camera, UploadCloud, Eye,
  Maximize2, MessageSquare, AlertCircle, Calendar, User, 
  Building, Check, ArrowRight, FileText
, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Helper to resolve backend image URLs
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads')) {
    return `/api${url}`;
  }
  if (url.startsWith('/api/uploads')) {
    return url;
  }
  return `/api/uploads/${url}`;
};

// Canvas-based client-side image compressor
const compressImageFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Filters
  const [filterBranch, setFilterBranch] = useState(user?.role !== 'owner' ? user?.branchId || '' : '');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // Detail view modal
  const [completionTask, setCompletionTask] = useState(null); // Prompt when moving to DONE
  const [lightboxImage, setLightboxImage] = useState(null); // Full-screen zoom

  // Create Form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    branchId: '',
    assigneeId: '',
    dueDate: '',
    taskImage: null,
    taskImagePreview: null,
    isPhotoRequired: false
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const createTaskFileRef = useRef(null);

  // Completion modal form state
  const [completionForm, setCompletionForm] = useState({
    resultImage: null,
    resultImagePreview: null,
    resultComment: '',
    submitting: false
  });
  const completionFileRef = useRef(null);

  // Detail modal additional upload state
  const [detailResultImage, setDetailResultImage] = useState(null);
  const [detailResultPreview, setDetailResultPreview] = useState(null);
  const [detailResultComment, setDetailResultComment] = useState('');
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const detailFileRef = useRef(null);

  const canCreate = ['owner', 'director', 'supervisor', 'admin'].includes(user?.role);

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
      setTasks(res.data.data || []);
    } catch (err) {
      toast.error('Vazifalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data || []);
    } catch (err) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers(res.data.data || []);
    } catch (err) {}
  };

  // Handle task image selection in create modal
  const handleCreateImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setCreateForm(prev => ({
        ...prev,
        taskImage: compressed,
        taskImagePreview: compressed
      }));
    } catch (err) {
      toast.error('Rasmni yuklashda xatolik');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.branchId || !createForm.assigneeId) {
      return toast.error("Majburiy maydonlarni to'ldiring");
    }
    setCreateSubmitting(true);
    try {
      await api.post('/tasks', {
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
        branchId: createForm.branchId,
        assigneeId: createForm.assigneeId,
        dueDate: createForm.dueDate || null,
        taskImage: createForm.taskImage,
        isPhotoRequired: createForm.isPhotoRequired
      });
      toast.success('Vazifa yaratildi va biriktirildi');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        branchId: '',
        assigneeId: '',
        dueDate: '',
        taskImage: null,
        taskImagePreview: null,
        isPhotoRequired: false
      });
      fetchTasks();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Haqiqatan ham bu vazifani o`chirasizmi?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Vazifa o`chirildi');
      if (selectedTask?.id === id) setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  // Core status update logic
  const updateTaskStatus = async (taskId, newStatus, extraData = {}) => {
    try {
      const payload = { status: newStatus, ...extraData };
      const res = await api.put(`/tasks/${taskId}`, payload);
      toast.success("Holat yangilandi");
      
      const updated = res.data.data;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => ({ ...prev, ...updated }));
      }
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ruxsat etilmagan harakat yoki xatolik');
      return false;
    }
  };

  // Status transition handler with DONE confirmation prompt
  const handleStatusChangeRequest = (task, newStatus) => {
    if (task.status === newStatus) return;

    if (newStatus === 'DONE') {
      // If result image already attached, just update
      if (task.resultImageUrl) {
        updateTaskStatus(task.id, 'DONE');
      } else {
        // Open completion prompt modal
        setCompletionTask(task);
        setCompletionForm({
          resultImage: null,
          resultImagePreview: null,
          resultComment: '',
          submitting: false
        });
      }
    } else {
      updateTaskStatus(task.id, newStatus);
    }
  };

  // Completion modal handlers
  const handleCompletionImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setCompletionForm(prev => ({
        ...prev,
        resultImage: compressed,
        resultImagePreview: compressed
      }));
    } catch (err) {
      toast.error('Rasmni yuklashda xatolik');
    }
  };

  const handleCompleteWithImage = async () => {
    if (!completionTask) return;
    setCompletionForm(prev => ({ ...prev, submitting: true }));
    const success = await updateTaskStatus(completionTask.id, 'DONE', {
      resultImage: completionForm.resultImage,
      resultComment: completionForm.resultComment
    });
    setCompletionForm(prev => ({ ...prev, submitting: false }));
    if (success) {
      setCompletionTask(null);
    }
  };

  const handleCompleteWithoutImage = async () => {
    if (!completionTask) return;
    setCompletionForm(prev => ({ ...prev, submitting: true }));
    const success = await updateTaskStatus(completionTask.id, 'DONE');
    setCompletionForm(prev => ({ ...prev, submitting: false }));
    if (success) {
      setCompletionTask(null);
    }
  };

  // Detail Modal: Save result image / comment
  const handleDetailImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setDetailResultImage(compressed);
      setDetailResultPreview(compressed);
    } catch (err) {
      toast.error('Rasmni yuklashda xatolik');
    }
  };

  const handleSaveDetailResult = async () => {
    if (!selectedTask) return;
    setDetailSubmitting(true);
    const success = await updateTaskStatus(selectedTask.id, selectedTask.status, {
      resultImage: detailResultImage,
      resultComment: detailResultComment || selectedTask.resultComment
    });
    setDetailSubmitting(false);
    if (success) {
      setDetailResultImage(null);
      setDetailResultPreview(null);
      setDetailResultComment('');
      toast.success('Natija rasmi saqlandi');
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
    
    // Check permission
    const canMoveTask = user?.role === 'owner' || 
      ['director', 'supervisor', 'admin'].includes(user?.role) || 
      task?.assigneeId === user?.id || 
      task?.creatorId === user?.id;

    if (task && task.status !== newStatus) {
      if (canMoveTask) {
        handleStatusChangeRequest(task, newStatus);
      } else {
        toast.error("Vazifa holatini o'zgartirishga ruxsat yo'q!");
      }
    }
  };

  // Render Kanban Column
  const renderColumn = (title, status, icon, iconColor, bgColor, headerBorder) => {
    const colTasks = tasks.filter(t => t.status === status);
    
    return (
      <div 
        className={`flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200/80 overflow-hidden min-h-[550px] shadow-sm ${bgColor}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className={`p-4 border-b ${headerBorder} bg-white shadow-xs flex justify-between items-center sticky top-0 z-10`}>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {React.cloneElement(icon, { className: iconColor, size: 20 })}
            {title}
          </h3>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200">
            {colTasks.length}
          </span>
        </div>
        
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          {colTasks.map(task => {
            const hasTaskImg = !!task.taskImageUrl;
            const hasResultImg = !!task.resultImageUrl;

            return (
              <div 
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => setSelectedTask(task)}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative"
              >
                {/* Delete button for owner */}
                {user?.role === 'owner' && (
                  <button 
                    onClick={(e) => handleDelete(task.id, e)}
                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                    title="Vazifani o'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                {/* Priority & Branch & Photo Required badges */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {task.priority === 'URGENT' ? '🔥 Shoshilinch' :
                     task.priority === 'HIGH' ? '⚡ Yuqori' :
                     task.priority === 'MEDIUM' ? 'O`rta' : 'Past'}
                  </span>
                  {task.isPhotoRequired && (
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      📸 Rasm majburiy
                    </span>
                  )}
                  {task.branch && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      {task.branch.name}
                    </span>
                  )}
                </div>

                <h4 className="font-semibold text-slate-900 mb-1 leading-snug group-hover:text-indigo-600 transition-colors">
                  {task.title}
                </h4>
                
                {task.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2.5">
                    {task.description}
                  </p>
                )}

                {/* Images Attachment Indicators / Thumbnails */}
                {(hasTaskImg || hasResultImg) && (
                  <div className="flex items-center gap-2 my-2.5 pt-2 border-t border-slate-100">
                    {hasTaskImg && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ url: getImageUrl(task.taskImageUrl), title: `Topshiriq rasmi: ${task.title}` });
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-medium border border-amber-200 transition-colors cursor-pointer"
                        title="Topshiriq rasmini ko'rish"
                      >
                        <ImageIcon size={13} className="text-amber-600" />
                        <span>Topshiriq rasmi</span>
                      </div>
                    )}
                    {hasResultImg && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ url: getImageUrl(task.resultImageUrl), title: `Natija rasmi: ${task.title}` });
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-medium border border-emerald-200 transition-colors cursor-pointer"
                        title="Natija rasmini ko'rish"
                      >
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>Natija rasmi</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Assignee & Due Date */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shadow-xs">
                      {task.assignee?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="truncate max-w-[100px] text-xs font-medium">{task.assignee?.name || 'Xodim'}</span>
                  </div>
                  
                  {task.dueDate && (
                    <div className={`flex items-center gap-1 text-[11px] ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-bold' : 'text-slate-500 font-medium'}`}>
                      <Clock size={12} />
                      {format(new Date(task.dueDate), 'dd.MM.yyyy')}
                    </div>
                  )}
                </div>

                {/* Status Switcher */}
                <div 
                  className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-slate-400 font-medium">Holat:</span>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChangeRequest(task, e.target.value)}
                    className="text-xs font-semibold py-1 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="TODO">⏳ Bajarilishi kerak</option>
                    <option value="IN_PROGRESS">🔄 Jarayonda</option>
                    <option value="DONE">✅ Bajarildi</option>
                  </select>
                </div>
              </div>
            );
          })}

          {colTasks.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-200/80 rounded-xl m-2 p-6">
              <span>Vazifalar yo'q</span>
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
            <CheckSquare className="text-indigo-600" size={32} /> Vazifalar (Tasks)
          </h1>
          <p className="text-slate-600 mt-1">Xodimlar uchun vazifalarni boshqarish, topshiriq va natija rasmlari nazorati</p>
        </div>

        {canCreate && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <Plus size={20} /> Yangi Vazifa
          </button>
        )}
      </div>

      {/* Filters - Faqat owner yoki investor uchun */}
      {user?.role === 'owner' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium mr-2 text-sm">
            <Filter size={18} className="text-indigo-500" /> Filtrlar:
          </div>
          
          <select 
            className="input-field max-w-[220px] text-sm"
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
        {renderColumn('Bajarilishi kerak', 'TODO', <Circle />, 'text-slate-400', 'hover:bg-slate-100/50', 'border-slate-200')}
        {renderColumn('Jarayonda', 'IN_PROGRESS', <Clock />, 'text-amber-500', 'hover:bg-amber-50/40', 'border-amber-200')}
        {renderColumn('Bajarildi', 'DONE', <CheckCircle2 />, 'text-emerald-500', 'hover:bg-emerald-50/40', 'border-emerald-200')}
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATE TASK MODAL (Owner/Manager creates task with optional photo) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal-content w-full max-w-xl p-0 bg-white overflow-hidden flex flex-col max-h-[92vh] rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Yangi vazifa berish</h2>
                  <p className="text-xs text-slate-500">Xodimga topshiriq va tushuntiruvchi rasm ilova qiling</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div>
                <label className="label">Vazifa nomi *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={createForm.title}
                  onChange={e => setCreateForm({...createForm, title: e.target.value})}
                  placeholder="Masalan: 204-xonadagi kranni tuzatish"
                  required
                />
              </div>

              <div>
                <label className="label">Tavsif (Batafsil ma'lumot)</label>
                <textarea 
                  className="input-field min-h-[90px]" 
                  value={createForm.description}
                  onChange={e => setCreateForm({...createForm, description: e.target.value})}
                  placeholder="Muammo yoki qilinishi kerak bo'lgan ish tafsilotlari..."
                />
              </div>

              {/* Rasm ilova qilish (Optional image attachment) */}
              <div>
                <label className="label flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera size={16} className="text-indigo-500" />
                    Topshiriq rasmi (ixtiyoriy)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Kamera yoki Galereya</span>
                </label>

                {!createForm.taskImagePreview ? (
                  <div 
                    onClick={() => createTaskFileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center mb-2 transition-colors">
                      <UploadCloud size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Rasm yuklash yoki suratga olish</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Kamchilik yoki namuna rasmini tanlang</span>
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group">
                    <img 
                      src={createForm.taskImagePreview} 
                      alt="Topshiriq rasmi" 
                      className="w-full max-h-48 object-contain bg-slate-900"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLightboxImage({ url: createForm.taskImagePreview, title: 'Topshiriq rasmi' })}
                        className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs"
                        title="Kattalashtirish"
                      >
                        <Maximize2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, taskImage: null, taskImagePreview: null })}
                        className="p-1.5 bg-red-600/80 hover:bg-red-700 text-white rounded-lg backdrop-blur-xs"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={createTaskFileRef} 
                  onChange={handleCreateImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Filial *</label>
                  <select 
                    className="input-field"
                    value={createForm.branchId}
                    onChange={e => setCreateForm({...createForm, branchId: e.target.value, assigneeId: ''})}
                    required
                  >
                    <option value="">Filialni tanlang...</option>
                    {(user?.role === 'owner' ? branches : (branches.length ? branches : (user?.branch ? [user.branch] : []))).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Xodimga biriktirish *</label>
                  <select 
                    className="input-field"
                    value={createForm.assigneeId}
                    onChange={e => setCreateForm({...createForm, assigneeId: e.target.value})}
                    required
                    disabled={!createForm.branchId}
                  >
                    <option value="">Xodimni tanlang...</option>
                    {allUsers.filter(u => u.branch?.id === parseInt(createForm.branchId) || u.branchId === parseInt(createForm.branchId)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Muhimligi</label>
                  <select 
                    className="input-field"
                    value={createForm.priority}
                    onChange={e => setCreateForm({...createForm, priority: e.target.value})}
                  >
                    <option value="LOW">Past</option>
                    <option value="MEDIUM">O'rta</option>
                    <option value="HIGH">Yuqori</option>
                    <option value="URGENT">🔥 Shoshilinch!</option>
                  </select>
                </div>

                <div>
                  <label className="label">Muddati (Oxirgi sana)</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={createForm.dueDate}
                    onChange={e => setCreateForm({...createForm, dueDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Checkbox: Vazifaning bajarilishi rasm bilan tasdiqlansinmi? */}
              <div className="pt-1">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 rounded-xl cursor-pointer transition-all select-none">
                  <input 
                    type="checkbox"
                    checked={createForm.isPhotoRequired}
                    onChange={e => setCreateForm({...createForm, isPhotoRequired: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    📸 Vazifaning bajarilishi rasm bilan tasdiqlansinmi?
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="btn-secondary"
                  disabled={createSubmitting}
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex items-center gap-2"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Vazifani yuborish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPLETION CONFIRMATION MODAL (Prompt when moving to DONE) */}
      {/* ========================================================================= */}
      {completionTask && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCompletionTask(null)}>
          <div className="modal-content w-full max-w-lg p-0 bg-white overflow-hidden flex flex-col rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
                  <CheckCircle2 size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Vazifani yakunlash</h2>
                  <p className="text-xs text-emerald-100">Bajarilgan ish natijasini tasdiqlash</p>
                </div>
              </div>
              <button onClick={() => setCompletionTask(null)} className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-900 text-sm">{completionTask.title}</h4>
                {completionTask.description && (
                  <p className="text-xs text-slate-500 mt-1">{completionTask.description}</p>
                )}
              </div>

              {/* Savol / Taklif */}
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-slate-800">
                  Ushbu vazifaga bajarilganini isbotlovchi natija rasmini ilova qilasizmi?
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Rasm ilova qilsangiz, rahbar va boshqalar natijani ko'ra oladi.
                </p>
              </div>

              {/* Rasm tanlash bloki */}
              {!completionForm.resultImagePreview ? (
                <div 
                  onClick={() => completionFileRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                    <Camera size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">📸 Natija rasmini yuklash / Suratga olish</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Bajarilgan ish rasmini tanlang</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-emerald-200 overflow-hidden bg-slate-900">
                    <img 
                      src={completionForm.resultImagePreview} 
                      alt="Natija rasmi" 
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setCompletionForm(prev => ({ ...prev, resultImage: null, resultImagePreview: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-700 text-white rounded-lg backdrop-blur-xs"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label className="label text-xs">Qisqa izoh (ixtiyoriy)</label>
                    <input 
                      type="text"
                      className="input-field text-xs"
                      placeholder="Masalan: Kranni almashtirdim, hammasi soz ishlamoqda"
                      value={completionForm.resultComment}
                      onChange={(e) => setCompletionForm(prev => ({ ...prev, resultComment: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={completionFileRef} 
                onChange={handleCompletionImageChange} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Tugmalar */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setCompletionTask(null)}
                  disabled={completionForm.submitting}
                  className="px-3.5 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-500 rounded-xl transition-colors whitespace-nowrap order-last sm:order-first"
                >
                  Bekor qilish
                </button>

                {completionForm.resultImagePreview ? (
                  <button 
                    type="button" 
                    onClick={handleCompleteWithImage}
                    disabled={completionForm.submitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Check size={15} /> {completionForm.submitting ? 'Saqlanmoqda...' : 'Rasm bilan yakunlash'}
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={() => completionFileRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Camera size={15} /> Rasm yuklash
                    </button>
                    {!completionTask.isPhotoRequired ? (
                      <button 
                        type="button" 
                        onClick={handleCompleteWithoutImage}
                        disabled={completionForm.submitting}
                        className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <ArrowRight size={15} /> Rasmsiz yakunlash
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-1">
                        ⚠️ Rasm yuklash majburiy!
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TASK DETAIL & FULL VIEW MODAL (Card Click) */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedTask(null)}>
          <div className="modal-content w-full max-w-2xl p-0 bg-white overflow-hidden flex flex-col max-h-[92vh] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start sticky top-0 z-10">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    selectedTask.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                    selectedTask.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    selectedTask.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedTask.priority === 'URGENT' ? '🔥 Shoshilinch' :
                     selectedTask.priority === 'HIGH' ? '⚡ Yuqori' :
                     selectedTask.priority === 'MEDIUM' ? 'O`rta' : 'Past'}
                  </span>
                  
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                    selectedTask.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                    selectedTask.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedTask.status === 'DONE' ? '✅ Bajarildi' :
                     selectedTask.status === 'IN_PROGRESS' ? '🔄 Jarayonda' : '⏳ Bajarilishi kerak'}
                  </span>

                  {selectedTask.branch && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium border border-indigo-100">
                      {selectedTask.branch.name}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
                  {selectedTask.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                {user?.role === 'owner' && (
                  <button 
                    onClick={() => handleDelete(selectedTask.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {/* Tavsif */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} /> Tavsif
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Rasmlar paneli: Topshiriq rasmi va Natija rasmi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Topshiriq rasmi (Oldin / Before) */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon size={15} className="text-amber-500" />
                      1. Topshiriq rasmi (Boshlang'ich)
                    </span>
                  </div>

                  {selectedTask.taskImageUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group cursor-pointer aspect-video flex items-center justify-center">
                      <img 
                        src={getImageUrl(selectedTask.taskImageUrl)} 
                        alt="Topshiriq rasmi"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onClick={() => setLightboxImage({ url: getImageUrl(selectedTask.taskImageUrl), title: `Topshiriq rasmi: ${selectedTask.title}` })}
                      />
                      <div 
                        onClick={() => setLightboxImage({ url: getImageUrl(selectedTask.taskImageUrl), title: `Topshiriq rasmi: ${selectedTask.title}` })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs backdrop-blur-xs"
                      >
                        <Maximize2 size={16} /> Kattalashtirib ko'rish
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[120px] rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                      <ImageIcon size={24} className="mb-1 text-slate-300" />
                      <span>Topshiriq berishda rasm biriktirilmagan</span>
                    </div>
                  )}
                </div>

                {/* 2. Natija rasmi (Keyin / Proof) */}
                <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50/30 flex flex-col">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      2. Natija rasmi (Bajarilgan)
                    </span>
                  </div>

                  {selectedTask.resultImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-emerald-200 bg-slate-900 group cursor-pointer aspect-video flex items-center justify-center">
                        <img 
                          src={getImageUrl(selectedTask.resultImageUrl)} 
                          alt="Natija rasmi"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onClick={() => setLightboxImage({ url: getImageUrl(selectedTask.resultImageUrl), title: `Natija rasmi: ${selectedTask.title}` })}
                        />
                        <div 
                          onClick={() => setLightboxImage({ url: getImageUrl(selectedTask.resultImageUrl), title: `Natija rasmi: ${selectedTask.title}` })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs backdrop-blur-xs"
                        >
                          <Maximize2 size={16} /> Kattalashtirib ko'rish
                        </div>
                      </div>

                      {selectedTask.resultComment && (
                        <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs text-slate-700 flex items-start gap-1.5">
                          <MessageSquare size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span><b>Izoh:</b> {selectedTask.resultComment}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[120px] rounded-lg border border-dashed border-emerald-200 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                      <CheckCircle2 size={24} className="mb-1 text-emerald-300" />
                      <span>Hozircha natija rasmi yuklanmagan</span>
                    </div>
                  )}

                  {/* Natija rasmini keyinchalik yuklash/yangilash bo'limi */}
                  {(selectedTask.assigneeId === user?.id || canCreate) && (
                    <div className="mt-3 pt-3 border-t border-emerald-100">
                      {!detailResultPreview ? (
                        <button
                          type="button"
                          onClick={() => detailFileRef.current?.click()}
                          className="w-full py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Camera size={14} /> {selectedTask.resultImageUrl ? 'Natija rasmini yangilash' : 'Natija rasmini yuklash'}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative rounded-lg overflow-hidden border border-emerald-300">
                            <img src={detailResultPreview} alt="Yangi rasm" className="w-full max-h-32 object-contain bg-slate-900" />
                            <button
                              type="button"
                              onClick={() => { setDetailResultImage(null); setDetailResultPreview(null); }}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <input 
                            type="text"
                            placeholder="Qisqa izoh..."
                            value={detailResultComment}
                            onChange={(e) => setDetailResultComment(e.target.value)}
                            className="input-field text-xs py-1.5"
                          />
                          <button
                            type="button"
                            onClick={handleSaveDetailResult}
                            disabled={detailSubmitting}
                            className="btn-primary w-full py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                          >
                            {detailSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Rasmni saqlash'}
                          </button>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={detailFileRef} 
                        onChange={handleDetailImageChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Ma'lumotlar bloki */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Ijrochi xodim:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <User size={13} className="text-indigo-500" />
                    {selectedTask.assignee?.name || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Topshiriq beruvchi:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <User size={13} className="text-slate-500" />
                    {selectedTask.creator?.name || 'Rahbar'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Muddati:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Calendar size={13} className="text-amber-500" />
                    {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'dd.MM.yyyy') : 'Belgilanmagan'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Berilgan sana:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock size={13} className="text-slate-400" />
                    {selectedTask.createdAt ? format(new Date(selectedTask.createdAt), 'dd.MM.yyyy HH:mm') : '—'}
                  </span>
                </div>
              </div>

              {/* Tezkor holatni o'zgartirish */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">Vazifa holatini o'zgartirish:</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleStatusChangeRequest(selectedTask, 'TODO')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedTask.status === 'TODO' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    ⏳ Bajarilishi kerak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChangeRequest(selectedTask, 'IN_PROGRESS')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedTask.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    🔄 Jarayonda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChangeRequest(selectedTask, 'DONE')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedTask.status === 'DONE' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    ✅ Bajarildi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIGHTBOX / FULL SCREEN IMAGE VIEWER */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
            <a 
              href={lightboxImage.url} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg backdrop-blur-xs transition-colors"
            >
              Yangi oynada ochish
            </a>
            <button 
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-xs transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxImage.url} 
              alt={lightboxImage.title || 'Vazifa rasmi'} 
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            {lightboxImage.title && (
              <p className="text-white/80 text-sm font-medium mt-3 bg-black/50 px-4 py-1.5 rounded-full">
                {lightboxImage.title}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
