-- Hotel Management System Database Schema
-- Using SQLite for simplicity

PRAGMA foreign_keys = ON;

-- Filiallari (Branches)
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Foydalanuvchilar (Users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'director', 'admin', 'cleaner')),
  phone TEXT,
  salary REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Xonalar (Rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT DEFAULT 'standard', -- standard, deluxe, suite
  floor INTEGER DEFAULT 1,
  capacity INTEGER DEFAULT 2,
  price_per_night REAL NOT NULL,
  status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'cleaning', 'maintenance')),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Mehmonlar (Guests)
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  passport_number TEXT,
  nationality TEXT DEFAULT 'UZ',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Band qilishlar (Bookings / Check-in)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  primary_guest_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  check_in DATETIME NOT NULL,
  check_out_expected DATETIME NOT NULL,
  check_out_actual DATETIME,
  total_price REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  payment_method TEXT CHECK(payment_method IN ('cash', 'qrcode', 'terminal')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'checked_out', 'cancelled')),
  shift TEXT CHECK(shift IN ('morning', 'night')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (primary_guest_id) REFERENCES guests(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Qo'shimcha mehmonlar (Additional guests in same booking)
CREATE TABLE IF NOT EXISTS booking_guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  guest_id INTEGER NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);

-- Smenalar (Shifts)
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  shift_type TEXT NOT NULL CHECK(shift_type IN ('morning', 'night')),
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  total_income REAL DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'closed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Xarajatlar (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  shift_id INTEGER,
  category TEXT NOT NULL CHECK(category IN ('food', 'cleaning', 'repair', 'telecom', 'utilities', 'salary', 'other')),
  amount REAL NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- Xodimlar davomati (Attendance - Face ID uchun)
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  branch_id INTEGER NOT NULL,
  check_in DATETIME,
  check_out DATETIME,
  work_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);
