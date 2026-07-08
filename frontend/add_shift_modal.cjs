const fs = require('fs');
const filePath = 'src/pages/admin/ShiftPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state
content = content.replace(
  "const [closeNotes, setCloseNotes] = useState('');",
  "const [closeNotes, setCloseNotes] = useState('');\n  const [showCloseModal, setShowCloseModal] = useState(false);"
);

// 2. Add handleClose & confirmClose
content = content.replace(
  /const handleClose = async \(\) => \{[\s\S]*?\};/,
  `const confirmClose = async () => {
    setClosing(true);
    try {
      await api.put(\`/shifts/\${activeShift.id}/close\`, { notes: closeNotes });
      setActiveShift(null);
      setCloseNotes('');
      setShowCloseModal(false);
      fetchShifts();
      toast.success('Smena yopildi!');
    } catch {
      toast.error('Xato');
    } finally {
      setClosing(false);
    }
  };

  const handleClose = () => {
    setShowCloseModal(true);
  };`
);

// 3. Add stats calculation
content = content.replace(
  "const monthlyIncome = shifts.filter((s) => s.status === 'closed').reduce((sum, s) => sum + s.totalIncome, 0);",
  `const terminal = activeShift?.bookings?.filter(b => b.paymentMethod === 'terminal').reduce((sum, b) => sum + b.paidAmount, 0) || 0;
  const qrcode = activeShift?.bookings?.filter(b => b.paymentMethod === 'qrcode').reduce((sum, b) => sum + b.paidAmount, 0) || 0;
  const expenses = activeShift?.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalIncome = activeShift?.totalIncome || 0;
  const cashBalance = totalIncome - terminal - qrcode - expenses;

  const monthlyIncome = shifts.filter((s) => s.status === 'closed').reduce((sum, s) => sum + s.totalIncome, 0);`
);

// 4. Add modal at the end of return statement
const modalHtml = `
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-300 w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Smenani yopish tasdig'i</h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Jami tushum:</span>
                  <span className="font-bold text-slate-900">{totalIncome.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Terminal orqali:</span>
                  <span className="font-medium text-blue-600">-{terminal.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">QrCode orqali:</span>
                  <span className="font-medium text-orange-600">-{qrcode.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Xarajatlar:</span>
                  <span className="font-medium text-red-600">-{expenses.toLocaleString()} so'm</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between">
                  <span className="font-bold text-slate-900">Kassadagi naqd pul:</span>
                  <span className="font-bold text-emerald-600 text-lg">{cashBalance.toLocaleString()} so'm</span>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">Haqiqatan ham ushbu smenani yopmoqchimisiz? Yopilgandan so'ng tahrirlab bo'lmaydi.</p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={confirmClose}
                  disabled={closing}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {closing ? 'Yopilmoqda...' : 'Ha, smenani yopish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace(/    <\/div>\s*<\/div>\s*\);\s*}\s*$/, modalHtml.replace(/\$/g, '$$$$'));

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ShiftPage.jsx to add close modal');
