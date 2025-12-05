'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Package, ClipboardList, Archive, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const Navigation = () => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: '/', label: 'หน้าแรก', icon: Home },
    { href: '/products-new', label: 'สินค้า', icon: Package },
    { href: '/stock', label: 'สต็อค', icon: Archive },
    { href: '/services', label: 'บริการ', icon: ClipboardList },
    { href: '/settings', label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <img
                src="/logo-KG.png"
                alt="KG Feeling Service"
                className="h-10 w-32 sm:h-12 sm:w-40 lg:h-14 lg:w-48 object-contain invert dark:invert-0 transition-all"
              />
            </Link>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all"
                type="button"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-500'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center flex-1 h-full transition-all text-gray-500 dark:text-zinc-500"
            type="button"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            <span className="text-xs mt-1">ธีม</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
