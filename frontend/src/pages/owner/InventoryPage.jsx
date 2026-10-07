import { useState, useEffect } from 'react';
import { Package, Plus, History, Archive, AlertTriangle, Building2, ArrowDownLeft, ArrowUpRight, CheckCircle2, Info, Loader2, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock'); // stock, incoming, history
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // History filters
  const [filterType, setFilterType] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');

  // Forms states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [newProduct, setNewProduct] = useState({
    categoryId: '',
    name: '',
    measurementUnit: 'dona',
    hasLifespan: false,
    lifespanDays: ''
  });

  const [branches, setBranches] = useState([]);

  // Multi-item Kirim Form
  const [kirimNotes, setKirimNotes] = useState('');
  const [kirimItems, setKirimItems] = useState([
    { productId: '', quantity: '', purchasePrice: '' }
  ]);

  // Multi-item Transfer Form
  const [transferBranchId, setTransferBranchId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferItems, setTransferItems] = useState([
    { productId: '', quantity: '' }
  ]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await api.get('/inventory/categories');
      setCategories(catRes.data.data);

      const prodRes = await api.get('/inventory/products');
      setProducts(prodRes.data.data);

      const branchRes = await api.get('/branches');
      setBranches(branchRes.data?.data || []);

      const stockRes = await api.get('/inventory/stock');
      setBatches(stockRes.data.data);

      if (activeTab === 'history') {
        const txRes = await api.get('/inventory/transactions');
        setTransactions(txRes.data.data);
      }
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const getProductStock = (prodId) => {
    if (!prodId) return 0;
    return batches
      .filter(b => b.productId === parseInt(prodId))
      .reduce((sum, b) => sum + b.quantity, 0);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/categories', { name: newCategoryName });
      toast.success("Kategoriya qo'shildi");
      setNewCategoryName('');
      setShowCategoryModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/products', newProduct);
      toast.success("Mahsulot qo'shildi");
      setShowProductModal(false);
      setNewProduct({ categoryId: '', name: '', measurementUnit: 'dona', hasLifespan: false, lifespanDays: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik');
    }
  };

  // Kirim row management
  const addKirimRow = () => {
    setKirimItems([...kirimItems, { productId: '', quantity: '', purchasePrice: '' }]);
  };

  const removeKirimRow = (index) => {
    if (kirimItems.length === 1) return;
    setKirimItems(kirimItems.filter((_, i) => i !== index));
  };

  const updateKirimRow = (index, field, value) => {
    const updated = kirimItems.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setKirimItems(updated);
  };

  const handleKirim = async (e) => {
    e.preventDefault();
    try {
      const validItems = kirimItems
        .filter(item => item.productId && parseFloat(parseNumberInput(item.quantity)) > 0)
        .map(item => ({
          productId: parseInt(item.productId),
          quantity: parseFloat(parseNumberInput(item.quantity)),
          purchasePrice: item.purchasePrice ? parseFloat(parseNumberInput(item.purchasePrice)) : undefined
        }));

      if (validItems.length === 0) {
        toast.error("Kamida bitta mahsulot va miqdorini kiriting");
        return;
      }

      const payload = {
        items: validItems,
        notes: kirimNotes || 'Bosh omborga kirim qilingan'
      };

      const res = await api.post('/inventory/stock/kirim', payload);
      toast.success(res.data?.message || 'Bosh omborga kirim qilindi');
      setKirimItems([{ productId: '', quantity: '', purchasePrice: '' }]);
      setKirimNotes('');
      fetchData();
      setActiveTab('stock');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik');
    }
  };

  // Transfer row management
  const addTransferRow = () => {
    setTransferItems([...transferItems, { productId: '', quantity: '' }]);
  };

  const removeTransferRow = (index) => {
    if (transferItems.length === 1) return;
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const updateTransferRow = (index, field, value) => {
    const updated = transferItems.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setTransferItems(updated);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferBranchId) {
      toast.error("Iltimos, filialni tanlang");
      return;
    }

    try {
      const validItems = transferItems
        .filter(item => item.productId && parseFloat(parseNumberInput(item.quantity)) > 0)
        .map(item => ({
          productId: parseInt(item.productId),
          quantity: parseFloat(parseNumberInput(item.quantity))
        }));

      if (validItems.length === 0) {
        toast.error("Kamida bitta mahsulot va miqdorini kiriting");
        return;
      }

      // Check stock client-side for immediate feedback
      for (const it of validItems) {
        const available = getProductStock(it.productId);
        if (available < it.quantity) {
          const prod = products.find(p => p.id === it.productId);
          toast.error(`"${prod?.name || 'Mahsulot'}" uchun omborda yetarli qoldiq yo'q! Mavjud: ${available}, So'ralgan: ${it.quantity}`);
          return;
        }
      }

      const payload = {
        branchId: parseInt(transferBranchId),
        items: validItems,
        notes: transferNotes || 'Filialga berildi'
      };

      const res = await api.post('/inventory/stock/transfer', payload);
      toast.success(res.data?.message || "Filialga muvaffaqiyatli o'tkazildi");
      setTransferItems([{ productId: '', quantity: '' }]);
      setTransferBranchId('');
      setTransferNotes('');
      fetchData();
      setActiveTab('stock');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik');
    }
  };

  // UI Render functions
  const renderStock = () => {
    if (loading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    // Guruhlash productId bo'yicha
    const grouped = {};
    batches.forEach(b => {
      if (!grouped[b.productId]) {
        grouped[b.productId] = {
          product: b.product,
          totalQty: 0,
          batches: []
        };
      }
      grouped[b.productId].totalQty += b.quantity;
      grouped[b.productId].batches.push(b);
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Jami mahsulot turlari</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{products.length} ta</h3>
            </div>
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500">
              <Package size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Kategoriyalar</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{categories.length} ta</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <Archive size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="text-primary-500" /> Bosh ombor qoldig'i
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Mahsulot</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kategoriya</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qoldiq</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Holati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(grouped).length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500">Omborda mahsulot yo'q</td>
                  </tr>
                )}
                {Object.values(grouped).map(group => {
                  const hasExpired = group.batches.some(b => b.isExpired);
                  return (
                    <tr key={group.product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{group.product.name}</td>
                      <td className="px-6 py-4 text-slate-600">{group.product.category?.name}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        {group.totalQty} <span className="text-xs font-normal text-slate-500 ml-1">{group.product.measurementUnit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle size={12} /> Yaroqlilik o'tgan qismi bor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={12} /> Yaroqli
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderKirim = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Multi-item Kirim Form */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowDownLeft className="text-emerald-500" /> Bosh omborga kirim qilish
            </h3>
            <button 
              type="button"
              onClick={() => setShowProductModal(true)}
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg"
            >
              <Plus size={14} /> Yangi tovar
            </button>
          </div>
          
          <form onSubmit={handleKirim} className="space-y-4">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Kirim qilinadigan mahsulotlar ({kirimItems.length} ta)
              </label>

              {kirimItems.map((item, index) => (
                <div key={index} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">#{index + 1}-tovar</span>
                    {kirimItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKirimRow(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 size={13} /> O'chirish
                      </button>
                    )}
                  </div>

                  <div>
                    <select 
                      className="input-field w-full text-sm"
                      value={item.productId}
                      onChange={e => updateKirimRow(index, 'productId', e.target.value)}
                      required
                    >
                      <option value="">-- Mahsulotni tanlang --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.category?.name || 'Kategoriyasiz'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Miqdori</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        className="input-field text-sm" 
                        value={formatNumberInput(item.quantity)}
                        onChange={e => updateKirimRow(index, 'quantity', parseNumberInput(e.target.value))}
                        placeholder="Masalan: 100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Xarid narxi (ixtiyoriy)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        className="input-field text-sm" 
                        value={formatNumberInput(item.purchasePrice)}
                        onChange={e => updateKirimRow(index, 'purchasePrice', parseNumberInput(e.target.value))}
                        placeholder="Jami so'm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addKirimRow}
                className="w-full py-2.5 px-4 border border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={16} /> Yana mahsulot qo'shish
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Kirim izohi (ixtiyoriy)</label>
              <input 
                type="text" 
                className="input-field" 
                value={kirimNotes}
                onChange={e => setKirimNotes(e.target.value)}
                placeholder="Masalan: Bozordan sotib olindi yoki yetkazib beruvchidan keldi"
              />
            </div>

            <button type="submit" className="btn-primary w-full mt-4 font-bold justify-center text-center shadow-md shadow-primary-500/20">
              Kirim qilish
            </button>
          </form>
        </div>
      </div>

      {/* Multi-item Filialga Chiqim qilish (Transfer) Form */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowUpRight className="text-blue-500" /> Filialga chiqim qilish (nakladnoy usulida)
          </h3>
          
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qaysi filialga jo'natiladi?</label>
              <select 
                className="input-field font-semibold text-slate-800"
                value={transferBranchId}
                onChange={e => setTransferBranchId(e.target.value)}
                required
              >
                <option value="">-- Filialni tanlang --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Beriladigan mahsulotlar ({transferItems.length} ta)
              </label>

              {transferItems.map((item, index) => {
                const currentStock = getProductStock(item.productId);
                return (
                  <div key={index} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">#{index + 1}-tovar</span>
                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransferRow(index)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <Trash2 size={13} /> O'chirish
                        </button>
                      )}
                    </div>

                    <div>
                      <select 
                        className="input-field w-full text-sm"
                        value={item.productId}
                        onChange={e => updateTransferRow(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">-- Mahsulotni tanlang --</option>
                        {products.map(p => {
                          const stock = getProductStock(p.id);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} (Omborda: {stock} {p.measurementUnit})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-slate-600">Miqdori</label>
                          {item.productId && (
                            <span className={`text-[11px] font-semibold ${currentStock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              Mavjud: {currentStock} dona
                            </span>
                          )}
                        </div>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          className="input-field text-sm" 
                          value={formatNumberInput(item.quantity)}
                          onChange={e => updateTransferRow(index, 'quantity', parseNumberInput(e.target.value))}
                          placeholder="Masalan: 50"
                          required
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addTransferRow}
                className="w-full py-2.5 px-4 border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={16} /> Yana mahsulot qo'shish
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Umumiy izoh (ixtiyoriy)</label>
              <input 
                type="text" 
                className="input-field" 
                value={transferNotes}
                onChange={e => setTransferNotes(e.target.value)}
                placeholder="Masalan: 05.10 yuk mashinasida haydovchi orqali berib yuborildi"
              />
            </div>

            <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700 w-full mt-4 font-bold justify-center text-center shadow-md shadow-blue-500/20">
              Chiqim qilish
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    const filteredTransactions = transactions.filter(tx => {
      let matchType = filterType === 'ALL' || tx.type === filterType;
      let matchMonth = filterMonth === '' || tx.createdAt.substring(0, 7) === filterMonth;
      return matchType && matchMonth;
    });

    return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <select 
          className="input-field sm:max-w-xs" 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="ALL">Barcha amaliyotlar</option>
          <option value="IN">Faqat kirimlar</option>
          <option value="TRANSFER">Faqat filialga berish</option>
          <option value="OUT">Faqat chiqimlar (brak)</option>
        </select>
        <input 
          type="month" 
          className="input-field sm:max-w-xs" 
          value={filterMonth} 
          onChange={e => setFilterMonth(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sana</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tur</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Mahsulot</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Filial</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Miqdor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Izoh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-slate-500">Hech qanday ma'lumot topilmadi</td>
              </tr>
            )}
            {filteredTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm text-slate-600">
                  {format(new Date(tx.createdAt), 'dd.MM.yyyy HH:mm')}
                </td>
                <td className="px-6 py-4">
                  {tx.type === 'IN' && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><ArrowDownLeft size={12}/> Kirim</span>}
                  {tx.type === 'OUT' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><ArrowUpRight size={12}/> Chiqim</span>}
                  {tx.type === 'TRANSFER' && <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><Building2 size={12}/> Filialga berildi</span>}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{tx.product?.name}</td>
                <td className="px-6 py-4 text-slate-600">{tx.branch?.name || 'Bosh ombor'}</td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{tx.notes}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Archive className="text-primary-500" size={32} /> Omborxona boshqaruvi
          </h1>
          <p className="text-slate-600 mt-1">Bosh ombordagi barcha tovar va moddiy qadriyatlarni nazorat qiling</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'stock' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('stock')}
        >
          <span className="flex items-center gap-2"><Package size={18}/> Bosh ombor qoldig'i</span>
          {activeTab === 'stock' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
        </button>
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'incoming' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('incoming')}
        >
          <span className="flex items-center gap-2"><ArrowDownLeft size={18}/> Kirim qilish</span>
          {activeTab === 'incoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
        </button>
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'history' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="flex items-center gap-2"><History size={18}/> Kirim-chiqim tarixi</span>
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'stock' && renderStock()}
      {activeTab === 'incoming' && renderKirim()}
      {activeTab === 'history' && renderHistory()}

      {/* Kategoriya Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Yangi kategoriya</h2>
            <form onSubmit={handleCreateCategory}>
              <input
                type="text"
                placeholder="Masalan: Sochiqlar"
                className="input-field mb-4"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                required
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mahsulot Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Yangi mahsulot turini qo'shish</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategoriya</label>
                <div className="flex gap-2">
                  <select 
                    className="input-field flex-1"
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}
                    required
                  >
                    <option value="">-- Tanlang --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowCategoryModal(true)} className="btn-secondary px-3"><Plus size={18}/></button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mahsulot nomi</label>
                <input
                  type="text"
                  placeholder="Masalan: Katta oq sochiq 70x140"
                  className="input-field"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">O'lchov birligi</label>
                  <select className="input-field" value={newProduct.measurementUnit} onChange={e => setNewProduct({...newProduct, measurementUnit: e.target.value})}>
                    <option value="dona">Dona</option>
                    <option value="kg">Kg</option>
                    <option value="litr">Litr</option>
                    <option value="metr">Metr</option>
                    <option value="quti">Quti</option>
                    <option value="pachka">Pachka</option>
                  </select>
                </div>
                
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary-600 rounded"
                      checked={newProduct.hasLifespan}
                      onChange={e => setNewProduct({...newProduct, hasLifespan: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-slate-700">Yaroqlilik muddati bormi?</span>
                  </label>
                </div>
              </div>

              {newProduct.hasLifespan && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Yaroqlilik muddati (kun hisobida)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Masalan: 180"
                    className="input-field"
                    value={formatNumberInput(newProduct.lifespanDays)}
                    onChange={e => setNewProduct({...newProduct, lifespanDays: parseNumberInput(e.target.value)})}
                    required={newProduct.hasLifespan}
                  />
                  <p className="text-xs text-slate-500 mt-1">Masalan 1 yil bo'lsa 365, 6 oy bo'lsa 180 kiriting.</p>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowProductModal(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Qo'shish"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
