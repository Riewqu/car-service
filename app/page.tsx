'use client';

import Link from 'next/link';
import { Package, Archive, ClipboardList, History, Plus, BarChart3 } from 'lucide-react';

export default function Home() {
  const quickActions = [
    {
      title: 'Dashboard',
      description: 'สรุปยอดและสถิติประจำวัน',
      href: '/dashboard',
      icon: BarChart3,
      color: 'from-cyan-600 to-cyan-800',
    },
    {
      title: 'บันทึกการบริการ',
      description: 'เพิ่มข้อมูลการบริการรถใหม่',
      href: '/services/new',
      icon: Plus,
      color: 'from-blue-600 to-blue-800',
    },
    {
      title: 'ประวัติการบริการ',
      description: 'ดูประวัติการบริการทั้งหมด',
      href: '/services',
      icon: History,
      color: 'from-purple-600 to-purple-800',
    },
    {
      title: 'จัดการสินค้า',
      description: 'เพิ่ม แก้ไข สินค้าและอะไหล่',
      href: '/products-new',
      icon: Package,
      color: 'from-green-600 to-green-800',
    },
    {
      title: 'จัดการสต็อค',
      description: 'ตรวจสอบและอัพเดทสต็อค',
      href: '/stock',
      icon: Archive,
      color: 'from-orange-600 to-orange-800',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-black dark:via-zinc-900 dark:to-black">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex justify-center mb-6">
            <img
              src="/logo-KG.png"
              alt="KG Feeling Service"
              className="h-32 w-auto sm:h-32 md:h-40 lg:h-48 object-contain invert dark:invert-0 transition-all"
            />
          </div>
          <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base md:text-lg px-4">
            ระบบบริหารจัดการศูนย์บริการรถยนต์
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="relative p-4 sm:p-6 md:p-8">
                  <div className={`inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${action.color} mb-3 sm:mb-4`}>
                    <Icon size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis">
                    {action.title}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-zinc-400 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
