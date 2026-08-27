import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { 
  Share2, 
  Copy, 
  CheckCircle2, 
  Send, 
  Bot, 
  PhoneCall, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';

export default function IntegrationsPage() {
  const [copiedField, setCopiedField] = useState('');
  const [testing, setTesting] = useState(false);

  const webhookUrl = 'https://hotelbase.uz/api/leads/meta-webhook';
  const verifyToken = 'hotelbase_lead_secret_2026';

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} nusxalandi! 📋`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleTestLead = async () => {
    setTesting(true);
    try {
      await api.post('/leads/meta-webhook', {
        name: 'Test Targetolog Lead',
        phone: '+998901234567',
        source: 'Meta Ads Test Button',
        notes: 'Targetolog Integratsiya Sozlamalaridan yuborilgan test lid'
      });
      toast.success('Test Lid muvaffaqiyatli yuborildi va Call Operator panelida paydo bo\'ldi! 🎉');
    } catch (err) {
      toast.error('Test yuborishda xatolik yuz berdi');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-primary-500/20 text-primary-400 p-2 rounded-lg border border-primary-500/30">
              <Share2 size={24} />
            </span>
            <h1 className="text-2xl font-bold">Integratsiyalar & API Sozlamalari</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Meta (Instagram/Facebook Lead Ads), Telegram Bot va Telefoniyani CRM paneliga ulash
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Webhook Server Active
          </span>
        </div>
      </div>

      {/* Grid of Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Meta / Instagram Lead Ads Card */}
        <div className="card p-6 relative overflow-hidden border-2 border-primary-500/20 shadow-md hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 bg-primary-500 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-xl shadow-sm">
            Tavsiya etiladi
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center text-white shadow-md">
              <Share2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Meta / Instagram Lead Ads</h3>
              <p className="text-xs text-slate-500">Instagram & Facebook arizalarini CRM ga avtomatik tushirish</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Webhook URL Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                1. Webhook URL (Integratsiya Yo'lagi)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="input-field font-mono text-xs text-slate-800 bg-slate-50 border-slate-300 font-semibold"
                />
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 border border-slate-300"
                >
                  {copiedField === 'Webhook URL' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  {copiedField === 'Webhook URL' ? 'Nusxalandi' : 'Nusxalash'}
                </button>
              </div>
            </div>

            {/* Verify Token Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                2. Verify Token (Meta Xavfsizlik Kaliti)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="input-field font-mono text-xs text-slate-800 bg-slate-50 border-slate-300 font-semibold"
                />
                <button
                  onClick={() => copyToClipboard(verifyToken, 'Verify Token')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 border border-slate-300"
                >
                  {copiedField === 'Verify Token' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  {copiedField === 'Verify Token' ? 'Nusxalandi' : 'Nusxalash'}
                </button>
              </div>
            </div>

            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                3. Voronka Ustuni (Pipeline Stage)
              </label>
              <input
                type="text"
                readOnly
                value="new (Yangi Lidlar Ustuni)"
                className="input-field text-xs text-slate-700 bg-slate-50 border-slate-300 font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleTestLead}
                disabled={testing}
                className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs"
              >
                {testing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                Test Lid Yuborish (Sinash)
              </button>
            </div>
          </div>
        </div>

        {/* Telegram Lead Bot Card */}
        <div className="card p-6 border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-md">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Telegram Lead Bot</h3>
                <p className="text-xs text-slate-500">Telegram arizalar va foto xabarnomalar boti</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Bot Statusi:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Ulangan & Faol
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Kamera Boti:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800 font-bold">@HotelCameraBot</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Lidlar Bildirishnomasi:</span>
                <span className="text-primary-600 font-bold">Yoqilgan 🔔</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
            >
              <ExternalLink size={16} /> Telegram Bot Sozlamalari
            </a>
          </div>
        </div>

        {/* SIP Telephony Integration Card */}
        <div className="card p-6 border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <PhoneCall size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Asterisk SIP Telefoniya</h3>
                <p className="text-xs text-slate-500">Uztelecom / Beeline avtomatik suhbat yozib olish</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">PBX Server Host:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800 font-bold">89.126.208.59</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Audio Streamer:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Avtomatik Integrasiya Dial-in
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Targetolog Quick Instructions */}
        <div className="card p-6 bg-gradient-to-br from-slate-50 to-primary-50/30 border-primary-200">
          <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-500" /> Targetolog Uchun Qo'llanma
          </h3>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Meta Business Suite / Make.com / Zapier orqali ulayotganingizda yuqoridagi <strong>Webhook URL</strong> va <strong>Verify Token</strong> ma'lumotlarini o'z joyiga qo'yasiz.
          </p>
          <div className="text-[11px] font-mono bg-white p-3 rounded-lg border border-slate-300 text-slate-700 space-y-1">
            <p className="font-bold text-slate-900">Maydonlar (Fields):</p>
            <p>• name: Mijozning Ismi</p>
            <p>• phone: Telefon raqami (+998...)</p>
            <p>• source: Instagram Lead Ads</p>
          </div>
        </div>

      </div>
    </div>
  );
}
