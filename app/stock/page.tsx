'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Package, Plus, Minus, AlertTriangle, X, Edit, Activity, Calendar, TrendingUp, TrendingDown, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StockItem = {
  id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
  product: {
    name: string;
    description: string | null;
  };
};

type StockMovement = {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string | null;
  product: {
    name: string;
  };
};

type Tab = 'current' | 'movements';

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<Tab>('current');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustingStock, setAdjustingStock] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isModalOpen]);

  // Movement filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterMovementType, setFilterMovementType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (activeTab === 'current') {
      fetchStock();
    } else {
      fetchMovements();
    }
  }, [activeTab]);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock')
        .select(`
          *,
          product:products(name, description)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setStockItems(data || []);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdjustStock = useCallback(async (stockId: string, adjustment: number) => {
    try {
      const item = stockItems.find((s) => s.id === stockId);
      if (!item) return;

      const newQuantity = Math.max(0, item.quantity + adjustment);

      const { error } = await supabase
        .from('stock')
        .update({ quantity: newQuantity })
        .eq('id', stockId);

      if (error) throw error;

      setStockItems((prev) =>
        prev.map((s) =>
          s.id === stockId ? { ...s, quantity: newQuantity } : s
        )
      );
      setAdjustingStock(null);
      setAdjustAmount('');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('เกิดข้อผิดพลาดในการปรับสต็อค');
    }
  }, [stockItems]);


  const filteredStock = useMemo(() =>
    stockItems.filter((item) =>
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [stockItems, searchTerm]
  );

  const outOfStockItems = useMemo(() =>
    filteredStock.filter((item) => item.quantity === 0), [filteredStock]
  );

  const lowStockItems = useMemo(() =>
    filteredStock.filter((item) => item.quantity > 0 && item.quantity < 10), [filteredStock]
  );

  const openEditModal = useCallback((item: StockItem) => {
    setEditingItem(item);
    setTempQuantity(item.quantity);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setTempQuantity(0);
  }, []);

  const handleSaveStock = useCallback(async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantity: tempQuantity })
        .eq('id', editingItem.id);

      if (error) throw error;

      setStockItems((prev) =>
        prev.map((s) =>
          s.id === editingItem.id ? { ...s, quantity: tempQuantity } : s
        )
      );
      closeModal();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('เกิดข้อผิดพลาดในการปรับสต็อค');
    }
  }, [editingItem, tempQuantity, closeModal]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      // Filter by product name
      if (searchTerm && !movement.product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filter by product ID
      if (filterProductId && movement.product_id !== filterProductId) {
        return false;
      }

      // Filter by movement type
      if (filterMovementType && movement.movement_type !== filterMovementType) {
        return false;
      }

      // Filter by date range
      if (movement.created_at) {
        const movementDate = new Date(movement.created_at).toISOString().split('T')[0];

        if (filterStartDate && movementDate < filterStartDate) {
          return false;
        }

        if (filterEndDate && movementDate > filterEndDate) {
          return false;
        }
      }

      return true;
    });
  }, [movements, searchTerm, filterProductId, filterMovementType, filterStartDate, filterEndDate]);

  const clearFilters = useCallback(() => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterProductId('');
    setFilterMovementType('');
    setSearchTerm('');
  }, []);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <TrendingUp className="text-green-600 dark:text-green-400" size={20} />;
      case 'OUT':
        return <TrendingDown className="text-red-600 dark:text-red-400" size={20} />;
      case 'SERVICE_USE':
        return <Package className="text-blue-600 dark:text-blue-400" size={20} />;
      case 'ADJUSTMENT':
        return <RefreshCw className="text-yellow-600 dark:text-yellow-400" size={20} />;
      default:
        return <Activity className="text-gray-600 dark:text-zinc-400" size={20} />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'IN':
        return 'เพิ่มสต็อค';
      case 'OUT':
        return 'ลดสต็อค';
      case 'SERVICE_USE':
        return 'ใช้ในบริการ';
      case 'ADJUSTMENT':
        return 'ปรับปรุง';
      default:
        return type;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-900/50';
      case 'OUT':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-900/50';
      case 'SERVICE_USE':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-900/50';
      case 'ADJUSTMENT':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-900/50';
      default:
        return 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-400 border-gray-300 dark:border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">จัดการสต็อค</h1>
          <p className="text-gray-600 dark:text-zinc-400">ตรวจสอบและอัพเดทสต็อคสินค้า</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-2 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'current'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package size={18} />
              <span>สต็อคปัจจุบัน</span>
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'movements'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Activity size={18} />
              <span>รายงานเคลื่อนไหว</span>
            </button>
          </div>
        </div>

        {/* Current Stock Tab */}
        {activeTab === 'current' && (
          <>
            {/* Out of Stock Alert */}
            {outOfStockItems.length > 0 && (
              <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-900/50 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="text-red-600 dark:text-red-500 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-red-700 dark:text-red-500 font-semibold mb-1">
                      สินค้าหมดสต็อค ({outOfStockItems.length} รายการ)
                    </h3>
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      {outOfStockItems.map((item) => item.product.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div className="mb-6 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-900/50 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-yellow-700 dark:text-yellow-500 font-semibold mb-1">
                      สินค้าใกล้หมด ({lowStockItems.length} รายการ)
                    </h3>
                    <p className="text-gray-600 dark:text-zinc-400 text-sm">
                      {lowStockItems.map((item) => item.product.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={20} />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Stock Table */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Package size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
                <p className="text-gray-600 dark:text-zinc-400 text-lg">
                  {searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีข้อมูลสต็อค'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                        <th className="text-left p-4 text-gray-600 dark:text-zinc-400 font-medium">สินค้า</th>
                        <th className="text-left p-4 text-gray-600 dark:text-zinc-400 font-medium">รายละเอียด</th>
                        <th className="text-center p-4 text-gray-600 dark:text-zinc-400 font-medium">จำนวน</th>
                        <th className="text-center p-4 text-gray-600 dark:text-zinc-400 font-medium">สถานะ</th>
                        <th className="text-right p-4 text-gray-600 dark:text-zinc-400 font-medium">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
                        >
                          <td className="p-4">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {item.product.name}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-600 dark:text-zinc-400 text-sm">
                              {item.product.description || '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {item.quantity === 0 ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-900/50">
                                หมดสต็อค
                              </span>
                            ) : item.quantity < 10 ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-900/50">
                                ใกล้หมด
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-900/50">
                                พร้อมใช้
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {adjustingStock === item.id ? (
                              <div className="flex items-center justify-end space-x-2">
                                <input
                                  type="number"
                                  value={adjustAmount}
                                  onChange={(e) => setAdjustAmount(e.target.value)}
                                  placeholder="จำนวน"
                                  className="w-20 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1 text-gray-900 dark:text-white text-center focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    const amount = parseInt(adjustAmount);
                                    if (!isNaN(amount)) {
                                      handleAdjustStock(item.id, amount);
                                    }
                                  }}
                                  className="bg-green-600 dark:bg-green-900 hover:bg-green-700 dark:hover:bg-green-800 text-white px-3 py-1 rounded-lg transition-all text-sm"
                                >
                                  ตกลง
                                </button>
                                <button
                                  onClick={() => {
                                    setAdjustingStock(null);
                                    setAdjustAmount('');
                                  }}
                                  className="bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-3 py-1 rounded-lg transition-all text-sm"
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleAdjustStock(item.id, -1)}
                                  className="bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white p-2 rounded-lg transition-all"
                                  disabled={item.quantity === 0}
                                >
                                  <Minus size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setAdjustingStock(item.id);
                                    setAdjustAmount('');
                                  }}
                                  className="bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-all text-sm"
                                >
                                  ปรับ
                                </button>
                                <button
                                  onClick={() => handleAdjustStock(item.id, 1)}
                                  className="bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white p-2 rounded-lg transition-all"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-2">
                  {filteredStock.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openEditModal(item)}
                      className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm hover:border-gray-300 dark:hover:border-zinc-700 transition-all text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {item.product.name}
                          </h3>
                          {item.product.description && (
                            <p className="text-xs text-gray-600 dark:text-zinc-400 truncate">
                              {item.product.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {item.quantity}
                            </div>
                          </div>
                          {item.quantity === 0 ? (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                          ) : item.quantity < 10 ? (
                            <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                          )}
                          <Edit size={18} className="text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Stock Movements Tab */}
        {activeTab === 'movements' && (
          <>
            {/* Search and Filters */}
            <div className="mb-6 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={20} />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                />
              </div>

              {/* Filter Toggle Button (Mobile) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden w-full flex items-center justify-center space-x-2 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all"
              >
                <Filter size={20} />
                <span>ตัวกรอง</span>
                {(filterStartDate || filterEndDate || filterProductId || filterMovementType) && (
                  <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {[filterStartDate, filterEndDate, filterProductId, filterMovementType].filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* Filters */}
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 ${showFilters ? 'block' : 'hidden md:grid'}`}>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" size={18} />
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    placeholder="จากวันที่"
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                  />
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" size={18} />
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    placeholder="ถึงวันที่"
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                  />
                </div>

                <select
                  value={filterProductId}
                  onChange={(e) => setFilterProductId(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                >
                  <option value="">สินค้าทั้งหมด</option>
                  {stockItems.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.product.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterMovementType}
                  onChange={(e) => setFilterMovementType(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                >
                  <option value="">ประเภททั้งหมด</option>
                  <option value="IN">เพิ่มสต็อค</option>
                  <option value="OUT">ลดสต็อค</option>
                  <option value="SERVICE_USE">ใช้ในบริการ</option>
                  <option value="ADJUSTMENT">ปรับปรุง</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(filterStartDate || filterEndDate || filterProductId || filterMovementType || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}
            </div>

            {/* Movements List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Activity size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
                <p className="text-gray-600 dark:text-zinc-400 text-lg">
                  ไม่พบรายการเคลื่อนไหว
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Group by date */}
                {Object.entries(
                  filteredMovements.reduce((groups, movement) => {
                    const date = movement.created_at
                      ? new Date(movement.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'ไม่ระบุวันที่';
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(movement);
                    return groups;
                  }, {} as Record<string, StockMovement[]>)
                ).map(([date, dayMovements]) => (
                  <div key={date}>
                    {/* Date Header */}
                    <div className="sticky top-0 bg-gray-100 dark:bg-zinc-900 px-4 py-2 rounded-lg mb-2 z-10">
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} className="text-gray-600 dark:text-zinc-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {date}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-zinc-400">
                          ({dayMovements.length} รายการ)
                        </span>
                      </div>
                    </div>

                    {/* Movements */}
                    <div className="space-y-2">
                      {dayMovements.map((movement) => (
                        <div
                          key={movement.id}
                          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-start space-x-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 bg-gray-100 dark:bg-zinc-800 p-2 rounded-lg">
                              {getMovementIcon(movement.movement_type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {movement.product.name}
                                </h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${getMovementColor(movement.movement_type)}`}>
                                  {getMovementLabel(movement.movement_type)}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-zinc-400 mb-2">
                                <span>
                                  {movement.created_at
                                    ? new Date(movement.created_at).toLocaleTimeString('th-TH', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '-'} น.
                                </span>
                                <span className="flex items-center space-x-1">
                                  <span className="text-gray-400 dark:text-zinc-500">•</span>
                                  <span className={movement.quantity > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                  </span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <span className="text-gray-400 dark:text-zinc-500">•</span>
                                  <span>{movement.quantity_before} → {movement.quantity_after}</span>
                                </span>
                              </div>

                              {movement.notes && (
                                <p className="text-xs text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/50 px-2 py-1 rounded">
                                  {movement.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Stock Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-white dark:bg-black md:bg-black/50 md:backdrop-blur-sm z-50 md:flex md:items-center md:justify-center md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 md:rounded-2xl max-w-sm w-full h-full md:h-auto shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {editingItem.product.name}
              </h2>
              {editingItem.product.description && (
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  {editingItem.product.description}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Current Stock Display */}
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-zinc-400 mb-2">สต็อคปัจจุบัน</div>
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {tempQuantity}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {tempQuantity === 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-xs text-red-600 dark:text-red-400">หมดสต็อค</span>
                    </>
                  ) : tempQuantity < 10 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">ใกล้หมด</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-xs text-green-600 dark:text-green-400">พร้อมใช้</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Adjust Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTempQuantity(Math.max(0, tempQuantity - 10))}
                  className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
                >
                  <Minus size={24} className="text-gray-900 dark:text-white mb-1" />
                  <span className="text-xs text-gray-600 dark:text-zinc-400">-10</span>
                </button>
                <button
                  onClick={() => setTempQuantity(Math.max(0, tempQuantity - 1))}
                  className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
                >
                  <Minus size={24} className="text-gray-900 dark:text-white mb-1" />
                  <span className="text-xs text-gray-600 dark:text-zinc-400">-1</span>
                </button>
                <button
                  onClick={() => setTempQuantity(0)}
                  className="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 rounded-xl transition-all"
                >
                  <X size={24} className="text-red-600 dark:text-red-400 mb-1" />
                  <span className="text-xs text-red-600 dark:text-red-400">ศูนย์</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTempQuantity(tempQuantity + 1)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
                >
                  <Plus size={24} className="text-gray-900 dark:text-white mb-1" />
                  <span className="text-xs text-gray-600 dark:text-zinc-400">+1</span>
                </button>
                <button
                  onClick={() => setTempQuantity(tempQuantity + 10)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
                >
                  <Plus size={24} className="text-gray-900 dark:text-white mb-1" />
                  <span className="text-xs text-gray-600 dark:text-zinc-400">+10</span>
                </button>
                <button
                  onClick={() => setTempQuantity(tempQuantity + 100)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
                >
                  <Plus size={24} className="text-gray-900 dark:text-white mb-1" />
                  <span className="text-xs text-gray-600 dark:text-zinc-400">+100</span>
                </button>
              </div>

              {/* Manual Input */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">
                  ปรับจำนวนเอง
                </label>
                <input
                  type="number"
                  value={tempQuantity}
                  onChange={(e) => setTempQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-center text-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                  min="0"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-zinc-800 flex gap-3 flex-shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveStock}
                className="flex-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-6 py-3 rounded-xl font-semibold transition-all"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
