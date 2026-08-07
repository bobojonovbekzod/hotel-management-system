import React from 'react';
import { Users, LogIn, User } from 'lucide-react';

const RoomBedMenuModal = ({ room, activeBookings, onClose, onCheckIn, onManage }) => {
  const roomBookings = activeBookings.filter(b => b.roomId === room.id);
  const beds = Array.from({ length: room.capacity || 2 });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6 max-h-[90vh] overflow-y-auto max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-primary-400" /> Xona #{room.roomNumber}
            </h2>
            <p className="text-slate-600 text-sm">
              Hostel rejimi (Band o'rinlar: {roomBookings.length}/{room.capacity})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          {beds.map((_, index) => {
            const bookingForBed = roomBookings[index]; // simple mapping by index

            if (bookingForBed) {
              const guest = bookingForBed.primaryGuest;
              return (
                <div key={`bed-${index}`} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{guest?.firstName} {guest?.lastName}</p>
                      <p className="text-xs text-red-500 font-medium">Band qilingan</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onManage(bookingForBed.id)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Boshqarish
                  </button>
                </div>
              );
            }

            return (
              <div key={`bed-${index}`} className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <span className="font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Bo'sh o'rin</p>
                    <p className="text-xs text-green-600 font-medium">Sotish mumkin</p>
                  </div>
                </div>
                <button 
                  onClick={() => onCheckIn(room)}
                  disabled={room.status === 'cleaning' || room.status === 'maintenance'}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Qo'shish
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoomBedMenuModal;
