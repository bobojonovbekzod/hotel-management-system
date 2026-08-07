import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { format } from 'date-fns';
import { UserCheck, Clock, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

export default function MySalaryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/admin');
      setData(res.data.data);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-600 py-10">Yuklanmoqda...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <UserCheck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mening Oyligim</h1>
          <p className="text-slate-600">{format(now, 'MMMM yyyy')} oyi uchun hisobot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-slate-50 border-slate-300">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-blue-400" size={20} />
            <span className="text-slate-800">Smenalar soni</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.shifts}</p>
          <p className="text-sm text-slate-600 mt-1">Bu oydagi yopilgan smenalar</p>
        </div>

        <div className="card bg-slate-50 border-slate-300">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="text-red-400" size={20} />
            <span className="text-slate-800">Jarimalar</span>
          </div>
          <p className="text-3xl font-bold text-red-400">
            {data.penalties.toLocaleString()} <span className="text-sm">so'm</span>
          </p>
        </div>

        <div className="card bg-slate-50 border-slate-300">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-emerald-400" size={20} />
            <span className="text-slate-800">Bonus / Avans</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {data.bonuses.toLocaleString()} <span className="text-sm text-slate-600">so'm (bonus)</span>
            <br/>
            <span className="text-xl text-yellow-400">{data.advances.toLocaleString()} <span className="text-sm text-slate-600">so'm (avans)</span></span>
          </p>
        </div>

        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-primary-600" size={20} />
            <span className="text-primary-900 font-medium">Hisoblangan jami maosh</span>
          </div>
          <p className="text-4xl font-bold text-primary-700 mb-2">
            {data.netSalary.toLocaleString()} <span className="text-lg text-primary-600">so'm</span>
          </p>
          <div className="text-sm text-primary-800 border-t border-primary-200 pt-2 mt-2 space-y-1">
            <div className="flex justify-between">
              <span>Asosiy ish haqi:</span>
              <span className="font-medium">{data.baseSalary.toLocaleString()}</span>
            </div>
            {data.bonuses > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Bonuslar (+):</span>
                <span className="font-medium">{data.bonuses.toLocaleString()}</span>
              </div>
            )}
            {data.penalties > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Jarimalar (-):</span>
                <span className="font-medium">{data.penalties.toLocaleString()}</span>
              </div>
            )}
            {data.advances > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Avans (-):</span>
                <span className="font-medium">{data.advances.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
