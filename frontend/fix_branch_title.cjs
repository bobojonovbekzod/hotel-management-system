const fs = require('fs');
const filePath = 'src/pages/owner/DashboardPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<h3 className="text-\[17px\] font-bold text-slate-800 tracking-tight">\s*Mehmonxonaning bandligi( "[^"]*")?\s*<\/h3>/g,
  '<h3 className="text-[17px] font-bold text-slate-800 tracking-tight">\n              Mehmonxonaning bandligi "{selectedBranch ? branches?.find(b => String(b.id) === String(selectedBranch))?.name : \'Barcha filiallar\'}"\n            </h3>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated branch name title');
