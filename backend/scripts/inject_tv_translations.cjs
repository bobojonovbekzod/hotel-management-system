const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../frontend/src/pages/guest/GuestRoomPortal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const additions = {
  en: `    tvIssue: 'TV',\n    tvIssueDesc: 'TV or remote issue',\n`,
  ru: `    tvIssue: 'Телевизор',\n    tvIssueDesc: 'Проблема с ТВ или пультом',\n`,
  uz: `    tvIssue: 'Televizor',\n    tvIssueDesc: 'TV yoki pult nosozligi',\n`,
  hi: `    tvIssue: 'टीवी',\n    tvIssueDesc: 'टीवी या रिमोट की समस्या',\n`,
  ur: `    tvIssue: 'ٹی وی',\n    tvIssueDesc: 'ٹی وی یا ریموٹ کا مسئلہ',\n`,
  de: `    tvIssue: 'Fernseher',\n    tvIssueDesc: 'TV- oder Fernbedienungsproblem',\n`,
  fr: `    tvIssue: 'Télévision',\n    tvIssueDesc: 'Problème de TV ou télécommande',\n`,
  zh: `    tvIssue: '电视',\n    tvIssueDesc: '电视或遥控器故障',\n`,
  ar: `    tvIssue: 'تلفزيون',\n    tvIssueDesc: 'مشكلة في التلفزيون أو جهاز التحكم',\n`,
  tr: `    tvIssue: 'Televizyon',\n    tvIssueDesc: 'TV veya kumanda sorunu',\n`
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

fs.writeFileSync(filePath, content);
console.log('Translations for TV injected successfully!');
