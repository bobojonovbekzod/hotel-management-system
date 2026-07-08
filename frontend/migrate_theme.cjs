const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    if (file.includes('DashboardPage.jsx') || file.includes('Layout.jsx') || file.includes('index.css')) return;

    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Backgrounds and borders
    content = content.replace(/bg-slate-900\/\d+/g, 'bg-white shadow-sm');
    content = content.replace(/bg-slate-900/g, 'bg-white');
    content = content.replace(/bg-slate-800\/\d+/g, 'bg-slate-50');
    content = content.replace(/bg-slate-800/g, 'bg-slate-100');
    
    content = content.replace(/border-slate-800\/\d+/g, 'border-slate-200');
    content = content.replace(/border-slate-800/g, 'border-slate-200');
    content = content.replace(/border-slate-700\/\d+/g, 'border-slate-300');
    content = content.replace(/border-slate-700/g, 'border-slate-300');
    
    // Text colors (Dark -> Light mapping)
    content = content.replace(/text-slate-200/g, 'text-slate-800');
    content = content.replace(/text-slate-300/g, 'text-slate-700');
    content = content.replace(/text-slate-400/g, 'text-slate-500');

    // Smart replace text-white inside quotes/backticks
    content = content.replace(/(['"`])(.*?)\1/g, (match, q, str) => {
        if (str.includes('text-white')) {
            // Check if there is a solid background in the same string
            const solidBgRegex = /bg-(primary|emerald|red|amber|orange|blue|indigo|purple|green|rose|yellow|teal|cyan|pink)-(400|500|600|700)/;
            const hasSolidBg = solidBgRegex.test(str);
            
            // Also check if it's a known btn/badge class
            const hasBtn = str.includes('btn') || str.includes('bg-slate-900');
            
            if (!hasSolidBg && !hasBtn) {
                return match.replace(/\btext-white\b/g, 'text-slate-800');
            }
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.basename(file)}`);
    }
});
