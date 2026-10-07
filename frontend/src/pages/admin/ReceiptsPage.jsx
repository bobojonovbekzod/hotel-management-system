import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Printer as PrinterIcon,
  Download as DownloadIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  RotateCw as ArrowPathIcon,
  Search as MagnifyingGlassIcon,
  FileText as DocumentTextIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Hotel as HotelIcon
} from 'lucide-react';
import { numberToUzbekWords } from '../../utils/numberToUzbekWords';

export default function ReceiptsPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [entities, setEntities] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Guest search autocomplete (Only one search directly in guestName)
  const [guestSearchResults, setGuestSearchResults] = useState([]);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const guestDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Form State
  const [selectedEntityKey, setSelectedEntityKey] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 16));
  const [guestName, setGuestName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adminName, setAdminName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
  
  const [services, setServices] = useState([
    { id: 1, name: 'Mehmonxona xizmati', quantity: 1, price: 0, total: 0 }
  ]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountInWords, setAmountInWords] = useState("Nol so'm");
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const printRef = useRef();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
        setShowGuestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateNights = (inDate, outDate) => {
    if (!inDate || !outDate) return null;
    try {
      const d1 = new Date(inDate);
      const d2 = new Date(outDate);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return null;
    }
  };

  // Load legal entities & next number on mount
  useEffect(() => {
    fetchEntities();
    fetchNextReceiptNumber();
  }, []);

  // Fetch entities
  const fetchEntities = async () => {
    try {
      const res = await api.get('/receipts/entities');
      if (res.data.success) {
        const entList = res.data.entities || [];
        setEntities(entList);
        
        let matched = entList.find(e => e.key === res.data.defaultEntityKey) || entList[0];

        if (matched) {
          setSelectedEntityKey(matched.key);
          setCompanyName(matched.companyName);
          setCompanyAddress(matched.address);
          setCompanyPhone(matched.phone);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNextReceiptNumber = async () => {
    try {
      const res = await api.get('/receipts/next-number');
      if (res.data.success) {
        setReceiptNumber(res.data.receiptNumber);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle entity change
  const handleEntitySelect = (key) => {
    setSelectedEntityKey(key);
    const item = entities.find(e => e.key === key);
    if (item) {
      setCompanyName(item.companyName);
      setCompanyAddress(item.address);
      setCompanyPhone(item.phone);
    }
  };

  // Autocomplete search guests from DB
  const performGuestSearch = async (queryText) => {
    const cleanText = (queryText || '').trim();
    if (!cleanText || cleanText.length < 2) {
      setGuestSearchResults([]);
      setShowGuestDropdown(false);
      return;
    }
    setIsSearchingGuests(true);
    try {
      const res = await api.get(`/receipts/search-guests?query=${encodeURIComponent(cleanText)}`);
      if (res.data.success) {
        const results = res.data.results || [];
        setGuestSearchResults(results);
        setShowGuestDropdown(results.length > 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingGuests(false);
    }
  };

  // Handle direct guest name typing with 250ms debounce
  const handleGuestNameChange = (val) => {
    setGuestName(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (val.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performGuestSearch(val);
      }, 250);
    } else {
      setGuestSearchResults([]);
      setShowGuestDropdown(false);
    }
  };

  // Select guest from search
  const handleSelectGuest = (g) => {
    setGuestName(g.guestName);
    setPassportNumber(g.passportNumber || '');
    setRoomNumber(g.roomNumber || '');
    setCheckInDate(g.checkIn ? new Date(g.checkIn).toISOString().slice(0, 10) : '');
    setCheckOutDate(g.checkOut ? new Date(g.checkOut).toISOString().slice(0, 10) : '');
    setSelectedBookingId(g.bookingId || null);

    const price = g.paidAmount || g.totalPrice || 0;
    const newServices = [
      { id: Date.now(), name: 'Mehmonxona xizmati', quantity: 1, price: price, total: price }
    ];
    setServices(newServices);
    recalculateTotal(newServices);

    setShowGuestDropdown(false);
  };

  // Services management
  const handleServiceChange = (id, field, value) => {
    const updated = services.map(s => {
      if (s.id === id) {
        const newItem = { ...s, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const q = field === 'quantity' ? parseFloat(value) || 0 : s.quantity;
          const p = field === 'price' ? parseFloat(value) || 0 : s.price;
          newItem.total = q * p;
        }
        return newItem;
      }
      return s;
    });
    setServices(updated);
    recalculateTotal(updated);
  };

  const addServiceRow = () => {
    const newRow = {
      id: Date.now(),
      name: 'Qo‘shimcha xizmat',
      quantity: 1,
      price: 0,
      total: 0
    };
    const updated = [...services, newRow];
    setServices(updated);
    recalculateTotal(updated);
  };

  const removeServiceRow = (id) => {
    if (services.length <= 1) {
      toast.error('Kamida bitta xizmat bo‘lishi shart');
      return;
    }
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    recalculateTotal(updated);
  };

  const recalculateTotal = (srvList) => {
    const sum = srvList.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    setTotalAmount(sum);
    setAmountInWords(numberToUzbekWords(sum));
  };

  const refreshWords = () => {
    setAmountInWords(numberToUzbekWords(totalAmount));
  };

  const [savedReceiptId, setSavedReceiptId] = useState(null);

  // Save receipt to DB (or update if already saved)
  const handleSaveReceipt = async (shouldPrint = false, silent = false) => {
    if (!guestName) {
      if (!silent) toast.error('Mijoz ismi kiritilishi shart!');
      return null;
    }

    setLoading(true);
    try {
      const payload = {
        id: savedReceiptId,
        branchId: user?.branchId || 1,
        receiptNumber,
        companyName,
        companyAddress,
        companyPhone,
        guestName,
        passportNumber,
        roomNumber,
        checkInDate: checkInDate || null,
        checkOutDate: checkOutDate || null,
        receiptDate,
        adminName,
        services,
        totalAmount,
        amountInWords,
        bookingId: selectedBookingId
      };

      const res = await api.post('/receipts', payload);
      if (res.data.success) {
        setSavedReceiptId(res.data.receipt.id);
        if (!silent) toast.success(res.data.isUpdate ? 'Kvitansiya yangilandi!' : 'Kvitansiya saqlandi!');
        
        if (shouldPrint) {
          setTimeout(() => {
            window.print();
          }, 250);
        }
        return res.data.receipt;
      }
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.error || 'Kvitansiyani saqlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Print directly (saves once if not saved, otherwise prints immediately)
  const handlePrint = async () => {
    if (!savedReceiptId) {
      await handleSaveReceipt(true);
    } else {
      window.print();
    }
  };

  // Download PDF (saves once if not saved, otherwise downloads immediately)
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    if (!guestName) {
      toast.error('Mijoz ismi kiritilishi shart!');
      return;
    }

    setDownloadingPdf(true);
    const toastId = toast.loading('PDF tayyorlanmoqda...');
    try {
      if (!savedReceiptId) {
        await handleSaveReceipt(false, true);
      }

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      const margin = 10; // 10mm
      const contentWidth = pdfWidth - (margin * 2); // 190mm
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, Math.min(contentHeight, pdfHeight - (margin * 2)));

      const cleanNum = receiptNumber ? receiptNumber.replace(/[^a-zA-Z0-9-_]/g, '_') : 'kvitansiya';
      const cleanGuest = guestName ? guestName.trim().replace(/\s+/g, '_') : 'mehmon';
      const fileName = `Kvitansiya_${cleanNum}_${cleanGuest}.pdf`;

      pdf.save(fileName);
      toast.success('PDF yuklab olindi!', { id: toastId });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF yaratishda xatolik yuz berdi', { id: toastId });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Reset to create a fresh new receipt
  const handleResetNewReceipt = () => {
    setSavedReceiptId(null);
    setGuestName('');
    setPassportNumber('');
    setRoomNumber('');
    setCheckInDate('');
    setCheckOutDate('');
    setSelectedBookingId(null);
    setReceiptDate(new Date().toISOString().slice(0, 16));
    setServices([{ id: 1, name: 'Mehmonxona xizmati', quantity: 1, price: 0, total: 0 }]);
    setTotalAmount(0);
    setAmountInWords("Nol so'm");
    fetchNextReceiptNumber();
    setActiveTab('create');
  };

  // Fetch history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/receipts?search=${encodeURIComponent(searchTerm)}`);
      if (res.data.success) {
        setHistoryList(res.data.receipts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, searchTerm]);

  // Load from history into preview
  const handleLoadFromHistory = (item) => {
    setSavedReceiptId(item.id);
    setReceiptNumber(item.receiptNumber);
    setCompanyName(item.companyName);
    setCompanyAddress(item.companyAddress || '');
    setCompanyPhone(item.companyPhone || '');
    setGuestName(item.guestName);
    setPassportNumber(item.passportNumber || '');
    setRoomNumber(item.roomNumber || '');
    setCheckInDate(item.checkInDate ? new Date(item.checkInDate).toISOString().slice(0, 10) : '');
    setCheckOutDate(item.checkOutDate ? new Date(item.checkOutDate).toISOString().slice(0, 10) : '');
    setReceiptDate(item.receiptDate ? new Date(item.receiptDate).toISOString().slice(0, 16) : '');
    setAdminName(item.adminName || '');
    
    if (Array.isArray(item.services)) {
      setServices(item.services.map((s, idx) => ({ ...s, id: idx + 1 })));
    }
    setTotalAmount(item.totalAmount || 0);
    setAmountInWords(item.amountInWords || numberToUzbekWords(item.totalAmount));
    
    setActiveTab('create');
    toast.success(`${item.receiptNumber} tahrir/chop etish uchun yuklandi`);
  };

  const handleDeleteReceipt = async (id) => {
    if (!window.confirm('Haqiqatan ham ushbu kvitansiyani o‘chirmoqchimisiz?')) return;
    try {
      const res = await api.delete(`/receipts/${id}`);
      if (res.data.success) {
        toast.success('Kvitansiya o‘chirildi');
        if (savedReceiptId === id) setSavedReceiptId(null);
        fetchHistory();
      }
    } catch (err) {
      toast.error('O‘chirishda xatolik yuz berdi');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('uz-UZ').format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-receipt-card, #printable-receipt-card * {
            visibility: visible;
          }
          #printable-receipt-card {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <DocumentTextIcon className="w-7 h-7 text-primary-500" />
            <span>Kvitansiya</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Mehmonlar uchun yashaganlik to‘g‘risida rasmiy ma’lumotnoma va to‘lov kvitansiyasini shakllantirish
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              if (activeTab === 'create' && savedReceiptId) {
                handleResetNewReceipt();
              } else {
                setActiveTab('create');
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            Yangi kvitansiya
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            Tarix
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: FORM */}
          <div className="xl:col-span-6 bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Hujjat ma'lumotlari</span>
                {savedReceiptId && (
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                    Saqlangan
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {savedReceiptId && (
                  <button
                    type="button"
                    onClick={handleResetNewReceipt}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/40 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Yangi ochish
                  </button>
                )}
                <span className="text-xs font-normal text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-full">
                  {user?.branch?.name || 'Barcha filiallar'}
                </span>
              </div>
            </h2>

            {/* Korxona nomi */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Korxona nomi (Yuridik MChJ)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Korxona nomi"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Yuridik manzili
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Manzil"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+998 ..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Kvitansiya raqami va Sanasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Kvitansiya raqami
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Kvitansiya sanasi
                </label>
                <input
                  type="datetime-local"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Mehmon ismi va Yashagan xonasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative" ref={guestDropdownRef}>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Ismi va familiyasi *
                  </label>
                  {isSearchingGuests && (
                    <span className="text-[10px] text-primary-500 font-medium animate-pulse flex items-center gap-1">
                      <ArrowPathIcon className="w-3 h-3 animate-spin" /> Qidirilmoqda...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Masalan: Alisher Karimov (kamida 2-3 ta harf kiriting)"
                    value={guestName}
                    onChange={(e) => handleGuestNameChange(e.target.value)}
                    onFocus={() => {
                      if (guestSearchResults.length > 0) setShowGuestDropdown(true);
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl pl-3.5 pr-8 py-2 text-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5" />
                </div>

                {/* Autocomplete Dropdown under Guest Name */}
                {showGuestDropdown && guestSearchResults.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 sm:w-[180%] mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900/70 text-[10px] uppercase font-bold text-gray-500 flex justify-between items-center">
                      <span>Topilgan mehmonlar ({guestSearchResults.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowGuestDropdown(false)}
                        className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    {guestSearchResults.map((g) => (
                      <div
                        key={g.bookingId}
                        onClick={() => handleSelectGuest(g)}
                        className="p-3 hover:bg-primary-50 dark:hover:bg-primary-950/40 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {g.guestName}
                          </span>
                          <span className="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-bold">
                            {g.roomNumber ? `${g.roomNumber}-xona` : g.branchName}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                          {g.passportNumber && (
                            <span>Pasport: <strong className="text-gray-700 dark:text-gray-300 font-mono">{g.passportNumber}</strong></span>
                          )}
                          {g.checkIn && <span>Kirish: {formatDate(g.checkIn)}</span>}
                          {g.checkOut && <span>Chiqish: {formatDate(g.checkOut)}</span>}
                          {g.totalPrice && (
                            <span>To'lov: <strong className="text-emerald-600 font-mono">{formatCurrency(g.totalPrice)} so'm</strong></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Yashagan xonasi
                </label>
                <input
                  type="text"
                  placeholder="Masalan: 5"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Kelgan va Ketgan sanasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Kelgan sanasi (Check-in)
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Ketgan sanasi (Check-out)
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Admin FIO */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Administrator F.I.O
              </label>
              <input
                type="text"
                placeholder="Administrator ismi"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            {/* Xizmatlar ro'yxati */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Xizmatlar
                </label>
                <button
                  type="button"
                  onClick={addServiceRow}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Xizmat qo'shish
                </button>
              </div>

              <div className="space-y-2.5">
                {services.map((srv) => (
                  <div key={srv.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Xizmat nomi"
                      value={srv.name}
                      onChange={(e) => handleServiceChange(srv.id, 'name', e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Miqdori"
                      value={srv.quantity}
                      onChange={(e) => handleServiceChange(srv.id, 'quantity', e.target.value)}
                      className="w-16 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-xs text-center text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Narxi"
                      value={srv.price}
                      onChange={(e) => handleServiceChange(srv.id, 'price', e.target.value)}
                      className="w-24 sm:w-28 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-xs text-right text-gray-900 dark:text-white"
                    />
                    <div className="w-24 sm:w-28 text-right font-bold text-xs text-gray-900 dark:text-white px-2">
                      {formatCurrency(srv.total)}
                    </div>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeServiceRow(srv.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summa va So'z bilan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  To'lov uchun jami
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTotalAmount(val);
                      setAmountInWords(numberToUzbekWords(val));
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-l-xl px-3.5 py-2 text-base font-bold text-primary-600 dark:text-primary-400"
                  />
                  <span className="bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-700 rounded-r-xl px-3 py-2 text-sm text-gray-500 font-semibold">
                    so'm
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    To'lov so'z bilan
                  </label>
                  <button
                    type="button"
                    onClick={refreshWords}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
                    title="Qayta hisoblash"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={amountInWords}
                  onChange={(e) => setAmountInWords(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs italic text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || downloadingPdf}
                className="flex-1 min-w-[130px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all text-sm"
              >
                <PrinterIcon className="w-4 h-4" />
                Chop etish
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={loading || downloadingPdf}
                className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all text-sm"
              >
                <DownloadIcon className={`w-4 h-4 ${downloadingPdf ? 'animate-bounce' : ''}`} />
                PDF yuklash
              </button>
              <button
                type="button"
                onClick={() => handleSaveReceipt(false)}
                disabled={loading || downloadingPdf}
                className="px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-primary-600/20 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE PRINTABLE A4 PREVIEW */}
          <div className="xl:col-span-6 sticky top-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-primary-500" />
                Ko'rinish (A4 Kvitansiya namunasi)
              </h3>
            </div>

            {/* Printable Document Paper Card */}
            <div
              id="printable-receipt-card"
              ref={printRef}
              className="bg-white text-gray-950 p-8 sm:p-10 rounded-xl border border-gray-300 shadow-xl font-sans"
            >
                {/* Header: Legal Entity & Branch Info */}
                <div className="border-b-2 border-gray-900 pb-3 mb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 max-w-lg">
                      <h2 className="text-base font-bold uppercase tracking-wide text-gray-950">
                        {companyName || '"FAMILY HOTELS AG" MCHJ'}
                      </h2>
                      {companyAddress && (
                        <p className="text-xs text-gray-700 leading-snug">
                          <span className="font-semibold text-gray-900">Manzil: </span>
                          <span>{companyAddress}</span>
                        </p>
                      )}
                      {companyPhone && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-gray-900">Telefon: </span>
                          <span>{companyPhone}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block bg-gray-100 border border-gray-300 px-3 py-1 rounded">
                        Filial: {user?.branch?.name || 'Bosh filial'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="flex justify-between items-center my-3 pb-2 border-b border-gray-300">
                  <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-gray-950">
                    KVITANSIYA № {receiptNumber || 'KV-00000'}
                  </h1>
                  <p className="text-xs text-gray-800 font-medium">
                    <span className="text-gray-500 font-normal">Sana: </span>
                    <strong className="text-gray-900">{formatDate(receiptDate)}</strong>
                  </p>
                </div>

                {/* Structured Guest & Stay Details Table */}
                <div className="my-4">
                  <table className="w-full text-xs border-collapse border border-gray-900 font-sans bg-white">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="border-r border-gray-300 p-2.5 bg-gray-50 text-gray-700 font-semibold w-1/4">
                          Mijoz (Mehmon) F.I.O:
                        </td>
                        <td className="border-r border-gray-300 p-2.5 font-bold text-gray-950 w-1/4 text-sm">
                          {guestName || '—'}
                        </td>
                        <td className="border-r border-gray-300 p-2.5 bg-gray-50 text-gray-700 font-semibold w-1/4">
                          Pasport seriyasi / raqami:
                        </td>
                        <td className="p-2.5 font-bold text-gray-950 w-1/4 font-mono">
                          {passportNumber || 'Ko‘rsatilmagan'}
                        </td>
                      </tr>
                      <tr>
                        <td className="border-r border-gray-300 p-2.5 bg-gray-50 text-gray-700 font-semibold">
                          Yashagan xonasi:
                        </td>
                        <td className="border-r border-gray-300 p-2.5 font-bold text-gray-950">
                          {roomNumber ? `${roomNumber}-xona` : '—'}
                        </td>
                        <td className="border-r border-gray-300 p-2.5 bg-gray-50 text-gray-700 font-semibold">
                          Yashash muddati:
                        </td>
                        <td className="p-2.5 text-gray-950 font-medium">
                          <span>{formatDate(checkInDate)} — {formatDate(checkOutDate)}</span>
                          {calculateNights(checkInDate, checkOutDate) && (
                            <span className="font-bold text-gray-900 ml-1.5">
                              ({calculateNights(checkInDate, checkOutDate)} sutka)
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Services Table */}
                <div className="my-4">
                  <table className="w-full text-xs text-left border-collapse border border-gray-900">
                    <thead>
                      <tr className="bg-gray-100 text-gray-950 border-b border-gray-900 font-bold">
                        <th className="border border-gray-900 p-2 text-center w-10">№</th>
                        <th className="border border-gray-900 p-2">Xizmat nomi va tavsifi</th>
                        <th className="border border-gray-900 p-2 text-center w-24">O‘lchov</th>
                        <th className="border border-gray-900 p-2 text-center w-16">Miqdori</th>
                        <th className="border border-gray-900 p-2 text-right w-28">Narxi (so‘m)</th>
                        <th className="border border-gray-900 p-2 text-right w-32">Summasi (so‘m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((srv, idx) => (
                        <tr key={idx} className="border-b border-gray-400">
                          <td className="border border-gray-400 p-2 text-center text-gray-600">{idx + 1}</td>
                          <td className="border border-gray-400 p-2 font-medium text-gray-900">{srv.name}</td>
                          <td className="border border-gray-400 p-2 text-center text-gray-600">sutka / xizmat</td>
                          <td className="border border-gray-400 p-2 text-center font-semibold text-gray-900">{srv.quantity}</td>
                          <td className="border border-gray-400 p-2 text-right text-gray-900">{formatCurrency(srv.price)}</td>
                          <td className="border border-gray-400 p-2 text-right font-bold text-gray-950">{formatCurrency(srv.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-900 font-semibold bg-gray-50">
                        <td colSpan="5" className="border border-gray-900 p-2 text-right text-gray-700">
                          Jami xizmatlar summasi:
                        </td>
                        <td className="border border-gray-900 p-2 text-right font-bold text-gray-950">
                          {formatCurrency(totalAmount)} so‘m
                        </td>
                      </tr>
                      <tr className="font-semibold bg-gray-50">
                        <td colSpan="5" className="border border-gray-900 p-2 text-right text-gray-700">
                          QQS (0% stavka):
                        </td>
                        <td className="border border-gray-900 p-2 text-right text-gray-600">
                          0 so‘m
                        </td>
                      </tr>
                      <tr className="border-t-2 border-gray-900 font-bold bg-gray-100 text-sm">
                        <td colSpan="5" className="border border-gray-900 p-2.5 text-right uppercase tracking-wider text-gray-950">
                          To‘lov uchun jami summa:
                        </td>
                        <td className="border border-gray-900 p-2.5 text-right font-extrabold text-gray-950">
                          {formatCurrency(totalAmount)} so‘m
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Amount in Words & Note */}
                <div className="my-4 space-y-1 text-xs text-gray-900">
                  <p className="leading-normal">
                    <span className="font-bold">Jami to‘lov summasi (so‘z bilan): </span>
                    <span className="italic font-semibold underline underline-offset-4 capitalize">{amountInWords}</span>
                  </p>
                  <p className="text-[11px] text-gray-600 italic pt-1">
                    * Ushbu kvitansiya ko‘rsatilgan mehmonxona xizmatlari uchun to‘lov to‘liq qabul qilinganligini tasdiqlovchi rasmiy hisobot hujjati hisoblanadi.
                  </p>
                </div>

              {/* Signature Footer */}
              <div className="mt-8 pt-6 border-t border-gray-400 font-sans">
                <div className="grid grid-cols-2 gap-8 text-xs">
                  <div>
                    <p className="font-bold text-gray-950 uppercase tracking-wide">Kvitansiyani berdi (Mas‘ul xodim):</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12 font-medium">F.I.O: </span>
                        <span className="font-bold text-gray-900">{adminName || '________________________________'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12 font-medium">Imzo: </span>
                        <span className="text-gray-700">________________________________</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-950 uppercase tracking-wide">Kvitansiyani qabul qildi (Mijoz):</p>
                    <div className="mt-3 space-y-2 inline-block text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12 font-medium">F.I.O: </span>
                        <span className="font-bold text-gray-900">{guestName || '________________________________'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12 font-medium">Imzo: </span>
                        <span className="text-gray-700">________________________________</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center text-xs text-gray-400">
                  <p className="font-semibold uppercase tracking-widest">[ M.O‘. / MUHR O‘RNI ]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Raqam, mehmon yoki korxona bo'yicha qidiruv..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>

            <button
              onClick={fetchHistory}
              className="px-3.5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex items-center gap-2 transition-all"
            >
              <ArrowPathIcon className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3.5">Kvitansiya №</th>
                  <th className="p-3.5">Sana</th>
                  <th className="p-3.5">Mehmon</th>
                  <th className="p-3.5">Xona</th>
                  <th className="p-3.5">Korxona (MChJ)</th>
                  <th className="p-3.5 text-right">Summa</th>
                  <th className="p-3.5">Admin</th>
                  <th className="p-3.5 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {historyLoading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500">
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500">
                      Hozircha saqlangan kvitansiyalar mavjud emas.
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary-600 dark:text-primary-400">
                        {item.receiptNumber}
                      </td>
                      <td className="p-3.5 text-xs text-gray-500">
                        {formatDate(item.receiptDate)}
                      </td>
                      <td className="p-3.5 font-semibold text-gray-900 dark:text-white">
                        {item.guestName}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                          {item.roomNumber ? `${item.roomNumber}-xona` : '-'}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-gray-500 truncate max-w-[180px]" title={item.companyName}>
                        {item.companyName}
                      </td>
                      <td className="p-3.5 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.totalAmount)} so'm
                      </td>
                      <td className="p-3.5 text-xs text-gray-500">
                        {item.adminName || '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleLoadFromHistory(item)}
                            className="p-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg transition-colors"
                            title="Ko'rish / Chop etish"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              handleLoadFromHistory(item);
                              setTimeout(handleDownloadPDF, 150);
                            }}
                            className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="PDF yuklab olish"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(item.id)}
                            className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg transition-colors"
                            title="O'chirish"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
