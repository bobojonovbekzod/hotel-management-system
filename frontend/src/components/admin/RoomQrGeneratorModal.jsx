import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import QRCode from 'qrcode';
import { Printer, X, CheckSquare, Square, Sparkles, Building2, Lock, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import uzFlag from '../../assets/flags/uz.svg';
import ruFlag from '../../assets/flags/ru.svg';
import gbFlag from '../../assets/flags/gb.svg';
import logoImg from '../../assets/logo.jpg';

export default function RoomQrGeneratorModal({ isOpen, onClose, defaultBranchId }) {
  const { user } = useAuth();
  const isSuperOrOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const effectiveBranchId = (!isSuperOrOwner && user?.branchId) ? user.branchId : (defaultBranchId || user?.branchId || 1);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(effectiveBranchId);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [qrMap, setQrMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Load branches (restricted to own branch if not superadmin/owner)
  useEffect(() => {
    if (!isOpen) return;

    async function loadBranches() {
      try {
        const res = await api.get('/branches');
        if (res.data?.success) {
          let list = res.data.data || [];
          if (!isSuperOrOwner && user?.branchId) {
            list = list.filter((b) => b.id === user.branchId);
            setSelectedBranchId(user.branchId);
          } else if (!selectedBranchId && list.length > 0) {
            setSelectedBranchId(defaultBranchId || list[0].id);
          }
          setBranches(list);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    }
    loadBranches();
  }, [isOpen, isSuperOrOwner, user?.branchId]);

  // Load rooms for selected branch
  useEffect(() => {
    if (!isOpen || !selectedBranchId) return;

    async function loadRoomsAndQRs() {
      try {
        setLoading(true);
        const res = await api.get('/rooms', {
          params: { branchId: selectedBranchId }
        });

        if (res.data?.success) {
          const fetchedRooms = res.data.data || [];
          setRooms(fetchedRooms);
          setSelectedRoomIds(fetchedRooms.map((r) => r.id));

          // Generate QR codes locally via qrcode library with High error correction (30% recovery)
          const baseUrl = window.location.origin || 'https://hotelbase.uz';
          const newQrMap = {};

          for (const room of fetchedRooms) {
            const roomUrl = `${baseUrl}/room/${room.branchId || selectedBranchId}/${room.roomNumber}`;
            try {
              const qrDataUrl = await QRCode.toDataURL(roomUrl, {
                width: 512,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: {
                  dark: '#0f172a',
                  light: '#ffffff'
                }
              });
              newQrMap[room.id] = qrDataUrl;
            } catch (qrErr) {
              console.error('QR generate error for room:', room.roomNumber, qrErr);
            }
          }
          setQrMap(newQrMap);
        }
      } catch (err) {
        console.error('Error fetching rooms for QR:', err);
        toast.error('Xonalarni yuklashda xatolik');
      } finally {
        setLoading(false);
      }
    }

    loadRoomsAndQRs();
  }, [isOpen, selectedBranchId]);

  if (!isOpen) return null;

  const toggleSelectRoom = (id) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedRoomIds(rooms.map((r) => r.id));
  };

  const deselectAll = () => {
    setSelectedRoomIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Helper to load image
      const loadImage = (src) => {
        return new Promise((resolve) => {
          if (!src) return resolve(null);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      // Helper to draw rounded rectangle on Canvas
      const drawRoundRect = (ctx, x, y, width, height, radius) => {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, width, height, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
        }
      };

      // Pre-load all flag images and hotel logo
      const [uzImg, ruImg, gbImg, hotelLogoImg] = await Promise.all([
        loadImage(uzFlag),
        loadImage(ruFlag),
        loadImage(gbFlag),
        loadImage(logoImg)
      ]);

      const roomsToPrint = rooms.filter((r) => selectedRoomIds.includes(r.id));
      
      // Pre-load all QR images for selected rooms
      const loadedQrImgs = {};
      await Promise.all(
        roomsToPrint.map(async (room) => {
          if (qrMap[room.id]) {
            loadedQrImgs[room.id] = await loadImage(qrMap[room.id]);
          }
        })
      );

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // ~297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // ~210mm

      for (let i = 0; i < roomsToPrint.length; i += 2) {
        const pair = roomsToPrint.slice(i, i + 2);

        // Create high-res A4 Canvas (2380 x 1684 for 200+ DPI print clarity)
        const canvas = document.createElement('canvas');
        canvas.width = 2380;
        canvas.height = 1684;
        const ctx = canvas.getContext('2d');

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 2380, 1684);

        const cardWidth = 980;
        const cardHeight = 1440;
        const cardY = 122;
        const cardPositions = [140, 1260];

        pair.forEach((room, idx) => {
          const cx = cardPositions[idx];
          const cy = cardY;
          const cw = cardWidth;
          const ch = cardHeight;

          // 1. Card Container & Border
          ctx.fillStyle = '#ffffff';
          drawRoundRect(ctx, cx, cy, cw, ch, 48);
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 4;
          drawRoundRect(ctx, cx, cy, cw, ch, 48);
          ctx.stroke();

          // 2. Top Brand Badge (Filial nomi - Brand Olive Green)
          const badgeW = cw - 120;
          const badgeH = 74;
          const badgeX = cx + 60;
          const badgeY = cy + 60;

          const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
          grad.addColorStop(0, '#556832');
          grad.addColorStop(1, '#3c4b1f');
          ctx.fillStyle = grad;
          drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 37);
          ctx.fill();

          // Badge Text (Exact Center on X and Y)
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const branchTitle = (currentBranch?.name || 'HotelBase').toUpperCase();
          ctx.fillText(branchTitle, badgeX + badgeW / 2, badgeY + badgeH / 2);

          // 3. "GUEST ROOM" Subtitle
          ctx.fillStyle = '#94a3b8';
          ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('G U E S T   R O O M', cx + cw / 2, cy + 185);

          // 4. Room Number (Exact Center)
          ctx.fillStyle = '#0f172a';
          ctx.font = '900 76px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(room.roomNumber), cx + cw / 2, cy + 265);

          // 5. QR Code Box Container
          const qrBoxSize = 540;
          const qrBoxX = cx + (cw - qrBoxSize) / 2;
          const qrBoxY = cy + 345;
          ctx.fillStyle = '#f8fafc';
          drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 36);
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 3;
          drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 36);
          ctx.stroke();

          // Draw QR Image inside
          if (loadedQrImgs[room.id]) {
            const qrPad = 35;
            ctx.drawImage(
              loadedQrImgs[room.id],
              qrBoxX + qrPad,
              qrBoxY + qrPad,
              qrBoxSize - qrPad * 2,
              qrBoxSize - qrPad * 2
            );

            // Draw Center Hotel Logo in QR Code
            if (hotelLogoImg) {
              const logoSize = 100;
              const logoX = qrBoxX + (qrBoxSize - logoSize) / 2;
              const logoY = qrBoxY + (qrBoxSize - logoSize) / 2;

              // White rounded container behind logo
              ctx.fillStyle = '#ffffff';
              drawRoundRect(ctx, logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, 20);
              ctx.fill();
              ctx.strokeStyle = '#e2e8f0';
              ctx.lineWidth = 2;
              drawRoundRect(ctx, logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, 20);
              ctx.stroke();

              // Clipped Logo
              ctx.save();
              drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
              ctx.clip();
              ctx.drawImage(hotelLogoImg, logoX, logoY, logoSize, logoSize);
              ctx.restore();
            }
          }

          // 6. Multilingual Guidance (Footer)
          const rows = [
            { img: uzImg, text: "Xona xizmatini baholash va adminga murojaat yo'llash" },
            { img: ruImg, text: "Оценить обслуживание номеров и написать админу" },
            { img: gbImg, text: "Rate room service and contact the admin" }
          ];

          const flagW = 56;
          const flagH = 38;
          const flagGap = 20;
          const rowStartY = cy + 980;
          const rowSpacing = 80;

          ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // Calculate max width to center block horizontally
          let maxW = 0;
          rows.forEach((r) => {
            const tw = ctx.measureText(r.text).width;
            if (tw > maxW) maxW = tw;
          });
          const blockW = flagW + flagGap + maxW;
          const footerX = cx + (cw - blockW) / 2;

          rows.forEach((r, rIdx) => {
            const rY = rowStartY + rIdx * rowSpacing;

            // Draw Flag
            if (r.img) {
              ctx.save();
              drawRoundRect(ctx, footerX, rY, flagW, flagH, 6);
              ctx.clip();
              ctx.drawImage(r.img, footerX, rY, flagW, flagH);
              ctx.restore();

              ctx.strokeStyle = 'rgba(0,0,0,0.15)';
              ctx.lineWidth = 1.5;
              drawRoundRect(ctx, footerX, rY, flagW, flagH, 6);
              ctx.stroke();
            }

            // Draw Text (Exact Y alignment with flag center!)
            ctx.fillStyle = '#1e293b';
            ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(r.text, footerX + flagW + flagGap, rY + flagH / 2);
          });
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`${currentBranch?.name || 'Hotel'}_QRCodes.pdf`);
      toast.success('PDF muvaffaqiyatli yuklab olindi!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF yaratishda xatolik yuz berdi');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredRooms = rooms.filter((r) => selectedRoomIds.includes(r.id));
  const currentBranch = branches.find((b) => b.id === parseInt(selectedBranchId, 10)) || {
    name: 'HotelBase'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-fade-in">
      
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr-grid, #printable-qr-grid * {
            visibility: visible;
          }
          #printable-qr-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 24px !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header (No Print) */}
        <div className="no-print bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Xonalar Uchun QR-Kodli Stolcha Plakatlari
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chop eting va mehmonxona xonalariga (stol ustiga yoki devorga) joylashtiring
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Branch Selector (No Print) */}
        <div className="no-print bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Branch Select */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-slate-700">Filial:</span>
              {isSuperOrOwner && branches.length > 1 ? (
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-black text-slate-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  {branches.find((b) => b.id === Number(selectedBranchId))?.name || user?.branch?.name || "O'z filiali"}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14} /> Barchasini tanlash ({rooms.length})
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={deselectAll}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Bekor qilish
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={filteredRooms.length === 0 || isGeneratingPdf}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-40"
            >
              {isGeneratingPdf ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>{isGeneratingPdf ? 'PDF yasalmoqda...' : 'PDF Yuklab olish'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={filteredRooms.length === 0 || isGeneratingPdf}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-40"
            >
              <Printer size={16} />
              <span>Chop etish (Print)</span>
            </button>
          </div>
        </div>

        {/* Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium">QR-kodlar tayyorlanmoqda...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <p className="text-sm font-bold text-slate-700 mb-1">Bu filialda xonalar topilmadi</p>
              <p className="text-xs text-slate-400">Iltimos, boshqa filialni tanlang yoki xona qo'shing.</p>
            </div>
          ) : (
            <div id="printable-qr-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => {
                const qrImgSrc = qrMap[room.id];

                return (
                  <div
                    key={room.id}
                    id={`qr-card-${room.id}`}
                    className="bg-white text-slate-900 rounded-3xl p-6 border-2 border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden page-break-inside-avoid hover:shadow-md transition-shadow"
                  >
                    {/* Top Brand Accent Badge */}
                    <div 
                      className="w-full text-white rounded-full mb-4 shadow-sm text-center px-4 font-black uppercase tracking-wider text-xs flex items-center justify-center" 
                      style={{ height: '36px', lineHeight: '36px', background: 'linear-gradient(135deg, #556832, #3c4b1f)' }}
                    >
                      {currentBranch?.name || 'HotelBase'}
                    </div>

                    {/* Room Badge */}
                    <div className="mb-3 text-center w-full">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                        Guest Room
                      </span>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none m-0 p-0">
                        {room.roomNumber}
                      </h3>
                    </div>

                    {/* QR Code Container with Center Hotel Logo */}
                    <div className="w-full max-w-[220px] aspect-square bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-4 shadow-inner flex items-center justify-center mx-auto relative">
                      {qrImgSrc ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={qrImgSrc}
                            alt={`QR Code for Room ${room.roomNumber}`}
                            className="w-full h-full object-contain rounded-lg block"
                          />
                          {/* Center Hotel Logo */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 bg-white p-1 rounded-xl shadow-md border border-slate-200 flex items-center justify-center">
                            <img
                              src={logoImg}
                              alt="Family Hotel"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          QR tayyorlanmoqda...
                        </div>
                      )}
                    </div>

                    {/* Multilingual Guidance */}
                    <table className="border-collapse mx-auto text-left">
                      <tbody>
                        <tr>
                          <td className="align-middle pr-2.5 py-1.5 w-7">
                            <img src={uzFlag} alt="UZ" className="w-[22px] h-[15px] object-cover rounded-[2px] shadow-sm block" />
                          </td>
                          <td className="align-middle py-1.5 text-[12.5px] font-bold text-slate-800 leading-[16px] whitespace-nowrap">
                            Xona xizmatini baholash va adminga murojaat yo'llash
                          </td>
                        </tr>
                        <tr>
                          <td className="align-middle pr-2.5 py-1.5 w-7">
                            <img src={ruFlag} alt="RU" className="w-[22px] h-[15px] object-cover rounded-[2px] shadow-sm block" />
                          </td>
                          <td className="align-middle py-1.5 text-[12.5px] font-bold text-slate-800 leading-[16px] whitespace-nowrap">
                            Оценить обслуживание номеров и написать админу
                          </td>
                        </tr>
                        <tr>
                          <td className="align-middle pr-2.5 py-1.5 w-7">
                            <img src={gbFlag} alt="GB" className="w-[22px] h-[15px] object-cover rounded-[2px] shadow-sm block" />
                          </td>
                          <td className="align-middle py-1.5 text-[12.5px] font-bold text-slate-800 leading-[16px] whitespace-nowrap">
                            Rate room service and contact the admin
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
