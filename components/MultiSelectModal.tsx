'use client';

import { useState, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';

type Item = {
  id: string;
  name: string;
};

type MultiSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: Item[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
};

export default function MultiSelectModal({
  isOpen,
  onClose,
  title,
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: MultiSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort A-Z
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [items, searchTerm]);

  // Separate selected and unselected
  const selectedItems = useMemo(() =>
    filteredItems.filter((item) => selectedIds.includes(item.id)),
    [filteredItems, selectedIds]
  );

  const unselectedItems = useMemo(() =>
    filteredItems.filter((item) => !selectedIds.includes(item.id)),
    [filteredItems, selectedIds]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-black overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
              title="ปิด"
            >
              <X size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h2>
              {selectedIds.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-zinc-400">
                  เลือก {selectedIds.length} รายการ
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              disabled={selectedIds.length === 0}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ล้างทั้งหมด
            </button>
            <button
              onClick={onSelectAll}
              className="px-3 py-1.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              เลือกทั้งหมด
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-140px)] overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Search size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
            <p className="text-gray-600 dark:text-zinc-400 text-lg">
              {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีรายการ'}
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 mb-3 px-2">
                  รายการที่เลือก ({selectedItems.length})
                </h3>
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onToggle(item.id)}
                      className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-600 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                    >
                      <span className="text-gray-900 dark:text-white font-medium flex-1">
                        {item.name}
                      </span>
                      <Check size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unselected Items */}
            {unselectedItems.length > 0 && (
              <div>
                {selectedItems.length > 0 && (
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 mb-3 px-2">
                    รายการทั้งหมด ({unselectedItems.length})
                  </h3>
                )}
                <div className="space-y-2">
                  {unselectedItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onToggle(item.id)}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                    >
                      <span className="text-gray-900 dark:text-white flex-1">
                        {item.name}
                      </span>
                      <div className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded flex-shrink-0 ml-2"></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-t border-gray-200 dark:border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-zinc-400">
            {selectedIds.length > 0 ? (
              <span className="font-semibold text-gray-900 dark:text-white">
                เลือกแล้ว {selectedIds.length} รายการ
              </span>
            ) : (
              <span>ยังไม่ได้เลือกรายการ</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
