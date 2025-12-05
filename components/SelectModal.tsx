'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

type SelectModalItem = {
  id: string;
  name: string;
};

type SelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: SelectModalItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  searchPlaceholder?: string;
};

export default function SelectModal({
  isOpen,
  onClose,
  title,
  items,
  selectedIds,
  onToggle,
  searchPlaceholder = 'ค้นหา...',
}: SelectModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center md:p-4">
      <div className="bg-white dark:bg-zinc-900 md:rounded-2xl max-w-md w-full shadow-xl h-full md:h-auto md:max-h-[80vh] flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 p-6 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500"
              size={20}
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center space-x-3 p-4 bg-gray-100 dark:bg-zinc-800 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(item.id)}
                  className="w-5 h-5 rounded border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
                <span className="flex-1 text-gray-900 dark:text-white font-medium">
                  {item.name}
                </span>
              </label>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-600 dark:text-zinc-400">
              ไม่พบรายการที่ค้นหา
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 p-6 border-t border-gray-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-6 py-3 rounded-xl font-semibold transition-all"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
