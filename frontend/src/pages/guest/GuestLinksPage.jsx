import React, { useState } from 'react';
import { MapPin, PhoneCall, Send, X, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BRANCH_LOCATIONS = [
  {
    name: 'Selxoz',
    subtitle: "Toshkent, Qishloq xo'jaligi instituti",
    phone: '+998 33 701 05 55',
    wifiName: 'Comnet',
    wifiPass: 'Family4545',
    lat: 41.357566,
    lng: 69.340149
  },
  {
    name: 'Samarqand 2',
    subtitle: "O'zbekistanskiy, Atoy ko'chasi 14",
    phone: '+998 33 718 05 55',
    wifiName: 'Buston',
    wifiPass: '09092013',
    lat: 39.638247,
    lng: 66.943038
  },
  {
    name: 'Samarqand 1',
    subtitle: "Registon maydoni yaqinida",
    phone: '+998 33 713 05 55',
    wifiName: 'FAMILY-5G',
    wifiPass: 'family4545',
    lat: 39.652934,
    lng: 66.977715
  },
  {
    name: 'Buxoro',
    subtitle: "Buxoro shahri",
    phone: '+998 33 716 05 55',
    wifiName: 'Family_Hotel_5G',
    wifiPass: '886890689',
    lat: 39.784309,
    lng: 64.415329
  },
  {
    name: 'Yunusobod',
    subtitle: "Toshkent, Yunusobod tumani",
    phone: '+998 33 152 11 11',
    wifiName: 'Familygav_EXT',
    wifiPass: '12345678f',
    lat: 41.366643,
    lng: 69.327931
  },
  {
    name: 'Parkentskiy',
    subtitle: "Toshkent, Parkentskiy bozori",
    phone: '+998 33 703 05 55',
    wifiName: 'FAMILY',
    wifiPass: 'Family4545',
    lat: 41.314917,
    lng: 69.335159
  },
  {
    name: 'TTZ',
    subtitle: "Toshkent, TTZ dahasi",
    phone: '+998 33 702 05 55',
    wifiName: 'FAMILY-4G',
    wifiPass: 'Family4545',
    lat: 41.349837,
    lng: 69.385783
  }
];

export default function GuestLinksPage() {
  const [activeModal, setActiveModal] = useState(null); // 'branches' or 'telegram'

  const openMaps = (lat, lng) => {
    window.open(`https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`, '_blank');
  };

  const handleTelegramClick = (username) => {
    window.open(`https://t.me/${username.replace('@', '')}`, '_blank');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-yellow-500/30">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-300/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-300/30 blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md flex flex-col items-center mt-8 mb-12">
        {/* Logo */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
          className="w-32 h-32 rounded-[2rem] bg-white border border-slate-200 shadow-2xl shadow-yellow-500/10 mb-6 flex items-center justify-center overflow-hidden"
        >
          <img src="/logo.jpg" alt="Family Hotel Logo" className="w-full h-full object-cover" />
        </motion.div>

        {/* Titles */}
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl font-bold text-slate-800 mb-2 tracking-tight"
        >
          Family Hotel
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-slate-500 mb-10 text-center"
        >
          Mehmonlar uchun qulay xizmatlar
        </motion.p>

        {/* Links */}
        <div className="w-full space-y-4">
          <LinkButton 
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            } 
            label="Instagram" 
            color="from-pink-500 to-orange-400"
            delay={0.4}
            onClick={() => window.open('https://instagram.com/family_hotels_uz', '_blank')}
          />
          <LinkButton 
            icon={<MapPin className="w-5 h-5" />} 
            label="Filiallar" 
            color="from-red-500 to-rose-600"
            delay={0.5}
            onClick={() => setActiveModal('branches')}
          />
          <LinkButton 
            icon={<PhoneCall className="w-5 h-5" />} 
            label="Call center" 
            color="from-green-400 to-emerald-600"
            delay={0.6}
            onClick={() => window.location.href = 'tel:+998550555858'}
          />
          <LinkButton 
            icon={<Send className="w-5 h-5" />} 
            label="Telegram" 
            color="from-blue-400 to-cyan-500"
            delay={0.7}
            onClick={() => window.open('https://t.me/family_hotel_callcenter', '_blank')}
          />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'branches' && (
          <Modal onClose={() => setActiveModal(null)} title="Bizning filiallarimiz">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
              {BRANCH_LOCATIONS.map((branch, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
                  <div>
                    <h3 className="text-slate-800 font-medium text-lg">{branch.name}</h3>
                    <p className="text-slate-500 text-sm">{branch.subtitle}</p>
                  </div>
                  
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => openMaps(branch.lat, branch.lng)}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" /> Xarita
                    </button>
                    <a 
                      href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white shadow-sm text-sm py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                      <PhoneCall className="w-4 h-4" /> Qo'ng'iroq
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}

function LinkButton({ icon, label, color, delay, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full relative group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg p-4 flex items-center"
    >
      {/* Icon Container with gradient */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md`}>
        {icon}
      </div>
      
      {/* Label */}
      <span className="ml-4 text-slate-800 font-medium text-lg">{label}</span>
      
      {/* Action Icon */}
      <div className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </div>
    </motion.button>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
