const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

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

    // Remove animate-fade-in from className strings
    content = content.replace(/ animate-fade-in/g, '');
    content = content.replace(/animate-fade-in /g, '');
    content = content.replace(/"animate-fade-in"/g, '""');
    
    // Also remove from App.jsx if there is any
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Removed animate-fade-in from ${path.basename(file)}`);
    }
});
