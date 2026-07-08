const fs = require('fs');

const filePath = 'src/pages/owner/DashboardPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const top5Start = content.indexOf('      {/* Top 5 Admins */}');
const top5End = content.indexOf('      {/* Smenalar kassa hisoboti */}');

if (top5Start !== -1 && top5End !== -1) {
  const top5Block = content.slice(top5Start, top5End);
  
  // Remove the block from its current position
  content = content.slice(0, top5Start) + content.slice(top5End);
  
  // Find where to insert it (after Branch Stats Table)
  const monthlyShiftsStart = content.indexOf('      {/* Monthly Shifts */}');
  
  if (monthlyShiftsStart !== -1) {
    content = content.slice(0, monthlyShiftsStart) + top5Block + content.slice(monthlyShiftsStart);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully moved Top 5 Admins below Branch Stats Table');
  } else {
    console.log('Could not find Monthly Shifts marker');
  }
} else {
  console.log('Could not find Top 5 Admins or Smenalar kassa hisoboti markers');
}
