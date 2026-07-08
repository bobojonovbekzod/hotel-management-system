const fs = require('fs');
const filePath = 'src/pages/admin/ShiftPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Grid for Top Cards
const oldGrid = `<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Boshlanish vaqti</p>
              <p className="font-bold text-slate-900">{format(new Date(activeShift.startTime), 'HH:mm')}</p>
              <p className="text-xs text-slate-600">{format(new Date(activeShift.startTime), 'dd.MM.yyyy')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Smenada bronlar</p>
              <p className="text-3xl font-bold text-primary-400">{activeShift._count?.bookings || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center col-span-2 md:col-span-1">
              <p className="text-xs text-slate-600 mb-1">Smenada tushum</p>
              <p className="text-xl font-bold text-emerald-400">{activeShift.totalIncome?.toLocaleString()}</p>
              <p className="text-xs text-slate-600">so'm</p>
            </div>
          </div>`;

const newGrid = `<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Boshlanish vaqti</p>
              <p className="font-bold text-slate-900">{format(new Date(activeShift.startTime), 'HH:mm')}</p>
              <p className="text-xs text-slate-600">{format(new Date(activeShift.startTime), 'dd.MM.yyyy')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Bronlar</p>
              <p className="text-3xl font-bold text-primary-400">{activeShift._count?.bookings || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Jami tushum</p>
              <p className="text-xl font-bold text-emerald-400">{activeShift.totalIncome?.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Terminal</p>
              <p className="text-xl font-bold text-blue-500">{terminal.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">QrCode</p>
              <p className="text-xl font-bold text-orange-500">{qrcode.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Naqd (Kassada)</p>
              <p className="text-xl font-bold text-green-600">{cashBalance.toLocaleString()}</p>
            </div>
          </div>`;

content = content.replace(oldGrid, newGrid);

// 2. Update shifts history to show only today's shifts
const oldHistoryTitle = `<h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-primary-400" /> Bu oylik smenalar
        </h3>`;
const newHistoryTitle = `<h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-primary-400" /> Bugungi smenalar
        </h3>`;
content = content.replace(oldHistoryTitle, newHistoryTitle);

const oldShiftsMap = `shifts.map((shift) => (`;
const newShiftsMap = `shifts.filter(s => format(new Date(s.startTime), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).map((shift) => (`;
content = content.replace(oldShiftsMap, newShiftsMap);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ShiftPage layout and filtering');
