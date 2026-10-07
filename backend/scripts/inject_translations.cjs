const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../frontend/src/pages/guest/GuestRoomPortal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const additions = {
  en: `    staffReply: 'Reception Reply',
    guestYou: 'You',
    welcomeModalText: 'If you need anything for your room, please contact the admin. You can also report any room issues to the management.',
    welcomeModalBtn: 'Enter'`,
  ru: `    staffReply: 'Ответ ресепшн',
    guestYou: 'Вы',
    welcomeModalText: 'Если вам что-то нужно в номер, вы можете обратиться к администратору, а также сообщить руководству о любых недостатках.',
    welcomeModalBtn: 'Войти'`,
  uz: `    staffReply: 'Reseption javobi',
    guestYou: 'Siz',
    welcomeModalText: "Xonadan biron narsa kerak bo'lsa adminga murojaat qilishingiz mumkin va xonadagi kamchiliklar haqida rahbariyatga xabar bering.",
    welcomeModalBtn: 'Kirish'`,
  hi: `    staffReply: 'रिसेप्शन उत्तर',
    guestYou: 'आप',
    welcomeModalText: 'यदि आपको अपने कमरे के लिए कुछ भी चाहिए, तो व्यवस्थापक से संपर्क करें। आप प्रबंधन को कमरे की समस्या की रिपोर्ट कर सकते हैं।',
    welcomeModalBtn: 'प्रवेश करें'`,
  ur: `    staffReply: 'ریسیپشن کا جواب',
    guestYou: 'آپ',
    welcomeModalText: 'اگر آپ کو اپنے کمرے کے لیے کسی چیز کی ضرورت ہے تو براہ کرم ایڈمن سے رابطہ کریں۔ آپ مینجمنٹ کو کمرے کے کسی بھی مسئلے کی اطلاع بھی دے سکتے ہیں۔',
    welcomeModalBtn: 'داخل ہوں'`,
  de: `    staffReply: 'Antwort der Rezeption',
    guestYou: 'Sie',
    welcomeModalText: 'Wenn Sie etwas für Ihr Zimmer benötigen, wenden Sie sich bitte an den Administrator. Sie können auch Mängel im Zimmer melden.',
    welcomeModalBtn: 'Eintreten'`,
  fr: `    staffReply: 'Réponse de la réception',
    guestYou: 'Vous',
    welcomeModalText: "Si vous avez besoin de quoi que ce soit pour votre chambre, veuillez contacter l'administrateur. Vous pouvez également signaler tout problème.",
    welcomeModalBtn: 'Entrer'`,
  zh: `    staffReply: '前台回复',
    guestYou: '您',
    welcomeModalText: '如果您需要客房内的任何物品，请联系管理员。您也可以向管理层报告房间的任何问题。',
    welcomeModalBtn: '进入'`,
  ar: `    staffReply: 'رد موظف الاستقبال',
    guestYou: 'أنت',
    welcomeModalText: 'إذا كنت بحاجة إلى أي شيء لغرفتك، يرجى الاتصال بالمسؤول. يمكنك أيضًا الإبلاغ عن أي مشاكل في الغرفة للإدارة.',
    welcomeModalBtn: 'دخول'`,
  tr: `    staffReply: 'Resepsiyon Yanıtı',
    guestYou: 'Siz',
    welcomeModalText: 'Odanız için herhangi bir şeye ihtiyacınız olursa lütfen resepsiyonla iletişime geçin. Ayrıca odadaki herhangi bir eksikliği de bildirebilirsiniz.',
    welcomeModalBtn: 'Giriş Yap'`
};

for (const lang of Object.keys(additions)) {
  const findStr = `    staffReply: '${
    lang === 'en' ? 'Reception Reply' : 
    lang === 'ru' ? 'Ответ ресепшн' : 
    lang === 'uz' ? 'Reseption javobi' : 
    lang === 'hi' ? 'रिसेप्शन उत्तर' : 
    lang === 'ur' ? 'ریسیپشن کا جواب' : 
    lang === 'de' ? 'Antwort der Rezeption' : 
    lang === 'fr' ? 'Réponse de la réception' : 
    lang === 'zh' ? '前台回复' : 
    lang === 'ar' ? 'رد موظف الاستقبال' : 
    'Resepsiyon Yanıtı'
  }',\n    guestYou: '${
    lang === 'en' ? 'You' : 
    lang === 'ru' ? 'Вы' : 
    lang === 'uz' ? 'Siz' : 
    lang === 'hi' ? 'आप' : 
    lang === 'ur' ? 'آپ' : 
    lang === 'de' ? 'Sie' : 
    lang === 'fr' ? 'Vous' : 
    lang === 'zh' ? '您' : 
    lang === 'ar' ? 'أنت' : 
    'Siz'
  }'`;
  
  if (content.includes(findStr)) {
    content = content.replace(findStr, additions[lang]);
  } else {
    console.warn('Could not find string for lang:', lang);
  }
}

// Update the JSX
const jsxFind = `<h2 className="text-[15px] font-bold text-slate-800 leading-snug px-2">
                Xonadan biron narsa kerak bo'lsa adminga murojat qilishingiz mumkin va xonadagi kamchiliklar haqida rahbariyatga xabar bering
              </h2>
              <button
                onClick={handleCloseWelcomeModal}
                className="w-full mt-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-sm active:scale-95 transition-all"
              >
                Kirish
              </button>`;
const jsxReplace = `<h2 className="text-[15px] font-bold text-slate-800 leading-snug px-2">
                {t.welcomeModalText}
              </h2>
              <button
                onClick={handleCloseWelcomeModal}
                className="w-full mt-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-sm active:scale-95 transition-all"
              >
                {t.welcomeModalBtn}
              </button>`;

if (content.includes(jsxFind)) {
    content = content.replace(jsxFind, jsxReplace);
} else {
    console.warn("Could not find JSX string to replace!");
}

fs.writeFileSync(filePath, content);
console.log('Translations injected successfully!');
