# 🚗 Car Service Manager

ระบบบริหารจัดการศูนย์บริการรถยนต์แบบ PWA (Progressive Web App) สำหรับใช้งานบนมือถือและคอมพิวเตอร์

## ✨ Features

- 📱 **PWA Support** - ติดตั้งและใช้งานบนมือถือได้เหมือน Native App
- 🚗 **บันทึกการบริการ** - บันทึกข้อมูลการบริการรถตามทะเบียน
- 🔧 **จัดการประเภทบริการ** - เปลี่ยนน้ำมันเครื่อง, เปลี่ยนล้อ, และอื่นๆ
- 📦 **จัดการสินค้า/อะไหล่** - เพิ่ม แก้ไข สินค้าพร้อมรูปภาพ
- 💰 **ระบบราคาแบบหลายรอบ** - บันทึกราคาสินค้าตามช่วงเวลา
- 📊 **จัดการสต็อค** - ตรวจสอบและปรับสต็อคอัตโนมัติเมื่อใช้งาน
- 📈 **ดูประวัติการบริการ** - ค้นหาและดูประวัติการบริการทั้งหมด
- 🎨 **Modern UI/UX** - ออกแบบสไตล์ Enterprise โทนดำ-ขาว
- 📱 **Responsive Design** - รองรับทุกขนาดหน้าจอ

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React
- **PWA:** next-pwa

## 🚀 Getting Started

### 1. Setup Supabase

1. สร้างโปรเจคใหม่ที่ [Supabase](https://supabase.com)
2. ไปที่ SQL Editor และรัน SQL จากไฟล์ `supabase-schema.sql`
3. สร้าง Storage Bucket ชื่อ `products` สำหรับเก็บรูปสินค้า:
   - ไปที่ Storage → Create bucket
   - ชื่อ: `products`
   - Public: เปิด (Public bucket)

### 2. Configure Environment Variables

สร้างไฟล์ `.env.local` และใส่ค่าจาก Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

หาค่าเหล่านี้ได้ที่: Supabase Project → Settings → API

### 3. Update next.config.js

แก้ไขไฟล์ `next.config.js` ให้ใช้ domain ของ Supabase ที่ถูกต้อง:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

const nextConfig = {
  images: {
    domains: ['YOUR_PROJECT_ID.supabase.co'], // แก้ตรงนี้
  },
}

module.exports = withPWA(nextConfig)
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## 📱 PWA Installation

### บนมือถือ (iOS/Android):

1. เปิดเว็บด้วย Safari (iOS) หรือ Chrome (Android)
2. กด "เพิ่มไปยังหน้าจอหลัก" (Add to Home Screen)
3. แอพจะติดตั้งและใช้งานได้เหมือน Native App

### บนคอมพิวเตอร์:

1. เปิดเว็บด้วย Chrome
2. กดปุ่ม Install ที่แถบ URL
3. แอพจะติดตั้งเป็น Desktop App

## 📂 Project Structure

```
carproject/
├── app/
│   ├── layout.tsx          # Main layout
│   ├── page.tsx            # Home page
│   ├── products/
│   │   └── page.tsx        # Product management
│   ├── stock/
│   │   └── page.tsx        # Stock management
│   └── services/
│       ├── page.tsx        # Service history
│       └── new/
│           └── page.tsx    # New service record
├── components/
│   ├── Navigation.tsx      # Navigation component
│   └── ProductModal.tsx    # Product edit modal
├── lib/
│   └── supabase.ts         # Supabase client config
├── public/
│   └── manifest.json       # PWA manifest
├── supabase-schema.sql     # Database schema
└── README.md
```

## 🗄️ Database Schema

### Tables:

1. **products** - สินค้า/อะไหล่
2. **product_prices** - ราคาสินค้าแต่ละช่วงเวลา
3. **stock** - จำนวนสต็อค
4. **service_types** - ประเภทการบริการ
5. **service_records** - บันทึกการบริการ
6. **service_record_services** - บริการที่ทำในแต่ละครั้ง
7. **service_record_products** - อะไหล่ที่ใช้ในแต่ละครั้ง

### Features:

- 🔄 Auto-update timestamps
- 📉 Auto-decrease stock when service is recorded
- 🔐 Row Level Security (RLS) enabled
- 📊 Indexes for performance

## 🎯 Usage

### 1. เพิ่มสินค้า/อะไหล่

1. ไปที่หน้า "จัดการสินค้า"
2. กด "เพิ่มสินค้า"
3. กรอกข้อมูล: ชื่อ, รายละเอียด, รูปภาพ (ไม่บังคับ), ราคา
4. บันทึก

### 2. จัดการสต็อค

1. ไปที่หน้า "สต็อค"
2. ปรับจำนวนสต็อคด้วยปุ่ม +/- หรือ "ปรับ"
3. ระบบจะแจ้งเตือนเมื่อสินค้าใกล้หมด (< 10)

### 3. บันทึกการบริการ

1. ไปที่หน้า "บริการ" → "บันทึกการบริการ"
2. กรอกทะเบียนรถ
3. เลือกประเภทการบริการ (เช่น เปลี่ยนน้ำมันเครื่อง)
4. เลือกอะไหล่ที่ใช้ (ถ้ามี)
5. บันทึก - **สต็อคจะถูกตัดอัตโนมัติ**

### 4. ดูประวัติการบริการ

1. ไปที่หน้า "บริการ"
2. ค้นหาด้วยทะเบียนรถ
3. กดที่รายการเพื่อดูรายละเอียด

## 🎨 Design System

### Colors:

- **Background:** Black (#000000)
- **Surface:** Zinc-900 (#18181b)
- **Border:** Zinc-800 (#27272a)
- **Text:** White (#ffffff)
- **Accent:** White on Black (high contrast)

### Typography:

- System fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Font weights: 400 (normal), 600 (semibold), 700 (bold)

### Components:

- Rounded corners: 12px (rounded-xl)
- Spacing: 4px base (Tailwind spacing scale)
- Transitions: 200ms ease

## 🚀 Production Build

```bash
# Build
npm run build

# Start production server
npm start
```

## 📝 License

ISC

## 🤝 Contributing

Pull requests are welcome!

---

Made with ❤️ using Next.js, Tailwind CSS, and Supabase
