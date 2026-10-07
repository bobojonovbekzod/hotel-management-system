import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Wifi,
  Coffee,
  Sparkles,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  PhoneCall,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  MessageSquare,
  BedDouble,
  ShieldCheck,
  HelpCircle,
  Volume2,
  Globe,
  Camera
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Multilingual dictionaries
const TRANSLATIONS = {
  en: {
    title: 'Room Concierge',
    room: 'Room',
    floor: 'Floor',
    welcomeGreeting: 'Welcome to your stay!',
    welcomeSub: 'How can we assist you today?',
    quickServices: 'Guest Services',
    housekeeping: 'Housekeeping',
    housekeepingDesc: 'Room cleaning service',
    amenities: 'Extra Amenities',
    amenitiesDesc: 'Towels, slippers, toiletries',
    acHeating: 'AC & Climate',
    acHeatingDesc: 'Temperature or AC issue',
    plumbing: 'Water & Bath',
    plumbingDesc: 'Plumbing or hot water',
    waterDelivery: 'Bottled Water',
    waterDeliveryDesc: 'Fresh drinking water to room',
    otherIssue: 'Other Request',
    otherIssueDesc: 'Report any issue or question',
    wifiTitle: 'Free High-Speed Wi-Fi',
    wifiCopy: 'Copy Password',
    copied: 'Copied!',
    breakfastTitle: 'Breakfast Time',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'Check-out',
    checkoutHours: '12:00',
    receptionCall: 'Call Reception',
    tabServices: 'Services',
    tabChat: 'Live Chat',
    chatPlaceholder: 'Type your message in any language...',
    chatDesc: 'Write in your native language. AI translates instantly for staff.',
    send: 'Send',
    requestModalTitle: 'Request Service',
    describeIssue: 'Please describe your request...',
    optionalPhoto: 'Attach photo (optional)',
    submitRequest: 'Submit Request',
    sending: 'Sending...',
    successSent: 'Your request has been received by reception!',
    aiBadge: 'AI Translated',
    staffReply: 'Reception Reply',
    guestYou: 'You',
    welcomeModalText: 'If you need anything for your room, please contact the admin. You can also report any room issues to the management.',
    welcomeModalBtn: 'Enter',
    tvIssue: 'TV',
    tvIssueDesc: 'TV or remote issue',
    roomIssues: 'Room Issues',
    backToServices: 'Back',
  },
  ru: {
    title: 'Консьерж Номера',
    room: 'Номер',
    floor: 'Этаж',
    welcomeGreeting: 'Добро пожаловать!',
    welcomeSub: 'Чем мы можем вам помочь?',
    quickServices: 'Услуги номера',
    housekeeping: 'Уборка номера',
    housekeepingDesc: 'Заказать уборку',
    amenities: 'Принадлежности',
    amenitiesDesc: 'Полотенца, тапочки, мыло',
    acHeating: 'Кондиционер',
    acHeatingDesc: 'Проблема с климатом',
    plumbing: 'Вода и Ванная',
    plumbingDesc: 'Горячая вода, сантехника',
    waterDelivery: 'Питьевая вода',
    waterDeliveryDesc: 'Доставка воды в номер',
    otherIssue: 'Другой запрос',
    otherIssueDesc: 'Любой другой вопрос',
    wifiTitle: 'Бесплатный Wi-Fi',
    wifiCopy: 'Скопировать пароль',
    copied: 'Скопировано!',
    breakfastTitle: 'Время завтрака',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'Выезд',
    checkoutHours: '12:00',
    receptionCall: 'Ресепшн',
    tabServices: 'Услуги',
    tabChat: 'Онлайн Чат',
    chatPlaceholder: 'Напишите на родном языке...',
    chatDesc: 'Пишите на любом языке. AI переводит мгновенно администратору.',
    send: 'Отправить',
    requestModalTitle: 'Оформить запрос',
    describeIssue: 'Опишите ваш запрос...',
    optionalPhoto: 'Прикрепить фото (необязательно)',
    submitRequest: 'Отправить запрос',
    sending: 'Отправка...',
    successSent: 'Ваш запрос передан администратору!',
    aiBadge: 'AI Перевод',
    staffReply: 'Ответ ресепшн',
    guestYou: 'Вы',
    welcomeModalText: 'Если вам что-то нужно в номер, вы можете обратиться к администратору, а также сообщить руководству о любых недостатках.',
    welcomeModalBtn: 'Войти',
    tvIssue: 'Телевизор',
    tvIssueDesc: 'Проблема с ТВ или пультом',
    roomIssues: 'Проблемы в номере',
    backToServices: 'Назад',
  },
  uz: {
    title: 'Xona Xizmatlari',
    room: 'Xona',
    floor: 'Qavat',
    welcomeGreeting: 'Xush kelibsiz!',
    welcomeSub: 'Sizga qanday yordam bera olamiz?',
    quickServices: 'Xona xizmatlari',
    housekeeping: 'Xonani tozalash',
    housekeepingDesc: 'Tozalik xodimini chaqirish',
    amenities: 'Qo\'shimcha buyumlar',
    amenitiesDesc: 'Sochiq, shippak, sovun',
    acHeating: 'Konditsioner',
    acHeatingDesc: 'Konditsioner yoki isitish',
    plumbing: 'Suv va Santexnika',
    plumbingDesc: 'Issiq suv yoki kran',
    waterDelivery: 'Ichimlik suvi',
    waterDeliveryDesc: 'Xonaga suv yetkazish',
    otherIssue: 'Boshqa noqulaylik',
    otherIssueDesc: 'Boshqa har qanday masala',
    wifiTitle: 'Bepul Tezkor Wi-Fi',
    wifiCopy: 'Parolni nusxalash',
    copied: 'Nusxalandi!',
    breakfastTitle: 'Nonushta vaqti',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'Chiqish vaqti',
    checkoutHours: '12:00',
    receptionCall: 'Reseption',
    tabServices: 'Xizmatlar',
    tabChat: 'Jonli Chat',
    chatPlaceholder: 'Istalgan tilda yozing...',
    chatDesc: 'O\'z tilingizda yozing, AI uni Reseptionga bir zumda yetkazadi.',
    send: 'Yuborish',
    requestModalTitle: 'Xizmat so\'rovi',
    describeIssue: 'Iltimos, so\'rovingizni yozing...',
    optionalPhoto: 'Rasm ilova qilish (ixtiyoriy)',
    submitRequest: 'Yuborish',
    sending: 'Yuborilmoqda...',
    successSent: 'So\'rovingiz qabul qilindi, tez orada bajariladi!',
    aiBadge: 'AI Tarjima',
    staffReply: 'Reseption javobi',
    guestYou: 'Siz',
    welcomeModalText: "Xonadan biron narsa kerak bo'lsa adminga murojaat qilishingiz mumkin va xonadagi kamchiliklar haqida rahbariyatga xabar bering.",
    welcomeModalBtn: 'Kirish',
    tvIssue: 'Televizor',
    tvIssueDesc: 'TV yoki pult nosozligi',
    roomIssues: 'Xonadagi muammolar',
    backToServices: 'Orqaga',
  },
  hi: {
    title: 'कमरा द्वारपाल',
    room: 'कमरा',
    floor: 'मंज़िल',
    welcomeGreeting: 'स्वागत है!',
    welcomeSub: 'आज हम आपकी क्या मदद कर सकते हैं?',
    quickServices: 'अतिथि सेवाएँ',
    housekeeping: 'सफ़ाई सेवा',
    housekeepingDesc: 'कमरे की सफ़ाई का अनुरोध',
    amenities: 'अतिरिक्त सामग्री',
    amenitiesDesc: 'तौलिए, चप्पल, साबुन',
    acHeating: 'एसी और तापमान',
    acHeatingDesc: 'एसी या तापमान की समस्या',
    plumbing: 'पानी और बाथरूम',
    plumbingDesc: 'गर्म पानी या नल की समस्या',
    waterDelivery: 'पीने का पानी',
    waterDeliveryDesc: 'कमरे में पानी की बोतलें',
    otherIssue: 'अन्य अनुरोध',
    otherIssueDesc: 'कोई भी समस्या या सवाल',
    wifiTitle: 'मुफ़्त वाई-फ़ाई',
    wifiCopy: 'पासवर्ड कॉपी करें',
    copied: 'कॉपी हो गया!',
    breakfastTitle: 'नाश्ते का समय',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'चेक-आउट',
    checkoutHours: '12:00',
    receptionCall: 'रिसेप्शन',
    tabServices: 'सेवाएँ',
    tabChat: 'लाइव चैट',
    chatPlaceholder: 'अपनी भाषा में संदेश लिखें...',
    chatDesc: 'अपनी मातृभाषा में लिखें, AI तुरंत कर्मचारियों के लिए अनुवाद करता है।',
    send: 'भेजें',
    requestModalTitle: 'सेवा अनुरोध',
    describeIssue: 'कृपया अपना अनुरोध बताएं...',
    optionalPhoto: 'फ़ोटो जोड़ें (वैकल्पिक)',
    submitRequest: 'अनुरोध भेजें',
    sending: 'भेजा जा रहा है...',
    successSent: 'आपका अनुरोध रिसेप्शन को भेज दिया गया है!',
    aiBadge: 'AI अनुवादित',
    staffReply: 'रिसेप्शन उत्तर',
    guestYou: 'आप',
    welcomeModalText: 'यदि आपको अपने कमरे के लिए कुछ भी चाहिए, तो व्यवस्थापक से संपर्क करें। आप प्रबंधन को कमरे की समस्या की रिपोर्ट कर सकते हैं।',
    welcomeModalBtn: 'प्रवेश करें',
    tvIssue: 'टीवी',
    tvIssueDesc: 'टीवी या रिमोट की समस्या',
    roomIssues: 'कमरे की समस्या',
    backToServices: 'वापस',
  },
  ur: {
    title: 'کمرہ سروس',
    room: 'کمرہ',
    floor: 'منزل',
    welcomeGreeting: 'خوش آمدید!',
    welcomeSub: 'آج ہم آپ کی کیا مدد کر سکتے ہیں؟',
    quickServices: 'مہمانوں کی خدمات',
    housekeeping: 'کمرے کی صفائی',
    housekeepingDesc: 'صفائی عملے کو کال کریں',
    amenities: 'اضافی سامان',
    amenitiesDesc: 'تولیے، چپل، صابن',
    acHeating: 'اے سی اور ہیٹنگ',
    acHeatingDesc: 'اے سی یا درجہ حرارت کا مسئلہ',
    plumbing: 'پانی اور باتھ روم',
    plumbingDesc: 'گرم پانی یا نل کا مسئلہ',
    waterDelivery: 'پینے کا پانی',
    waterDeliveryDesc: 'کمرے میں پانی کی ترسیل',
    otherIssue: 'دیگر درخواست',
    otherIssueDesc: 'کوئی بھی مسئلہ یا سوال',
    wifiTitle: 'مفت وائی فائی',
    wifiCopy: 'پاس ورڈ کاپی کریں',
    copied: 'کاپی ہو گیا!',
    breakfastTitle: 'ناشتے کا وقت',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'چیک آؤٹ',
    checkoutHours: '12:00',
    receptionCall: 'ریسیپشن',
    tabServices: 'خدمات',
    tabChat: 'لائیو چیٹ',
    chatPlaceholder: 'اپنی زبان میں پیغام لکھیں...',
    chatDesc: 'اپنی مادری زبان میں لکھیں، AI فوراً عملے کے لیے ترجمہ کرتا ہے۔',
    send: 'ارسال کریں',
    requestModalTitle: 'سروس کی درخواست',
    describeIssue: 'براہ کرم اپنی درخواست بیان کریں...',
    optionalPhoto: 'تصویر منسلک کریں (اختیاری)',
    submitRequest: 'درخواست بھیجیں',
    sending: 'ارسال ہو رہا ہے...',
    successSent: 'آپ کی درخواست ریسیپشن کو موصول ہو گئی ہے!',
    aiBadge: 'AI ترجمہ شدہ',
    staffReply: 'ریسیپشن کا جواب',
    guestYou: 'آپ',
    welcomeModalText: 'اگر آپ کو اپنے کمرے کے لیے کسی چیز کی ضرورت ہے تو براہ کرم ایڈمن سے رابطہ کریں۔ آپ مینجمنٹ کو کمرے کے کسی بھی مسئلے کی اطلاع بھی دے سکتے ہیں۔',
    welcomeModalBtn: 'داخل ہوں',
    tvIssue: 'ٹی وی',
    tvIssueDesc: 'ٹی وی یا ریموٹ کا مسئلہ',
    roomIssues: 'کمرے کے مسائل',
    backToServices: 'پیچھے',
  },
  de: {
    title: 'Zimmer-Concierge',
    room: 'Zimmer',
    floor: 'Etage',
    welcomeGreeting: 'Herzlich willkommen!',
    welcomeSub: 'Wie können wir Ihnen heute helfen?',
    quickServices: 'Gästeservice',
    housekeeping: 'Zimmerreinigung',
    housekeepingDesc: 'Reinigungsservice anfordern',
    amenities: 'Zusatzausstattung',
    amenitiesDesc: 'Handtücher, Hausschuhe, Pflegeartikel',
    acHeating: 'Klimaanlage & Heizung',
    acHeatingDesc: 'Temperatur- oder Klimaproblem',
    plumbing: 'Wasser & Bad',
    plumbingDesc: 'Warmwasser oder Sanitärproblem',
    waterDelivery: 'Trinkwasser',
    waterDeliveryDesc: 'Wasserflaschen aufs Zimmer',
    otherIssue: 'Sonstige Anfrage',
    otherIssueDesc: 'Fragen oder Anliegen melden',
    wifiTitle: 'Kostenloses Highspeed-WLAN',
    wifiCopy: 'Passwort kopieren',
    copied: 'Kopiert!',
    breakfastTitle: 'Frühstückszeit',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'Check-out',
    checkoutHours: '12:00',
    receptionCall: 'Rezeption anrufen',
    tabServices: 'Services',
    tabChat: 'Live-Chat',
    chatPlaceholder: 'Nachricht in Ihrer Sprache eingeben...',
    chatDesc: 'Schreiben Sie auf Deutsch. Die KI übersetzt sofort für das Personal.',
    send: 'Senden',
    requestModalTitle: 'Service anfordern',
    describeIssue: 'Bitte beschreiben Sie Ihr Anliegen...',
    optionalPhoto: 'Foto anhängen (optional)',
    submitRequest: 'Anfrage senden',
    sending: 'Wird gesendet...',
    successSent: 'Ihre Anfrage wurde an die Rezeption weitergeleitet!',
    aiBadge: 'KI-Übersetzt',
    staffReply: 'Antwort der Rezeption',
    guestYou: 'Sie',
    welcomeModalText: 'Wenn Sie etwas für Ihr Zimmer benötigen, wenden Sie sich bitte an den Administrator. Sie können auch Mängel im Zimmer melden.',
    welcomeModalBtn: 'Eintreten',
    tvIssue: 'Fernseher',
    tvIssueDesc: 'TV- oder Fernbedienungsproblem',
    roomIssues: 'Zimmerprobleme',
    backToServices: 'Zurück',
  },
  fr: {
    title: 'Concierge de Chambre',
    room: 'Chambre',
    floor: 'Étage',
    welcomeGreeting: 'Bienvenue !',
    welcomeSub: 'Comment pouvons-nous vous aider ?',
    quickServices: 'Services en chambre',
    housekeeping: 'Ménage',
    housekeepingDesc: 'Demander le nettoyage de la chambre',
    amenities: 'Équipements supplémentaires',
    amenitiesDesc: 'Serviettes, chaussons, articles de toilette',
    acHeating: 'Climatisation & Chauffage',
    acHeatingDesc: 'Problème de température ou climatisation',
    plumbing: 'Eau & Salle de bain',
    plumbingDesc: 'Eau chaude ou plomberie',
    waterDelivery: 'Eau minérale',
    waterDeliveryDesc: 'Livraison de bouteilles d\'eau',
    otherIssue: 'Autre demande',
    otherIssueDesc: 'Signaler toute question ou problème',
    wifiTitle: 'Wi-Fi haut débit gratuit',
    wifiCopy: 'Copier le mot de passe',
    copied: 'Copié !',
    breakfastTitle: 'Petit-déjeuner',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'Départ',
    checkoutHours: '12:00',
    receptionCall: 'Appeler la réception',
    tabServices: 'Services',
    tabChat: 'Chat en direct',
    chatPlaceholder: 'Tapez votre message dans votre langue...',
    chatDesc: 'Écrivez en français. L\'IA traduit instantanément pour le personnel.',
    send: 'Envoyer',
    requestModalTitle: 'Demande de service',
    describeIssue: 'Veuillez décrire votre demande...',
    optionalPhoto: 'Joindre une photo (facultatif)',
    submitRequest: 'Envoyer la demande',
    sending: 'Envoi en cours...',
    successSent: 'Votre demande a été transmise à la réception !',
    aiBadge: 'Traduit par IA',
    staffReply: 'Réponse de la réception',
    guestYou: 'Vous',
    welcomeModalText: "Si vous avez besoin de quoi que ce soit pour votre chambre, veuillez contacter l'administrateur. Vous pouvez également signaler tout problème.",
    welcomeModalBtn: 'Entrer',
    tvIssue: 'Télévision',
    tvIssueDesc: 'Problème de TV ou télécommande',
    roomIssues: 'Problèmes de chambre',
    backToServices: 'Retour',
  },
  zh: {
    title: '客房服务',
    room: '房间',
    floor: '楼层',
    welcomeGreeting: '欢迎入住！',
    welcomeSub: '今天有什么可以为您效劳？',
    quickServices: '快捷客房服务',
    housekeeping: '客房清洁',
    housekeepingDesc: '呼叫打扫卫生',
    amenities: '补充用品',
    amenitiesDesc: '毛巾、拖鞋、洗漱用品',
    acHeating: '空调与暖气',
    acHeatingDesc: '温度调节或空调故障',
    plumbing: '水与卫浴',
    plumbingDesc: '热水供应或水龙头问题',
    waterDelivery: '瓶装饮用水',
    waterDeliveryDesc: '送饮用水到房间',
    otherIssue: '其他需求',
    otherIssueDesc: '反馈任何问题',
    wifiTitle: '高速无线网络 Wi-Fi',
    wifiCopy: '复制密码',
    copied: '已复制！',
    breakfastTitle: '早餐时间',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: '退房时间',
    checkoutHours: '12:00',
    receptionCall: '联系前台',
    tabServices: '服务菜单',
    tabChat: '在线聊天',
    chatPlaceholder: '请用您的母语输入...',
    chatDesc: '请用中文留言，AI将即时翻译给前台服务人员。',
    send: '发送',
    requestModalTitle: '提交服务请求',
    describeIssue: '请详细描述您的需求...',
    optionalPhoto: '上传照片（可选）',
    submitRequest: '提交请求',
    sending: '正在发送...',
    successSent: '前台已收到您的请求，将尽快为您处理！',
    aiBadge: 'AI 智能翻译',
    staffReply: '前台回复',
    guestYou: '您',
    welcomeModalText: '如果您需要客房内的任何物品，请联系管理员。您也可以向管理层报告房间的任何问题。',
    welcomeModalBtn: '进入',
    tvIssue: '电视',
    tvIssueDesc: '电视或遥控器故障',
    roomIssues: '房间问题',
    backToServices: '返回',
  },
  ar: {
    title: 'خدمات الغرف',
    room: 'الغرفة',
    floor: 'الطابق',
    welcomeGreeting: 'أهلاً وسهلاً بك!',
    welcomeSub: 'كيف يمكننا مساعدتك اليوم؟',
    quickServices: 'الخدمات السريعة',
    housekeeping: 'تنظيف الغرفة',
    housekeepingDesc: 'طلب خدمة تنظيف الغرفة',
    amenities: 'مستلزمات إضافية',
    amenitiesDesc: 'مناشف، خفاف، صابون',
    acHeating: 'التكييف والتدفئة',
    acHeatingDesc: 'مشكلة في التكييف أو الحرارة',
    plumbing: 'السباكة والمياه',
    plumbingDesc: 'المياه الساخنة أو الحمام',
    waterDelivery: 'مياه الشرب',
    waterDeliveryDesc: 'توصيل مياه للغرفة',
    otherIssue: 'طلب آخر',
    otherIssueDesc: 'الإبلاغ عن أي استفسار',
    wifiTitle: 'واي فاي مجاني',
    wifiCopy: 'نسخ كلمة المرور',
    copied: 'تم النسخ!',
    breakfastTitle: 'موعد الإفطار',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'المغادرة',
    checkoutHours: '12:00',
    receptionCall: 'الاستقبال',
    tabServices: 'الخدمات',
    tabChat: 'محادثة مباشرة',
    chatPlaceholder: 'اكتب رسالتك بلغتك...',
    chatDesc: 'اكتب بلغتك، وسنقوم بالترجمة الفورية لموظفي الاستقبال.',
    send: 'إرسال',
    requestModalTitle: 'طلب خدمة',
    describeIssue: 'يرجى وصف طلبك...',
    optionalPhoto: 'إرفاق صورة (اختياري)',
    submitRequest: 'إرسال الطلب',
    sending: 'جاري الإرسال...',
    successSent: 'تم استلام طلبك وسنقوم بخدمتك فوراً!',
    aiBadge: 'ترجمة فورية بالذكاء الاصطناعي',
    staffReply: 'رد موظف الاستقبال',
    guestYou: 'أنت',
    welcomeModalText: 'إذا كنت بحاجة إلى أي شيء لغرفتك، يرجى الاتصال بالمسؤول. يمكنك أيضًا الإبلاغ عن أي مشاكل في الغرفة للإدارة.',
    welcomeModalBtn: 'دخول',
    tvIssue: 'تلفزيون',
    tvIssueDesc: 'مشكلة في التلفزيون أو جهاز التحكم',
    roomIssues: 'مشاكل الغرفة',
    backToServices: 'خلف',
  },
  tr: {
    title: 'Oda Servisi',
    room: 'Oda',
    floor: 'Kat',
    welcomeGreeting: 'Hoş geldiniz!',
    welcomeSub: 'Bugün size nasıl yardımcı olabiliriz?',
    quickServices: 'Hızlı Hizmetler',
    housekeeping: 'Oda Temizliği',
    housekeepingDesc: 'Temizlik personeli çağır',
    amenities: 'Ekstra İhtiyaçlar',
    amenitiesDesc: 'Havlu, terlik, sabun',
    acHeating: 'Klima & Isıtma',
    acHeatingDesc: 'Klima veya sıcaklık arızası',
    plumbing: 'Su & Tesisat',
    plumbingDesc: 'Sıcak su veya banyo sorunu',
    waterDelivery: 'İçme Suyu',
    waterDeliveryDesc: 'Odaya su servisi',
    otherIssue: 'Diğer Talepler',
    otherIssueDesc: 'Her türlü sorun ve istek',
    wifiTitle: 'Ücretsiz Wi-Fi',
    wifiCopy: 'Şifreyi Kopyala',
    copied: 'Kopyalandı!',
    breakfastTitle: 'Kahvaltı Saatleri',
    breakfastHours: '07:00 - 10:30',
    checkoutTitle: 'Çıkış',
    checkoutHours: '12:00',
    receptionCall: 'Resepsiyon',
    tabServices: 'Hizmetler',
    tabChat: 'Canlı Sohbet',
    chatPlaceholder: 'Kendi dilinizde yazın...',
    chatDesc: 'Kendi dilinizde yazın, AI mesajınızı resepsiyona anında iletir.',
    send: 'Gönder',
    requestModalTitle: 'Hizmet Talebi',
    describeIssue: 'Lütfen talebinizi açıklayın...',
    optionalPhoto: 'Fotoğraf ekle (isteğe bağlı)',
    submitRequest: 'Talebi Gönder',
    sending: 'Gönderiliyor...',
    successSent: 'Talebiniz resepsiyona iletildi!',
    aiBadge: 'AI Çeviri',
    staffReply: 'Resepsiyon Yanıtı',
    guestYou: 'Siz',
    welcomeModalText: 'Odanız için herhangi bir şeye ihtiyacınız olursa lütfen resepsiyonla iletişime geçin. Ayrıca odadaki herhangi bir eksikliği de bildirebilirsiniz.',
    welcomeModalBtn: 'Giriş Yap',
    tvIssue: 'Televizyon',
    tvIssueDesc: 'TV veya kumanda sorunu',
    roomIssues: 'Oda Sorunları',
    backToServices: 'Geri',
  }
};

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'uz', label: 'O\'zbekcha', flag: '🇺🇿' },
  { code: 'hi', label: 'हिन्दी (India)', flag: '🇮🇳' },
  { code: 'ur', label: 'اردو (Pakistan)', flag: '🇵🇰' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

export default function GuestRoomPortal() {
  const { branchId, roomNumber } = useParams();

  // State
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(`guest_lang_${branchId || 1}_${roomNumber || '101'}`);
      if (saved && ['ru', 'uz', 'hi', 'ur', 'de', 'fr', 'zh', 'ar', 'tr', 'en'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    const userLang = navigator.language?.slice(0, 2);
    return ['ru', 'uz', 'hi', 'ur', 'de', 'fr', 'zh', 'ar', 'tr'].includes(userLang) ? userLang : 'en';
  });
  const [hotelInfo, setHotelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'chat'
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return !sessionStorage.getItem(`welcome_seen_${branchId}_${roomNumber}`);
  });

  const handleCloseWelcomeModal = () => {
    sessionStorage.setItem(`welcome_seen_${branchId}_${roomNumber}`, 'true');
    setShowWelcomeModal(false);
  };

  // Request Modal State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [requestText, setRequestText] = useState('');
  const [requestPhoto, setRequestPhoto] = useState(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

  const chatContainerRef = useRef(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const sessionId = `session_${branchId || 1}_${roomNumber || '0'}_${new Date().toISOString().slice(0,10)}`;

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem(`guest_lang_${branchId || 1}_${roomNumber || '101'}`, newLang);
      axios.post('/api/guest/language', {
        branchId: branchId || 1,
        roomNumber: roomNumber || '101',
        sessionId,
        language: newLang
      }).catch(() => {});
    } catch (e) {}
  };

  // Load Hotel & Room Info and sync active language
  useEffect(() => {
    if (branchId && roomNumber && lang) {
      axios.post('/api/guest/language', {
        branchId: branchId || 1,
        roomNumber: roomNumber || '101',
        sessionId,
        language: lang
      }).catch(() => {});
    }
  }, [lang, branchId, roomNumber]);

  useEffect(() => {
    async function loadInfo() {
      try {
        setLoading(true);
        const res = await axios.get(`/api/guest/info/${branchId || 1}/${roomNumber || 101}?lang=${lang}`);
        if (res.data?.success) {
          setHotelInfo(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching room info:', err);
        setHotelInfo({
          companyName: 'Family Hotel',
          branchName: 'Parkentskiy',
          branchAddress: 'Toshkent shahar',
          branchPhone: '+998 55 500 00 00',
          roomNumber: roomNumber || '101',
          floor: 1,
          wifiName: 'HotelBase_Guest',
          wifiPass: 'hotelbase2026',
          breakfastHours: '07:00 - 10:30',
          checkoutHours: '12:00'
        });
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, [branchId, roomNumber]);

  // Load & Poll Chat History
  useEffect(() => {
    let intervalId;
    async function fetchChat() {
      try {
        const res = await axios.get(`/api/guest/chat/${sessionId}`);
        if (res.data?.success) {
          setChatMessages(res.data.data || []);
        }
      } catch (err) {
        // quiet error
      }
    }

    fetchChat();
    intervalId = setInterval(fetchChat, 5000);
    return () => clearInterval(intervalId);
  }, [sessionId]);

  // Isolated Chat Container Scroll ONLY (Never scroll entire window!)
  useEffect(() => {
    if (activeTab === 'chat' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  const handleCopyWifi = () => {
    if (hotelInfo?.wifiPass) {
      navigator.clipboard.writeText(hotelInfo.wifiPass);
      setCopiedWifi(true);
      toast.success(t.copied, { position: 'top-center' });
      setTimeout(() => setCopiedWifi(false), 2500);
    }
  };

  const handleOpenCategory = (catKey, defaultMsg = '') => {
    setSelectedCategory(catKey);
    setRequestText(defaultMsg);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    try {
      setSubmittingRequest(true);
      const formData = new FormData();
      formData.append('branchId', branchId || 1);
      formData.append('roomNumber', roomNumber || '101');
      formData.append('category', selectedCategory || 'general');
      formData.append('message', requestText);
      formData.append('guestLanguage', lang);
      formData.append('sessionId', sessionId);
      if (requestPhoto) {
        formData.append('photo', requestPhoto);
      }

      const res = await axios.post('/api/guest/request', formData, {
        headers: { 'x-session-id': sessionId }
      });
      if (res.data?.success) {
        toast.success(res.data.message || t.successSent, {
          duration: 4000,
          position: 'top-center',
          icon: '✅'
        });
        setSelectedCategory(null);
        setRequestText('');
        setRequestPhoto(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error sending request';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    const optimisticMsg = {
      id: Date.now(),
      sender: 'guest',
      originalText: userMsg,
      translatedText: userMsg,
      createdAt: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await axios.post('/api/guest/chat', {
        branchId: branchId || 1,
        roomNumber: roomNumber || '101',
        sessionId,
        message: userMsg,
        guestLanguage: lang
      }, {
        headers: { 'x-session-id': sessionId }
      });

      if (res.data?.success && res.data.data?.aiReply) {
        setChatMessages((prev) => [...prev, res.data.data.aiReply]);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to send message';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setSendingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700 p-4">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-xs font-semibold">Hotel Concierge...</p>
      </div>
    );
  }

  const isChatTab = activeTab === 'chat';

  return (
    <div className={`bg-slate-100/80 text-slate-900 flex flex-col items-center justify-start font-sans antialiased selection:bg-amber-500 selection:text-white ${
      isChatTab ? 'fixed inset-0 overflow-hidden' : 'min-h-[100dvh] pb-10'
    }`}>
      <Toaster />

      {/* Main Mobile App Container */}
      <div className={`w-full max-w-md bg-white border-x border-slate-200/80 shadow-2xl flex flex-col relative ${
        isChatTab ? 'h-full max-h-full overflow-hidden' : 'min-h-screen'
      }`}>
        
        {/* ======================================================== */}
        {/* 1. TOP HEADER (Permanently Fixed Single Line) */}
        {/* ======================================================== */}
        <header className="shrink-0 bg-white border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between z-30 shadow-xs">
          
          {/* Hotel Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
              HB
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  {hotelInfo?.companyName || 'HotelBase'}
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold truncate">
                {hotelInfo?.branchName || 'Grand Hotel'} • {t.room} {hotelInfo?.roomNumber || roomNumber || '101'}
              </p>
            </div>
          </div>

          {/* Language Selector Pill */}
          <div className="relative shrink-0">
            <select
              value={lang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300/80 text-xs font-bold text-slate-800 rounded-full pl-2.5 pr-6 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer shadow-sm transition-colors max-w-[140px] truncate"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-white text-slate-900 font-medium">
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-2 pointer-events-none text-slate-500" />
          </div>
        </header>



        {/* ======================================================== */}
        {/* TAB 1: SERVICES (Scrollable Page) */}
        {/* ======================================================== */}
        {activeTab === 'services' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* HERO ROOM BADGE & WI-FI */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {hotelInfo?.branchName || 'HotelBase'}
                  </span>
                  <h2 className="text-base font-bold text-white mt-2">
                    {t.welcomeGreeting}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {t.welcomeSub}
                  </p>
                </div>

                {/* Big Room Number Badge */}
                <div className="text-center bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl shadow-inner shrink-0">
                  <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest block">
                    {t.room}
                  </span>
                  <span className="text-2xl font-black text-white leading-none">
                    {hotelInfo?.roomNumber || roomNumber || '101'}
                  </span>
                  <span className="text-[9px] text-slate-300 block mt-0.5 font-medium">
                    {t.floor} {hotelInfo?.floor || 1}
                  </span>
                </div>
              </div>

              {/* Embedded Wi-Fi Bar */}
              <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Wifi size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t.wifiTitle}</p>
                    <p className="text-xs font-bold text-white truncate">{hotelInfo?.wifiName || 'HotelBase_Guest'}</p>
                  </div>
                </div>

                <button
                  onClick={handleCopyWifi}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
                >
                  {copiedWifi ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedWifi ? t.copied : t.wifiCopy}</span>
                </button>
              </div>
            </div>

            {/* Room Issues Grid */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {t.roomIssues || 'Xonadagi muammolar'}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleOpenCategory('maintenance', 'TV / Remote issue / Televizor muammosi')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📺</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.tvIssue || 'Televizor'}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.tvIssueDesc || 'TV yoki pult nosozligi'}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('maintenance', 'Air conditioner / Climate issue / Konditsioner nosozligi')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">❄️</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.acHeating}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.acHeatingDesc}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('maintenance', 'Water or bathroom issue / Santexnika muammosi')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🚿</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.plumbing}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.plumbingDesc}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('general', '')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🛎️</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.otherIssue}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.otherIssueDesc}</p>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between mb-2.5 px-1 mt-2">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {t.quickServices || 'Xona xizmati'}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  onClick={() => handleOpenCategory('housekeeping', 'Please clean my room / Xonani tozalash kerak')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🧹</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.housekeeping}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.housekeepingDesc}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleOpenCategory('amenities', 'Need fresh towels and slippers / Sochiq va shippak kerak')}
                  className="bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl text-left shadow-sm transition-all active:scale-95 group flex flex-col justify-between h-28"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🧴</span>
                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{t.amenities}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{t.amenitiesDesc}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Info Footer Pills */}

            <div className="pt-1">
              <a
                href={`tel:${hotelInfo?.branchPhone || '+998555000000'}`}
                className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl flex items-center gap-3 hover:bg-emerald-100/60 transition-colors shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <PhoneCall size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider truncate">{t.receptionCall}</p>
                  <p className="text-sm font-black text-emerald-700 truncate">Call Front Desk</p>
                </div>
              </a>
            </div>

            {/* Switch to Live Chat Prompt */}
            <div
              onClick={() => setActiveTab('chat')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-md active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black">{t.tabChat}</h4>
                  <p className="text-[11px] text-amber-100 truncate">{t.chatDesc}</p>
                </div>
              </div>
              <ChevronDown size={18} className="text-white -rotate-90 shrink-0" />
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: LIVE CHAT (Full Height Isolated Chat Container) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/60">
            
            {/* Live Chat Notice Header */}
            <div className="shrink-0 bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between gap-2 text-[11px] text-amber-900 font-medium">
              <div className="flex items-center gap-2 overflow-hidden">
                <Sparkles size={13} className="text-amber-600 shrink-0" />
                <span className="truncate">{t.chatDesc}</span>
              </div>
              <button 
                onClick={() => setActiveTab('services')} 
                className="bg-white/80 hover:bg-white border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 font-bold shrink-0 shadow-sm transition-colors"
              >
                {t.backToServices || 'Orqaga'}
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-amber-500 mb-3">
                    <MessageSquare size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">{t.tabChat}</h4>
                  <p className="text-xs text-slate-500 max-w-xs">{t.chatDesc}</p>
                </div>
              ) : (
                chatMessages.map((msg, index) => {
                  const isGuest = msg.sender === 'guest';
                  const isAI = msg.sender === 'ai';

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isGuest ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-medium">
                        {isGuest ? (
                          <span>{t.guestYou}</span>
                        ) : isAI ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Sparkles size={10} /> AI Concierge
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <ShieldCheck size={10} /> {t.staffReply}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString('uz-UZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'Asia/Tashkent'
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                          isGuest
                            ? 'bg-amber-500 text-white font-medium rounded-tr-none'
                            : isAI
                            ? 'bg-white text-slate-800 border border-amber-200 rounded-tl-none shadow-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                        }`}
                      >
                        <p>{msg.translatedText || msg.originalText}</p>

                        {!isGuest && !isAI && (
                          <div className="mt-1 pt-1 border-t border-slate-100 text-[9px] text-slate-400 flex items-center gap-1">
                            <Sparkles size={9} className="text-amber-500" />
                            <span>{t.aiBadge}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar (Sticky at Bottom) */}
            <form
              onSubmit={handleSendChat}
              className="shrink-0 p-3 bg-white border-t border-slate-200 flex items-center gap-2 shadow-lg"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.chatPlaceholder}
                maxLength={500}
                className="flex-1 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingChat}
                className="w-10 h-10 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm"
              >
                {sendingChat ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* REQUEST MODAL / DIALOG */}
        {/* ======================================================== */}
        {selectedCategory && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🛎️</span> {t.requestModalTitle}
                </h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t.describeIssue}
                  </label>
                  <textarea
                    rows={3}
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    placeholder={t.describeIssue}
                    maxLength={600}
                    required
                    className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Photo attachment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t.optionalPhoto}
                  </label>
                  
                  {requestPhoto ? (
                    <div className="relative w-full p-3 bg-amber-50 border border-amber-400 rounded-2xl flex items-center justify-between text-xs transition-all shadow-sm">
                       <div className="flex items-center gap-2 truncate">
                         <ImageIcon size={14} className="text-amber-600 shrink-0" />
                         <span className="truncate text-amber-900 font-medium">{requestPhoto.name}</span>
                       </div>
                       <button 
                         type="button" 
                         onClick={() => setRequestPhoto(null)} 
                         className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold ml-2 shrink-0 transition-colors"
                       >✕</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col items-center justify-center gap-1.5 w-full p-3 bg-slate-50 border border-dashed border-slate-300 hover:border-amber-500 rounded-2xl cursor-pointer text-slate-600 hover:text-amber-600 text-xs transition-colors text-center active:scale-95">
                        <Camera size={18} className="text-amber-500" />
                        <span className="font-semibold">Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => setRequestPhoto(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      
                      <label className="flex flex-col items-center justify-center gap-1.5 w-full p-3 bg-slate-50 border border-dashed border-slate-300 hover:border-amber-500 rounded-2xl cursor-pointer text-slate-600 hover:text-amber-600 text-xs transition-colors text-center active:scale-95">
                        <ImageIcon size={18} className="text-amber-500" />
                        <span className="font-semibold">Galereya</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setRequestPhoto(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest || !requestText.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-40"
                  >
                    {submittingRequest ? t.sending : t.submitRequest}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* WELCOME MODAL */}
        {/* ======================================================== */}
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-300 text-white rounded-full flex items-center justify-center shadow-md">
                <Sparkles size={30} />
              </div>
              <h2 className="text-[15px] font-bold text-slate-800 leading-snug px-2">
                {t.welcomeModalText}
              </h2>
              <button
                onClick={handleCloseWelcomeModal}
                className="w-full mt-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-sm active:scale-95 transition-all"
              >
                {t.welcomeModalBtn}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
