const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../frontend/src/pages/guest/GuestRoomPortal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Top Tab Switcher
const tabSwitcherStart = `        {/* ======================================================== */}\n        {/* 2. TAB SWITCHER (Services vs Live Chat) */}`;
const tabSwitcherEnd = `          </div>\n        </div>`;
const tabSwitcherRegex = new RegExp(tabSwitcherStart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '[\\s\\S]*?' + tabSwitcherEnd.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
content = content.replace(tabSwitcherRegex, '');

// 2. Add 'roomIssues' and 'back' to translations
const translationsRegex = /(en: {[\s\S]*?)(\s*)(ru: {)/;
// Wait, doing this safely is better. Let's just find and replace in the JS object.
// Actually, since I have the `inject_translations.cjs`, I can just modify translations directly in the script.
const additions = {
  en: `    roomIssues: 'Room Issues',\n    backToServices: 'Back',\n`,
  ru: `    roomIssues: 'Проблемы в номере',\n    backToServices: 'Назад',\n`,
  uz: `    roomIssues: 'Xonadagi muammolar',\n    backToServices: 'Orqaga',\n`,
  hi: `    roomIssues: 'कमरे की समस्या',\n    backToServices: 'वापस',\n`,
  ur: `    roomIssues: 'کمرے کے مسائل',\n    backToServices: 'پیچھے',\n`,
  de: `    roomIssues: 'Zimmerprobleme',\n    backToServices: 'Zurück',\n`,
  fr: `    roomIssues: 'Problèmes de chambre',\n    backToServices: 'Retour',\n`,
  zh: `    roomIssues: '房间问题',\n    backToServices: '返回',\n`,
  ar: `    roomIssues: 'مشاكل الغرفة',\n    backToServices: 'خلف',\n`,
  tr: `    roomIssues: 'Oda Sorunları',\n    backToServices: 'Geri',\n`
};

for (const lang of Object.keys(additions)) {
  const findStr = `welcomeModalBtn: '${
    lang === 'en' ? 'Enter' : 
    lang === 'ru' ? 'Войти' : 
    lang === 'uz' ? 'Kirish' : 
    lang === 'hi' ? 'प्रवेश करें' : 
    lang === 'ur' ? 'داخل ہوں' : 
    lang === 'de' ? 'Eintreten' : 
    lang === 'fr' ? 'Entrer' : 
    lang === 'zh' ? '进入' : 
    lang === 'ar' ? 'دخول' : 
    'Giriş Yap'
  }'`;
  
  if (content.includes(findStr)) {
    content = content.replace(findStr, findStr + ',\n' + additions[lang].trimEnd());
  } else {
    console.warn('Could not find string for lang:', lang);
  }
}

// 3. Modify Grid to split into Xonadagi muammolar & Xona xizmati and remove water
// I'll replace the entire `Quick Services Grid` section.
const gridStart = `            {/* Quick Services Grid */}`;
const gridEnd = `            {/* Quick Info Footer Pills */}`;
const gridRegex = new RegExp(gridStart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '[\\s\\S]*?' + gridEnd.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

const newGrid = `            {/* Room Issues Grid */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {t.roomIssues || 'Xonadagi muammolar'}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleOpenCategory('maintenance', 'Air conditioner / Climate issue / Konditsioner nosozligi')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">❄️</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.acHeating}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.acHeatingDesc}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('maintenance', 'Water or bathroom issue / Santexnika muammosi')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🚿</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.plumbing}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.plumbingDesc}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('general', '')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🛎️</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.otherIssue}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.otherIssueDesc}</p>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between mb-2.5 px-1 mt-2">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {t.quickServices || 'Xona xizmati'}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  onClick={() => handleOpenCategory('housekeeping', 'Please clean my room / Xonani tozalash kerak')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🧹</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.housekeeping}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.housekeepingDesc}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('amenities', 'Need fresh towels and slippers / Sochiq va shippak kerak')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🧴</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.amenities}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.amenitiesDesc}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Info Footer Pills */}
`;

if (content.match(gridRegex)) {
  content = content.replace(gridRegex, newGrid);
} else {
  console.warn("Could not find Quick Services Grid");
}

// 4. Remove Breakfast Card and make Reception full width
const pillsFind = `<div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Coffee size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider truncate">{t.breakfastTitle}</p>
                  <p className="text-xs font-black text-slate-800">{hotelInfo?.breakfastHours || '07:00 - 10:30'}</p>
                </div>
              </div>

              <a
                href={\`tel:\${hotelInfo?.branchPhone || '+998555000000'}\`}
                className="bg-emerald-50/60 border border-emerald-200/80 p-3 rounded-2xl flex items-center gap-2.5 hover:bg-emerald-100/60 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <PhoneCall size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider truncate">{t.receptionCall}</p>
                  <p className="text-xs font-black text-emerald-700 truncate">Call Front Desk</p>
                </div>
              </a>
            </div>`;

const pillsReplace = `<div className="pt-1">
              <a
                href={\`tel:\${hotelInfo?.branchPhone || '+998555000000'}\`}
                className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl flex items-center gap-3 hover:bg-emerald-100/60 transition-colors shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <PhoneCall size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider truncate">{t.receptionCall}</p>
                  <p className="text-sm font-black text-emerald-700 truncate">Call Front Desk</p>
                </div>
              </a>
            </div>`;

if (content.includes(pillsFind)) {
  content = content.replace(pillsFind, pillsReplace);
} else {
  console.warn("Could not find Quick Info Footer Pills");
}

// 5. Add Back to Services button in Chat Header
const chatHeaderFind = `<div className="shrink-0 bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
              <Sparkles size={13} className="text-amber-600 shrink-0" />
              <span className="truncate">{t.chatDesc}</span>
            </div>`;

const chatHeaderReplace = `<div className="shrink-0 bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between gap-2 text-[11px] text-amber-900 font-medium">
              <div className="flex items-center gap-2 overflow-hidden">
                <Sparkles size={13} className="text-amber-600 shrink-0" />
                <span className="truncate">{t.chatDesc}</span>
              </div>
              <button 
                onClick={() => setActiveTab('services')} 
                className="bg-white/80 hover:bg-white border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 font-bold shrink-0 shadow-sm transition-colors"
              >
                {t.backToServices || 'Orqaga'}
              </button>
            </div>`;

if (content.includes(chatHeaderFind)) {
  content = content.replace(chatHeaderFind, chatHeaderReplace);
} else {
  console.warn("Could not find Chat Header");
}

fs.writeFileSync(filePath, content);
console.log("UI updated successfully.");
