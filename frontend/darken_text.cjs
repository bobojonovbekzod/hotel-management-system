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
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We do replacements in reverse order to avoid double replacements
    // text-slate-800 -> text-slate-900
    // text-slate-700 -> text-slate-800
    // text-slate-600 -> text-slate-700
    // text-slate-500 -> text-slate-600

    content = content.replace(/text-slate-800/g, 'text-slate-900');
    content = content.replace(/text-slate-700/g, 'text-slate-800');
    content = content.replace(/text-slate-600/g, 'text-slate-700');
    content = content.replace(/text-slate-500/g, 'text-slate-600');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.basename(file)}`);
    }
});
