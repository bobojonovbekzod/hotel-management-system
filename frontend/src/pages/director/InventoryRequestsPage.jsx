import React, { useState, useEffect } from 'react';
import { Archive, Plus, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

export default function InventoryRequestsPage() {
  const [activeTab, setActiveTab] = useState('stock'); // stock, request, my-requests
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [requestForm, setRequestForm] = useState({
    productId: '',
    requestedQuantity: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        const res = await api.get('/inventory/stock'); // director fetch qilsa faqat o'z filiali keladi
        setBatches(res.data.data);
      }
      if (activeTab === 'request') {
        const res = await api.get('/inventory/products');
        setProducts(res.data.data);
      }
      if (activeTab === 'my-requests') {
        const res = await api.get('/inventory/requests');
        setMyRequests(res.data.data);
      }
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...requestForm,
        requestedQuantity: parseFloat(parseNumberInput(requestForm.requestedQuantity))
      };
      await api.post('/inventory/requests', payload);
      toast.success("So'rov Bosh omborga yuborildi");
      setRequestForm({ productId: '', requestedQuantity: '', notes: '' });
      setActiveTab('my-requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik');
    }
  };

  const renderStock = () => {
    const grouped = {};
    batches.forEach(b => {
      if (!grouped[b.productId]) {
        grouped[b.productId] = { product: b.product, totalQty: 0 };
      }
      grouped[b.productId].totalQty += b.quantity;
    });

    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
              <th className="px-6 py-3">Mahsulot nomi</th>
              <th className="px-6 py-3">Kategoriya</th>
              <th className="px-6 py-3 text-right">Qoldiq</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.values(grouped).length === 0 && (
              <tr><td colSpan="3" className="p-8 text-center text-slate-500">Filialda tovar yo'q</td></tr>
            )}
            {Object.values(grouped).map(g => (
              <tr key={g.product.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{g.product.name}</td>
                <td className="px-6 py-4 text-slate-600">{g.product.category?.name}</td>
                <td className="px-6 py-4 text-right font-bold text-slate-800">
                  {g.totalQty} <span className="font-normal text-xs text-slate-500">{g.product.measurementUnit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRequestForm = () => (
    <div className="max-w-xl mx-auto bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Send className="text-primary-500" /> Bosh omborga buyurtma
      </h3>
      
      <form onSubmit={handleSubmitRequest} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Qaysi mahsulot kerak?</label>
          <select 
            className="input-field w-full"
            value={requestForm.productId}
            onChange={e => setRequestForm({...requestForm, productId: e.target.value})}
            required
          >
            <option value="">-- Mahsulotni tanlang --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nechta kerak?</label>
          <input 
            type="text" 
            inputMode="decimal"
            className="input-field w-full" 
            value={formatNumberInput(requestForm.requestedQuantity)}
            onChange={e => setRequestForm({...requestForm, requestedQuantity: parseNumberInput(e.target.value)})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Izoh (ixtiyoriy)</label>
          <textarea 
            className="input-field w-full" 
            rows="3"
            placeholder="Nima maqsadda yoki boshqa izohlar..."
            value={requestForm.notes}
            onChange={e => setRequestForm({...requestForm, notes: e.target.value})}
          />
        </div>

        <button type="submit" className="btn-primary w-full text-lg py-3">
          Jo'natish
        </button>
      </form>
    </div>
  );

  const renderMyRequests = () => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
            <th className="px-6 py-3">Sana</th>
            <th className="px-6 py-3">Mahsulot</th>
            <th className="px-6 py-3 text-right">So'ralgan Miqdor</th>
            <th className="px-6 py-3 text-center">Holati</th>
            <th className="px-6 py-3">Owner izohi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {myRequests.length === 0 && (
            <tr><td colSpan="5" className="p-8 text-center text-slate-500">Hech qanday so'rov yuborilmagan</td></tr>
          )}
          {myRequests.map(r => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 text-sm text-slate-600">
                {format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm')}
              </td>
              <td className="px-6 py-4 font-medium text-slate-900">{r.product?.name}</td>
              <td className="px-6 py-4 text-right font-bold text-slate-900">
                {r.requestedQuantity} <span className="font-normal text-xs text-slate-500">{r.product?.measurementUnit}</span>
              </td>
              <td className="px-6 py-4 text-center">
                {r.status === 'pending' && <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold"><Clock size={12}/> Kutmoqda</span>}
                {r.status === 'approved' && <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle2 size={12}/> Tasdiqlandi</span>}
                {r.status === 'rejected' && <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold"><XCircle size={12}/> Rad etildi</span>}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500 italic">
                {r.status === 'rejected' ? r.notes : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Archive className="text-primary-500" size={32} /> Omborxona
          </h1>
          <p className="text-slate-600 mt-1">Filialdagi tovarlar va Bosh omborga buyurtma berish</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'stock' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('stock')}
        >
          Filial Qoldig'i
          {activeTab === 'stock' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
        </button>
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'request' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('request')}
        >
          Yangi So'rov
          {activeTab === 'request' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
        </button>
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'my-requests' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
          onClick={() => setActiveTab('my-requests')}
        >
          Jo'natilgan So'rovlar
          {activeTab === 'my-requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'stock' && renderStock()}
      {activeTab === 'request' && renderRequestForm()}
      {activeTab === 'my-requests' && renderMyRequests()}
    </div>
  );
}
