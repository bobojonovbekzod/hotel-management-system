import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { 
  WalletCards, 
  Plus, 
  Inbox, 
  Calendar as CalendarIcon, 
  Building2, 
  Tag, 
  ArrowUp,
  ArrowDown,
  X,
  CalendarRange,
  Sun,
  Moon,
  Clock,
  PieChart as PieIcon,
  TrendingDown,
  Briefcase,
  Building,
  ShieldCheck,
  CreditCard,
  Receipt,
  Pencil
} from 'lucide-react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

const CATEGORY_COLORS = [
  '#f43f5e', // rose-500
  '#8b5cf6', // purple-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#64748b'  // slate-500
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';

  // Owner uchun 2 ta Tab: 'branch' (Filial xarajatlari) va 'company' (Kompaniya xarajatlari)
  const [activeTab, setActiveTab] = useState('branch');

  // Company Expenses State (UI Phase)
  const [companyExpenses, setCompanyExpenses] = useState([]);
  const [companyStartDate, setCompanyStartDate] = useState(todayStr);
  const [companyEndDate, setCompanyEndDate] = useState(todayStr);

  // Admin uchun default Bugungi sana; Owner uchun default bo'sh (2-bosqichli)
  const [startDate, setStartDate] = useState(isOwner ? '' : todayStr);
  const [endDate, setEndDate] = useState(isOwner ? '' : todayStr);
  const [selectedBranch, setSelectedBranch] = useState(''); // Default empty
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryBreakdown, setCategoryBreakdown] = useState({});

  // Sorting
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'

  // Form State & Editing State
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({ 
    categoryId: '', 
    branchId: '', 
    paymentSource: 'cash', // 'cash', 'bank', 'transfer'
    amount: '', 
    description: '',
    expenseDate: todayStr
  });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm({
      categoryId: categories.length > 0 ? categories[0].id : '',
      branchId: selectedBranch && selectedBranch !== 'all' ? selectedBranch : '',
      paymentSource: 'cash',
      amount: '',
      description: '',
      expenseDate: todayStr
    });
    setShowForm(true);
  };

  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    const expDate = expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : todayStr;
    setForm({
      categoryId: expense.categoryId || '',
      branchId: expense.branchId ? String(expense.branchId) : '',
      paymentSource: expense.paymentSource || 'cash',
      amount: String(expense.amount || ''),
      description: expense.description || '',
      expenseDate: expDate
    });
    setShowForm(true);
  };


  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isOwner && activeTab === 'company') {
      fetchCompanyExpenses();
    }
  }, [activeTab, companyStartDate, companyEndDate]);

  const fetchCompanyExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses', {
        params: {
          isCompanyExpense: 'true',
          startDate: companyStartDate,
          endDate: companyEndDate
        }
      });
      if (res.data?.success) {
        setCompanyExpenses(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching company expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOwner && user) {
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  }, [user]);

  const isDateSelected = Boolean(startDate && endDate);
  const isBranchSelected = isOwner ? Boolean(selectedBranch) : true;
  const canFetch = isDateSelected && isBranchSelected;

  useEffect(() => {
    if (!canFetch) {
      setExpenses([]);
      setCategoryBreakdown({});
      setLoading(false);
      return;
    }
    fetchExpenses();
  }, [startDate, endDate, selectedBranch, selectedCategory]);

  const fetchInitialData = async () => {
    try {
      const promises = [
        api.get('/expense-categories'),
        isOwner ? Promise.resolve({ data: { data: null } }) : api.get('/shifts/my/active').catch(() => ({ data: { data: null } }))
      ];
      if (isOwner) {
        promises.push(api.get('/branches'));
      }

      const results = await Promise.all(promises);
      const catRes = results[0];
      const shiftRes = results[1];

      setCategories(catRes.data?.data || []);
      if (catRes.data?.data?.length > 0) {
        setForm(prev => ({ ...prev, categoryId: catRes.data.data[0].id }));
      }
      setActiveShift(shiftRes.data?.data);

      if (isOwner && results[2]) {
        setBranches(results[2].data?.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    if (!canFetch) return;

    try {
      setLoading(true);
      const params = {
        startDate: startDate,
        endDate: endDate,
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined
      };

      const res = await api.get('/expenses', { params });
      if (res.data?.success) {
        setExpenses(res.data.data || []);
        setCategoryBreakdown(res.data.categoryBreakdown || {});
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      toast.error('Xarajatlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user?.role === 'admin' && !activeShift) {
      toast.error('Avval smena boshlang!');
      return;
    }

    const parsedAmount = parseFloat(parseNumberInput(form.amount));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Summa kiriting!');
      return;
    }
    if (!form.categoryId) {
      toast.error('Kategoriyani tanlang!');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        amount: parsedAmount,
        description: form.description,
        expenseDate: form.expenseDate,
        branchId: isOwner && form.branchId ? parseInt(form.branchId) : undefined,
        shiftId: activeShift?.id,
        isCompanyExpense: activeTab === 'company',
        paymentSource: form.paymentSource || 'cash'
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
        toast.success('Xarajat muvaffaqiyatli tahrirlandi!');
      } else {
        await api.post('/expenses', payload);
        toast.success('Xarajat muvaffaqiyatli qo\'shildi!');
      }

      setForm(prev => ({ 
        ...prev, 
        amount: '', 
        description: '',
        expenseDate: todayStr 
      }));
      setEditingExpense(null);
      setShowForm(false);
      if (canFetch) {
        fetchExpenses();
      }
      if (isOwner && activeTab === 'company') {
        fetchCompanyExpenses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setSubmitting(false);
    }

  };

  // Sort expenses by shift effective date
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.effectiveDate || a.expenseDate || a.createdAt).getTime();
    const dateB = new Date(b.effectiveDate || b.expenseDate || b.createdAt).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const totalAmount = sortedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Sorted categories by amount descending
  const sortedCategories = Object.entries(categoryBreakdown)
    .map(([name, amount], idx) => ({
      name,
      amount,
      percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0',
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    }))
    .sort((a, b) => b.amount - a.amount);

  const chartData = sortedCategories.map(c => ({
    name: c.name,
    value: c.amount,
    color: c.color
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const pct = totalAmount > 0 ? ((data.value / totalAmount) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }}></span>
            {data.name}
          </p>
          <p className="text-rose-400 font-bold">{data.value.toLocaleString()} so'm</p>
          <p className="text-slate-400 mt-0.5">{pct}% jami xarajatdan</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 shadow-xs">
            <WalletCards size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Xarajatlar</h1>
            <p className="text-slate-500 text-xs">Sana oralig'i va filiallar bo'yicha tahlil</p>
          </div>
        </div>

        <button 
          onClick={() => setShowForm(true)} 
          className="btn-primary flex items-center gap-2 text-sm shadow-xs"
        >
          <Plus size={16} /> Xarajat qo'shish
        </button>
      </div>

      {/* Single Parent Div - Minimalist Text-Only Tabs */}
      {isOwner && (
        <div className="flex items-center gap-6 border-b border-slate-200/80 pb-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('branch')}
            className={`flex items-center gap-2 pb-2.5 transition-colors relative ${
              activeTab === 'branch'
                ? 'text-rose-600 font-bold border-b-2 border-rose-600 -mb-[5px]'
                : 'text-slate-400 hover:text-slate-700 font-medium'
            }`}
          >
            <Building2 size={17} />
            <span>Filiallar xarajatlari</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-2 pb-2.5 transition-colors relative ${
              activeTab === 'company'
                ? 'text-indigo-600 font-bold border-b-2 border-indigo-600 -mb-[5px]'
                : 'text-slate-400 hover:text-slate-700 font-medium'
            }`}
          >
            <Briefcase size={17} />
            <span>Boshqaruv kompaniyasi xarajatlari</span>
          </button>
        </div>
      )}

      {/* 2. Branch Expenses View (Default for Admin & Owner Tab 1) */}
      <div className={!isOwner || activeTab === 'branch' ? 'space-y-6 transition-all duration-200' : 'hidden'}>

      {/* 2. Filter Card */}
      <div className="card p-4">
        <div className={`grid grid-cols-1 ${isOwner ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          
          {/* Step 1: Boshlanish sanasi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                {isOwner && <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>}
                <CalendarIcon size={16} /> Boshlanish sanasi
              </label>
              {startDate && (
                <button 
                  onClick={() => setStartDate('')} 
                  className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-0.5"
                  title="Tozalash"
                >
                  <X size={12} /> tozalash
                </button>
              )}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field font-semibold text-slate-800"
            />
          </div>

          {/* Step 1: Tugash sanasi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                {isOwner && <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>}
                <CalendarIcon size={16} /> Tugash sanasi
              </label>
              {endDate && (
                <button 
                  onClick={() => setEndDate('')} 
                  className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-0.5"
                  title="Tozalash"
                >
                  <X size={12} /> tozalash
                </button>
              )}
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field font-semibold text-slate-800"
            />
          </div>

          {/* Step 2: Filialni tanlang (Owner uchun) */}
          {isOwner && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full ${isDateSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'} text-xs font-bold flex items-center justify-center`}>2</span>
                <Building2 size={16} /> Filialni tanlang
              </label>
              <select
                className={`input-field font-semibold text-slate-800 ${!isDateSelected ? 'bg-slate-50 border-dashed' : ''}`}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">Filialni tanlang...</option>
                <option value="all">Barcha filiallar</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id.toString()}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Kategoriya */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Tag size={16} /> Kategoriya
            </label>
            <select
              className="input-field font-semibold text-slate-800"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Barchasi</option>
              {categories.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 3. Guidance Prompt / Content Area */}
      {!isDateSelected ? (
        <div className="card p-12 text-center text-slate-500 flex flex-col items-center border border-dashed border-slate-300">
          <CalendarRange size={48} className="mb-4 text-blue-300 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            {isOwner ? "1-Qadam: Sana oralig'ini tanlang" : "Sana oralig'ini tanlang"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Xarajatlar hisobotini ko'rish uchun yuqoridan <b>Boshlanish</b> va <b>Tugash</b> sanalarini tanlang.
          </p>
        </div>
      ) : isOwner && !selectedBranch ? (
        <div className="card p-12 text-center text-slate-500 flex flex-col items-center border border-dashed border-slate-300">
          <Building2 size={48} className="mb-4 text-purple-300" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">2-Qadam: Filialni tanlang</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Sana oralig'i tanlandi ({startDate} — {endDate}). Endi xarajatlarni ko'rish uchun filialni yoki <b>"Barcha filiallar"</b>ni tanlang.
          </p>
        </div>
      ) : loading ? (
        <div className="card p-12 text-center text-slate-500">
          Yuklanmoqda...
        </div>
      ) : (
        <div className="space-y-6">
          {/* IXCHAM UMUMIY STATISTIKA QATORI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card p-3.5 bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jami Xarajat</p>
                <p className="text-xl font-bold text-rose-600 mt-0.5">
                  -{totalAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">so'm</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
                <TrendingDown size={20} />
              </div>
            </div>

            <div className="card p-3.5 bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chiqimlar Soni</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {sortedExpenses.length} <span className="text-xs font-normal text-slate-500">ta tranzaksiya</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                #
              </div>
            </div>

            <div className="card p-3.5 bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hisobot Doirasi</p>
                <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                  {isOwner 
                    ? `${selectedBranch === 'all' ? 'Barcha filiallar' : branches.find(b => b.id.toString() === selectedBranch)?.name || 'Filial'}`
                    : 'Filialingiz'
                  }
                </p>
                <p className="text-[11px] text-slate-500">{startDate} — {endDate}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 size={18} />
              </div>
            </div>
          </div>

          {/* KATEGORIYALAR BO'YICHA DIAGRAMMA VA KAMAYISH TARTIBIDAGI TAQSIMOT */}
          {sortedCategories.length > 0 && (
            <div className="card p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PieIcon size={18} className="text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">Kategoriyalar bo'yicha tahlil va taqsimot</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {sortedCategories.length} ta kategoriya (kamayish tartibida)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* 1. Donut Diagramma */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Markazdagi jami ko'rsatkich */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jami</span>
                    <span className="text-sm font-bold text-slate-900">
                      {totalAmount >= 1000000 
                        ? `${(totalAmount / 1000000).toFixed(2)} mln` 
                        : `${totalAmount.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* 2. Kamayish tartibidagi kategoriyalar ro'yxati va progress barlar */}
                <div className="lg:col-span-7 space-y-3">
                  {sortedCategories.map((cat, idx) => (
                    <div 
                      key={cat.name} 
                      className="p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100 group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                          <span className="text-xs font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                            {cat.name}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-600">
                            -{cat.amount.toLocaleString()} so'm
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Proportsional Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Xarajatlar Jadvali */}
          <div className="card p-0 overflow-hidden">
            {sortedExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <Inbox size={48} className="mb-4 text-slate-300" />
                <p>Ushbu oraliq va filial bo'yicha hech qanday xarajat mavjud emas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th 
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="table-th cursor-pointer select-none hover:bg-slate-100 transition-colors group whitespace-nowrap"
                        title="Smena sanasini o'sish/kamayish bo'yicha saralash"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                          <span>Smena & Sana</span>
                          {sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </div>
                      </th>
                      {isOwner && (
                        <th className="table-th">Filial</th>
                      )}
                      <th className="table-th">Admin</th>
                      <th className="table-th">Kategoriya</th>
                      <th className="table-th">Tavsif (Izoh)</th>
                      <th className="table-th text-right">Summa</th>
                      <th className="table-th text-center">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExpenses.map((expense) => (
                      <tr key={expense.id} className="table-row">
                        {/* Smena Sanasi va Turi */}
                        <td className="table-td font-medium text-slate-900 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900">
                              {expense.formattedShiftDate || (expense.effectiveDate ? format(new Date(expense.effectiveDate), 'dd.MM.yyyy') : '—')}
                            </div>
                            {expense.shiftType === 'night' ? (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200 flex items-center gap-1 w-fit">
                                <Moon size={11} className="text-indigo-600" /> Tungi smena
                              </span>
                            ) : expense.shiftType === 'morning' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200 flex items-center gap-1 w-fit">
                                <Sun size={11} className="text-amber-600" /> Kunduzgi smena
                              </span>
                            ) : expense.shiftType === 'daily' ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1 w-fit">
                                <Clock size={11} className="text-emerald-600" /> Sutkalik smena
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                                To'g'ridan-to'g'ri
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Filial */}
                        {isOwner && (
                          <td className="table-td whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                              {expense.branch?.name || 'Asosiy'}
                            </span>
                          </td>
                        )}

                        {/* Admin */}
                        <td className="table-td text-slate-700 font-bold whitespace-nowrap">
                          {expense.admin?.name || '—'}
                        </td>

                        {/* Kategoriya */}
                        <td className="table-td whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-200">
                            {expense.category?.name || 'Boshqa'}
                          </span>
                        </td>

                        {/* Tavsif */}
                        <td className="table-td text-slate-800">{expense.description || '—'}</td>

                        {/* Summa */}
                        <td className="table-td text-right font-bold text-rose-600 whitespace-nowrap">
                          -{expense.amount.toLocaleString()} <span className="text-xs text-slate-500 font-normal">so'm</span>
                        </td>

                        {/* Amallar */}
                        <td className="table-td text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(expense)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Tahrirlash"
                            >
                              <Pencil size={15} />
                            </button>
                            {isOwner && (
                              <button
                                onClick={async () => {
                                  if (window.confirm('Haqiqatan ham ushbu xarajatni o\'chirmoqchimisiz?')) {
                                    try {
                                      await api.delete(`/expenses/${expense.id}`);
                                      toast.success('Xarajat o\'chirildi');
                                      fetchExpenses();
                                    } catch {
                                      toast.error('O\'chirishda xatolik');
                                    }
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="O'chirish"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/50 font-bold">
                      <td colSpan={isOwner ? 5 : 4} className="table-td text-slate-700 text-right uppercase text-xs">
                        Jami:
                      </td>
                      <td className="table-td text-right font-bold text-lg text-rose-600 whitespace-nowrap">
                        -{totalAmount.toLocaleString()} <span className="text-xs text-slate-500 font-normal">so'm</span>
                      </td>
                      <td className="table-td"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </div>


      {/* 3. Company Expenses Tab View (Owner Only - Tab 2) */}
      {isOwner && (
        <div className={activeTab === 'company' ? 'space-y-6 transition-all duration-200' : 'hidden'}>
          {/* Banner Info */}
          <div className="card p-4 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-slate-50 border border-indigo-100/80 shadow-sm text-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500/15 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Boshqaruv Kompaniyasi Xarajatlari
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Filiallar operatsion xarajatlariga aralashmaydigan tarmoq va boshqaruv xarajatlari tahlili
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Company Filter Card */}
          {/* Company Expenses KPI & List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 border-l-4 border-indigo-500 bg-gradient-to-br from-indigo-50/50 to-white">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Jami Kompaniya Xarajati</p>
              <h3 className="text-2xl font-bold text-indigo-700 mt-1">
                {companyExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} so'm
              </h3>
              <p className="text-xs text-slate-400 mt-1">Tanlangan davr bo'yicha</p>
            </div>

            <div className="card p-4 border-l-4 border-blue-500 bg-gradient-to-br from-blue-50/50 to-white">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Xarajatlar Soni</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{companyExpenses.length} ta</h3>
              <p className="text-xs text-slate-400 mt-1">Kompaniya chiqimlari</p>
            </div>

            <div className="card p-4 border-l-4 border-purple-500 bg-gradient-to-br from-purple-50/50 to-white">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Qamrov Sohasi</p>
              <h3 className="text-base font-bold text-purple-700 mt-1">Boshqaruv Kompaniyasi</h3>
              <p className="text-xs text-slate-400 mt-1">Tanlangan filial hisobidan ayiriladi</p>
            </div>
          </div>

          {/* Company Expense Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-600" /> Boshqaruv Kompaniyasi Xarajatlari Ro'yxati
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                {companyExpenses.length} ta xarajat
              </span>
            </div>

            {companyExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Inbox size={24} />
                </div>
                <p className="font-medium">Ushbu davrda kompaniya xarajatlari mavjud emas</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2"
                >
                  <Plus size={16} /> Kompaniya Xarajati Qo'shish
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Sana</th>
                      <th className="py-3 px-4">Manba Filiali & Hisob</th>
                      <th className="py-3 px-4">Turkum</th>
                      <th className="py-3 px-4">Tavsif</th>
                      <th className="py-3 px-4 text-right">Summa</th>
                      <th className="py-3 px-4 text-center">Kiritdi</th>
                      {isOwner && <th className="py-3 px-4 text-center">Amal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {companyExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {format(new Date(e.expenseDate || e.createdAt), 'dd.MM.yyyy')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            e.paymentSource === 'bank'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : e.paymentSource === 'transfer'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {e.paymentSource === 'bank' && '🏛️ '}
                            {e.paymentSource === 'transfer' && '💳 '}
                            {(!e.paymentSource || e.paymentSource === 'cash') && '💵 '}
                            {e.branch?.name || 'Filial'} — {
                              e.paymentSource === 'bank' ? 'Hisob raqam' :
                              e.paymentSource === 'transfer' ? 'Kartadan kartaga' : 'Naqd kassa'
                            }
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {e.category?.name || 'Boshqa'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {e.description || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {e.amount.toLocaleString()} so'm
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-medium">
                          {e.admin?.name || 'Owner'}
                        </td>
                        {isOwner && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(e)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Tahrirlash"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Haqiqatan ham ushbu kompaniya xarajatini o\'chirmoqchimisiz?')) {
                                    try {
                                      await api.delete(`/expenses/${e.id}`);
                                      toast.success('Xarajat o\'chirildi');
                                      fetchCompanyExpenses();
                                    } catch (err) {
                                      toast.error('O\'chirishda xatolik');
                                    }
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="O'chirish"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              {editingExpense ? (
                <>
                  <Pencil size={20} className="text-blue-600" /> Xarajatni Tahrirlash
                </>
              ) : activeTab === 'company' ? (
                <>💼 Kompaniya Xarajati Qo'shish</>
              ) : (
                <>💸 Filial Xarajati Qo'shish</>
              )}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              
              {(isOwner || activeTab === 'company') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Mablag' yechiladigan filial <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Filialni tanlang...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'company' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Mablag' yechiladigan hisob manbasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.paymentSource}
                    onChange={(e) => setForm({ ...form, paymentSource: e.target.value })}
                    className="input-field font-semibold"
                    required
                  >
                    <option value="cash">💵 Naqd (Filial kassasidan)</option>
                    <option value="bank">🏛️ Hisob raqam (QrCode va Terminal bank hisobidan)</option>
                    <option value="transfer">💳 Kartadan kartaga (O'tkazma)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Tanlangan filialning aynan shu hisob qoldig'idan ayiriladi.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Xarajat turkumi <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Turkumni tanlang...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Summa (so'm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberInput(form.amount)}
                  onChange={(e) => setForm({ ...form, amount: parseNumberInput(e.target.value) })}
                  className="input-field font-bold text-slate-900 text-lg"
                  placeholder="Masalan: 500 000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tavsif (ixtiyoriy)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  placeholder="Nima uchun xarajat qilindi?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Bekor qilish
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

