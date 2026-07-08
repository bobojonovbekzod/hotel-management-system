const fs = require('fs');

const filePath = 'src/pages/owner/DashboardPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard ones
content = content.replace(/className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2"/g, 'className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center justify-center gap-2"');

content = content.replace(/className="text-lg font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2"/g, 'className="text-lg font-bold text-slate-900 tracking-tight mb-6 flex items-center justify-center gap-2"');

// Replace the ones with justify-between parent
content = content.replace(/className="flex items-center justify-between mb-6"\s*>\s*<h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2"/g, 'className="flex items-center justify-center mb-6">\n            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully aligned titles to center');
