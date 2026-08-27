import React from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2, Building2, Mail, Phone, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-2">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Maxfiylik Siyosati / Политика конфиденциальности
          </h1>
          <p className="text-sm text-slate-400">
            HotelBase Cloud Platformasi va Meta (Facebook / Instagram) Lead Ads integratsiyasi uchun maxfiylik shartlari.
          </p>
          <p className="text-xs text-slate-500 font-mono">Oxirgi yangilanish: 14-Avgust, 2026-yil</p>
        </div>

        {/* Content Section */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-3xl p-6 sm:p-10 space-y-8 text-sm leading-relaxed text-slate-300">
          
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" /> 1. Umumiy qoidalar (Общие положения)
            </h2>
            <p>
              Ushbu Maxfiylik Siyosati <strong>HotelBase</strong> axborot tizimi va uning hamkor mehmonxonalari (jumladan <em>Family Hotel</em>) tomonidan foydalanuvchilar, mehmonlar hamda reklama (Meta/Facebook/Instagram) orqali ariza qoldirgan shaxslarning shaxsiy ma'lumotlarini qanday yig'ish, qayta ishlash va himoya qilishini belgilaydi.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" /> 2. Yig'iladigan ma'lumotlar (Собираемые данные)
            </h2>
            <p>Biz quyidagi ma'lumotlarni qonuniy va xavfsiz tarzda qabul qilamiz:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li><strong>Aloqa ma'lumotlari:</strong> Ism, familiya, telefon raqami, elektron pochta.</li>
              <li><strong>Bronlash parametrlari:</strong> Joylashish sanalari, xona toifalari, filial tanlovi.</li>
              <li><strong>Meta Lead Ads ma'lumotlari:</strong> Instagram yoki Facebook reklama formalarini to'ldirishda foydalanuvchi tomonidan ixtiyoriy taqdim etilgan ma'lumotlar.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-400" /> 3. Ma'lumotlardan foydalanish maqsadi (Цели обработки данных)
            </h2>
            <p>To'plangan ma'lumotlar faqat quyidagi maqsadlarda ishlatiladi:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>Mehmonxona xonalarini bron qilish va mijozlarga xizmat ko'rsatish;</li>
              <li>Call Operator tomonidan mijoz bilan bog'lanib, konsultatsiya berish;</li>
              <li>Mijozning so'rovi bo'yicha buyurtma va to'lov holatini tasdiqlash.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> 4. Ma'lumotlar xavfsizligi va Uchinchi shaxslarga berilmasligi
            </h2>
            <p>
              HotelBase tizimi barcha shaxsiy ma'lumotlarni shifrlangan holda (SSL/TLS, xavfsiz ma'lumotlar bazasi) saqlaydi. Foydalanuvchilarning shaxsiy ma'lumotlari uchinchi shaxslarga sotilmaydi, ijaraga berilmaydi va qonun hujjatlarida nazarda tutilgan hollardan tashqari boshqa maqsadlarda tarqatilmaydi.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" /> 5. Ma'lumotlarni o'chirish huquqi (Data Deletion Instructions)
            </h2>
            <p>
              Har bir foydalanuvchi o'z shaxsiy ma'lumotlarini bazadan o'chirishni talab qilish huquqiga ega. Buning uchun quyidagi kontaktlar orqali biz bilan bog'lanishingiz kifoya, ma'lumotlaringiz 24 soat ichida to'liq o'chiriladi.
            </p>
          </div>

          {/* Section 6: Contact */}
          <div className="border-t border-slate-700/80 pt-6 space-y-2">
            <h3 className="font-bold text-white">Bog'lanish / Контакты:</h3>
            <p className="flex items-center gap-2 text-slate-400">
              <Globe className="w-4 h-4 text-blue-400" /> Veb-sayt: <a href="https://hotelbase.uz" className="text-blue-400 hover:underline">https://hotelbase.uz</a>
            </p>
            <p className="flex items-center gap-2 text-slate-400">
              <Mail className="w-4 h-4 text-blue-400" /> Email: <span className="text-slate-200">support@hotelbase.uz</span>
            </p>
            <p className="flex items-center gap-2 text-slate-400">
              <Phone className="w-4 h-4 text-blue-400" /> Qo'llab-quvvatlash: <span className="text-slate-200">+998 71 200 00 00</span>
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="text-center pt-4 text-xs text-slate-500">
          <p>© 2026 HotelBase Management System. Barcha huquqlar himoyalangan.</p>
          <div className="mt-2">
            <Link to="/login" className="text-blue-400 hover:underline">Kirish sahifasiga qaytish</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
