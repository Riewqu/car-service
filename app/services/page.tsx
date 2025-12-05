'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Plus, Car, Calendar, Package, Wrench, FileText, ChevronRight, ChevronLeft, X, Filter, Check, Edit, Trash2, History as HistoryIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MultiSelectModal from '@/components/MultiSelectModal';
import EditServiceModal from '@/components/EditServiceModal';
import AuditTrail from '@/components/AuditTrail';
import { softDeleteServiceRecord } from '@/lib/service-audit';

type ServiceRecord = {
  id: string;
  license_plate: string;
  service_date: string;
  notes: string | null;
  created_at: string;
  services: Array<{
    service_type: {
      id: string;
      name: string;
    }
  }>;
  products: Array<{
    quantity: number;
    price_at_time: number;
    product: {
      id: string;
      name: string;
    };
  }>;
  images: Array<{
    id: string;
    image_url: string;
    image_date: string;
  }>;
};

type GroupedRecord = {
  license_plate: string;
  records: ServiceRecord[];
  latestDate: string;
  totalAmount: number;
  totalServices: number;
  totalProducts: number;
  latestImage?: string | null;
};

type ServiceType = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
};

export default function ServicesPage() {
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedRecord | null>(null);
  const [modalSearchDate, setModalSearchDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal States
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<ServiceRecord | null>(null);
  const [selectedRecordForAudit, setSelectedRecordForAudit] = useState<string | null>(null);

  // Swipe States
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Helper function to calculate time ago
  const getTimeAgo = useCallback((dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'วันนี้';
    if (diffInDays === 1) return 'เมื่อวาน';
    if (diffInDays < 7) return `${diffInDays} วัน`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} สัปดาห์`;
    }
    if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} เดือน`;
    }
    const years = Math.floor(diffInDays / 365);
    return `${years} ปี`;
  }, []);

  useEffect(() => {
    fetchServiceRecords();
    fetchServiceTypes();
    fetchProducts();
  }, []);

  const fetchServiceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_records')
        .select(`
          *,
          services:service_record_services(
            service_type:service_types(id, name)
          ),
          products:service_record_products(
            quantity,
            price_at_time,
            product:products(id, name)
          ),
          images:service_images(
            id,
            image_url,
            image_date
          )
        `)
        .is('deleted_at', null) // Only show non-deleted records
        .order('service_date', { ascending: false });

      if (error) throw error;
      setServiceRecords(data || []);
    } catch (error) {
      console.error('Error fetching service records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const calculateTotal = useCallback((record: ServiceRecord) => {
    return record.products.reduce(
      (sum, p) => sum + p.price_at_time * p.quantity,
      0
    );
  }, []);

  // Group records by license plate
  const groupedRecords = useMemo(() => {
    const groups = new Map<string, GroupedRecord>();

    serviceRecords.forEach((record) => {
      const plate = record.license_plate;
      if (!groups.has(plate)) {
        groups.set(plate, {
          license_plate: plate,
          records: [],
          latestDate: record.service_date,
          totalAmount: 0,
          totalServices: 0,
          totalProducts: 0,
        });
      }

      const group = groups.get(plate)!;
      group.records.push(record);

      // Update latest date
      if (new Date(record.service_date) > new Date(group.latestDate)) {
        group.latestDate = record.service_date;
      }

      // Calculate totals
      const recordTotal = calculateTotal(record);
      group.totalAmount += recordTotal;
      group.totalServices += record.services.length;
      group.totalProducts += record.products.length;
    });

    // Sort records within each group by date (newest first)
    groups.forEach((group) => {
      group.records.sort((a, b) =>
        new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
      );

      // Get latest image from the most recent record
      const latestRecord = group.records[0];
      if (latestRecord && latestRecord.images && latestRecord.images.length > 0) {
        group.latestImage = latestRecord.images[0].image_url;
      } else {
        group.latestImage = null;
      }
    });

    // Convert to array and sort by latest date
    return Array.from(groups.values()).sort((a, b) =>
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  }, [serviceRecords, calculateTotal]);

  const filteredGroups = useMemo(() => {
    return groupedRecords.filter((group) => {
      // Filter by license plate
      if (searchTerm && !group.license_plate.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filter by date range
      const hasRecordInDateRange = group.records.some((record) => {
        const recordDate = record.service_date.split('T')[0];

        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;

        return true;
      });

      if ((startDate || endDate) && !hasRecordInDateRange) {
        return false;
      }

      // Filter by service types
      if (selectedServiceTypes.length > 0) {
        const hasSelectedService = group.records.some((record) =>
          record.services.some((service) =>
            selectedServiceTypes.includes(service.service_type.id)
          )
        );

        if (!hasSelectedService) return false;
      }

      // Filter by products
      if (selectedProducts.length > 0) {
        const hasSelectedProduct = group.records.some((record) =>
          record.products.some((product) =>
            selectedProducts.includes(product.product.id)
          )
        );

        if (!hasSelectedProduct) return false;
      }

      return true;
    });
  }, [groupedRecords, searchTerm, startDate, endDate, selectedServiceTypes, selectedProducts]);

  const filteredModalRecords = useMemo(() => {
    if (!selectedGroup) return [];

    if (!modalSearchDate) return selectedGroup.records;

    return selectedGroup.records.filter((record) =>
      record.service_date.startsWith(modalSearchDate)
    );
  }, [selectedGroup, modalSearchDate]);

  const toggleServiceType = (typeId: string) => {
    setSelectedServiceTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllServiceTypes = () => {
    setSelectedServiceTypes(serviceTypes.map(t => t.id));
  };

  const clearAllServiceTypes = () => {
    setSelectedServiceTypes([]);
  };

  const selectAllProducts = () => {
    setSelectedProducts(products.map(p => p.id));
  };

  const clearAllProducts = () => {
    setSelectedProducts([]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedServiceTypes([]);
    setSelectedProducts([]);
  };

  const hasActiveFilters = searchTerm || startDate || endDate || selectedServiceTypes.length > 0 || selectedProducts.length > 0;

  const toggleExpand = async (recordId: string) => {
    if (expandedRecord === recordId) {
      setExpandedRecord(null);
      return;
    }

    // Fetch fresh data including images when expanding
    try {
      const { data, error } = await supabase
        .from('service_records')
        .select(`
          *,
          services:service_record_services(
            service_type:service_types(id, name)
          ),
          products:service_record_products(
            quantity,
            price_at_time,
            product:products(id, name)
          ),
          images:service_images(
            id,
            image_url,
            image_date
          )
        `)
        .eq('id', recordId)
        .single();

      if (error) throw error;

      // Update the specific record in the list with fresh data
      setServiceRecords(serviceRecords.map(record =>
        record.id === recordId ? data : record
      ));
    } catch (error) {
      console.error('Error fetching updated record:', error);
    }

    setExpandedRecord(recordId);
  };

  const handleGroupClick = useCallback((group: GroupedRecord) => {
    // On mobile, open modal; on desktop, use expand behavior
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      setSelectedGroup(group);
      setModalSearchDate('');
    } else {
      // For desktop, expand the first record
      if (expandedRecord === group.license_plate) {
        setExpandedRecord(null);
      } else {
        setExpandedRecord(group.license_plate);
      }
    }
  }, [expandedRecord]);

  const handleEditRecord = (record: ServiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecordForEdit(record);
    setIsEditModalOpen(true);
  };

  const handleDeleteRecord = async (record: ServiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmDelete = confirm(
      `คุณแน่ใจหรือไม่ที่จะลบรายการบริการ\nทะเบียน: ${record.license_plate}\nวันที่: ${new Date(record.service_date).toLocaleDateString('th-TH')}\n\n⚠️ การลบนี้สามารถกู้คืนได้ในภายหลัง`
    );

    if (!confirmDelete) return;

    const reason = prompt('กรุณาระบุเหตุผลของการลบ:');
    if (!reason || !reason.trim()) {
      alert('กรุณาระบุเหตุผลของการลบ');
      return;
    }

    const result = await softDeleteServiceRecord(record.id, 'user', reason.trim());

    if (result.success) {
      alert('ลบรายการสำเร็จ');
      fetchServiceRecords();
    } else {
      alert(result.message);
    }
  };

  const handleViewHistory = (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecordForAudit(recordId);
    setIsAuditTrailOpen(true);
  };

  const handleEditSuccess = () => {
    fetchServiceRecords();
  };

  const closeModal = useCallback(() => {
    setSelectedGroup(null);
    setModalSearchDate('');
  }, []);

  // Navigate to next/prev group
  const navigateGroup = useCallback((direction: 'next' | 'prev') => {
    if (!selectedGroup) return;

    const currentIndex = filteredGroups.findIndex(g => g.license_plate === selectedGroup.license_plate);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % filteredGroups.length;
    } else {
      newIndex = (currentIndex - 1 + filteredGroups.length) % filteredGroups.length;
    }

    setSelectedGroup(filteredGroups[newIndex]);
    setModalSearchDate('');
  }, [selectedGroup, filteredGroups]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedGroup) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateGroup('prev');
      } else if (e.key === 'ArrowRight') {
        navigateGroup('next');
      } else if (e.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGroup, navigateGroup, closeModal]);

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      navigateGroup('next');
    }
    if (isRightSwipe) {
      navigateGroup('prev');
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20 md:pb-6">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">ประวัติการบริการ</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400">ดูประวัติการบริการรถทั้งหมด</p>
          </div>
          <Link
            href="/services/new"
            className="flex items-center justify-center space-x-2 bg-gray-900 dark:bg-white text-white dark:text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>บันทึกการบริการ</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="ค้นหาทะเบียนรถ..."
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
            {hasActiveFilters && (
              <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {[startDate, endDate, selectedServiceTypes.length > 0, selectedProducts.length > 0].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Filters */}
          <div className={`space-y-3 ${showFilters ? 'block' : 'hidden md:block'}`}>
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" size={18} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="จากวันที่"
                  className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" size={18} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="ถึงวันที่"
                  className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Service Types Multi-Select */}
            {serviceTypes.length > 0 && (
              <button
                type="button"
                onClick={() => setIsServiceTypeModalOpen(true)}
                className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wrench size={20} className="text-gray-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ประเภทการบริการ
                    </span>
                  </div>
                  {selectedServiceTypes.length > 0 ? (
                    <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                      {selectedServiceTypes.length}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-zinc-500">เลือก</span>
                  )}
                </div>
                {selectedServiceTypes.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-zinc-400">
                    {selectedServiceTypes.slice(0, 3).map(id => serviceTypes.find(t => t.id === id)?.name).join(', ')}
                    {selectedServiceTypes.length > 3 && ` +${selectedServiceTypes.length - 3}`}
                  </div>
                )}
              </button>
            )}

            {/* Products Multi-Select */}
            {products.length > 0 && (
              <button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package size={20} className="text-gray-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      อะไหล่ที่ใช้
                    </span>
                  </div>
                  {selectedProducts.length > 0 ? (
                    <span className="bg-green-600 dark:bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                      {selectedProducts.length}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-zinc-500">เลือก</span>
                  )}
                </div>
                {selectedProducts.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-zinc-400">
                    {selectedProducts.slice(0, 3).map(id => products.find(p => p.id === id)?.name).join(', ')}
                    {selectedProducts.length > 3 && ` +${selectedProducts.length - 3}`}
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X size={16} />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        {/* Service Records */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Car size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
            <p className="text-gray-600 dark:text-zinc-400 text-lg mb-4">
              {hasActiveFilters ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีประวัติการบริการ'}
            </p>
            {!hasActiveFilters && (
              <Link
                href="/services/new"
                className="flex items-center space-x-2 bg-gray-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
              >
                <Plus size={20} />
                <span>เพิ่มการบริการแรก</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((group) => {
              const isExpanded = expandedRecord === group.license_plate;

              return (
                <div
                  key={group.license_plate}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-zinc-700 transition-all shadow-sm"
                >
                  {/* Header - Always Visible */}
                  <button
                    onClick={() => handleGroupClick(group)}
                    className="w-full p-3 sm:p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="flex md:hidden items-start gap-2 sm:gap-3">
                      {/* Image or Icon */}
                      {group.latestImage ? (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-zinc-800">
                          <Image
                            src={group.latestImage}
                            alt={group.license_plate}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                            quality={75}
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-200 dark:bg-zinc-800 rounded-lg flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                          <Car size={20} className="text-gray-900 dark:text-white sm:w-6 sm:h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                            {group.license_plate}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-600 dark:text-zinc-400 flex-shrink-0">
                            {group.totalServices > 0 && (
                              <div className="flex items-center space-x-0.5 sm:space-x-1">
                                <Wrench size={12} className="sm:w-3.5 sm:h-3.5" />
                                <span className="text-[10px] sm:text-xs">{group.totalServices}</span>
                              </div>
                            )}
                            {group.totalProducts > 0 && (
                              <div className="flex items-center space-x-0.5 sm:space-x-1">
                                <Package size={12} className="sm:w-3.5 sm:h-3.5" />
                                <span className="text-[10px] sm:text-xs">{group.totalProducts}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-gray-600 dark:text-zinc-400 mb-0.5 sm:mb-1">
                          <div className="flex items-center space-x-1">
                            <Calendar size={11} className="sm:w-3 sm:h-3" />
                            <span>
                              {new Date(group.latestDate).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <span className="text-gray-400 dark:text-zinc-500 hidden xs:inline">•</span>
                          <span>{getTimeAgo(group.latestDate)}</span>
                          <span className="text-gray-400 dark:text-zinc-500">•</span>
                          <span>{group.records.length} ครั้ง</span>
                        </div>
                        {/* Latest Services Preview */}
                        {group.records[0]?.services && group.records[0].services.length > 0 && (
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-500 truncate">
                            {group.records[0].services.slice(0, 2).map(s => s.service_type.name).join(', ')}
                            {group.records[0].services.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-gray-600 dark:text-zinc-400 flex-shrink-0 sm:w-5 sm:h-5"
                      />
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 lg:gap-4 flex-1 text-left min-w-0">
                        {/* Image or Icon */}
                        {group.latestImage ? (
                          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-zinc-800">
                            <Image
                              src={group.latestImage}
                              alt={group.license_plate}
                              width={80}
                              height={80}
                              className="object-cover w-full h-full"
                              quality={75}
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-200 dark:bg-zinc-800 p-2 lg:p-3 rounded-xl flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center">
                            <Car size={28} className="lg:w-8 lg:h-8 text-gray-900 dark:text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 lg:gap-4 mb-1">
                            <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white truncate">
                              {group.license_plate}
                            </h3>
                            <div className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-600 dark:text-zinc-400 flex-shrink-0">
                              {group.totalServices > 0 && (
                                <div className="flex items-center space-x-1 lg:space-x-1.5">
                                  <Wrench size={14} className="lg:w-4 lg:h-4" />
                                  <span>{group.totalServices}</span>
                                </div>
                              )}
                              {group.totalProducts > 0 && (
                                <div className="flex items-center space-x-1 lg:space-x-1.5">
                                  <Package size={14} className="lg:w-4 lg:h-4" />
                                  <span>{group.totalProducts}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-600 dark:text-zinc-400 mb-1">
                            <div className="flex items-center space-x-1.5 lg:space-x-2">
                              <Calendar size={14} className="lg:w-4 lg:h-4" />
                              <span>
                                {new Date(group.latestDate).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <span>•</span>
                            <span>{getTimeAgo(group.latestDate)}ที่แล้ว</span>
                            <span>•</span>
                            <span>มาบริการ {group.records.length} ครั้ง</span>
                          </div>
                          {/* Latest Services Preview */}
                          {group.records[0]?.services && group.records[0].services.length > 0 && (
                            <div className="text-xs lg:text-sm text-gray-500 dark:text-zinc-500 truncate">
                              บริการล่าสุด: {group.records[0].services.slice(0, 3).map(s => s.service_type.name).join(', ')}
                              {group.records[0].services.length > 3 && '...'}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className={`lg:w-6 lg:h-6 text-gray-600 dark:text-zinc-400 transition-transform flex-shrink-0 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Details - Desktop */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-zinc-800 p-6 space-y-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        ประวัติการบริการทั้งหมด ({group.records.length} ครั้ง)
                      </h4>
                      <div className="space-y-4">
                        {group.records.map((record, index) => {
                          const recordTotal = calculateTotal(record);
                          return (
                            <div key={record.id} className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-4">
                              {/* Record Header */}
                              <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 pb-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    ครั้งที่ {index + 1}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-zinc-400 flex items-center space-x-2">
                                    <Calendar size={12} />
                                    <span>
                                      {new Date(record.service_date).toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {recordTotal > 0 && (
                                    <div className="text-lg font-bold text-gray-900 dark:text-white mr-3">
                                      ฿{recordTotal.toFixed(2)}
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => handleViewHistory(record.id, e)}
                                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                                    title="ดูประวัติการเปลี่ยนแปลง"
                                  >
                                    <HistoryIcon size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => handleEditRecord(record, e)}
                                    className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                    title="แก้ไข"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteRecord(record, e)}
                                    className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                    title="ลบ"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Services */}
                              {record.services.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">บริการที่ทำ</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {record.services.map((service, idx) => (
                                      <span
                                        key={idx}
                                        className="bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white px-3 py-1 rounded-lg text-xs"
                                      >
                                        {service.service_type.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Products */}
                              {record.products.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">อะไหล่ที่ใช้</h5>
                                  <div className="space-y-1">
                                    {record.products.map((product, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between text-xs bg-white dark:bg-zinc-800 p-2 rounded"
                                      >
                                        <span className="text-gray-900 dark:text-white">{product.product.name}</span>
                                        <span className="text-gray-600 dark:text-zinc-400">
                                          ฿{product.price_at_time.toFixed(2)} x {product.quantity}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {record.notes && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">หมายเหตุ</h5>
                                  <p className="text-xs text-gray-700 dark:text-zinc-300">{record.notes}</p>
                                </div>
                              )}

                              {/* Images */}
                              {record.images && record.images.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">
                                    รูปภาพ ({record.images.length})
                                  </h5>
                                  <div className="grid grid-cols-4 gap-2">
                                    {record.images.map((image) => (
                                      <div key={image.id} className="relative h-20 rounded overflow-hidden">
                                        <Image
                                          src={image.image_url}
                                          alt="Service"
                                          fill
                                          className="object-cover"
                                          sizes="100px"
                                          loading="lazy"
                                          quality={75}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Modal - All Records for Selected Group */}
      {selectedGroup && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-white dark:bg-black overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          ref={modalRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 z-20">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
                title="ปิด (ESC)"
              >
                <X size={24} />
              </button>

              <div className="flex-1 mx-4 flex items-center justify-center space-x-3">
                <div className="bg-gray-200 dark:bg-zinc-800 p-2 rounded-lg">
                  <Car size={20} className="text-gray-900 dark:text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedGroup.license_plate}
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    {selectedGroup.records.length} ครั้ง
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateGroup('prev')}
                  className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-30"
                  disabled={filteredGroups.length <= 1}
                  title="รถคันก่อนหน้า (←)"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => navigateGroup('next')}
                  className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-30"
                  disabled={filteredGroups.length <= 1}
                  title="รถคันถัดไป (→)"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Content - All Records */}
          <div className="h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-4 space-y-3">
            {filteredModalRecords.map((record, index) => {
              const recordTotal = calculateTotal(record);
              return (
                <div key={record.id} className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                  {/* Record Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 pb-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        ครั้งที่ {index + 1}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-zinc-400 flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>
                          {new Date(record.service_date).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {recordTotal > 0 && (
                        <div className="text-base font-bold text-gray-900 dark:text-white mr-2">
                          ฿{recordTotal.toFixed(2)}
                        </div>
                      )}
                      <button
                        onClick={(e) => handleViewHistory(record.id, e)}
                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                        title="ดูประวัติการเปลี่ยนแปลง"
                      >
                        <HistoryIcon size={18} />
                      </button>
                      <button
                        onClick={(e) => handleEditRecord(record, e)}
                        className="p-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        title="แก้ไข"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteRecord(record, e)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Services */}
                  {record.services.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">บริการที่ทำ</h5>
                      <div className="flex flex-wrap gap-2">
                        {record.services.map((service, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-white px-3 py-1 rounded-lg text-xs"
                          >
                            {service.service_type.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {record.products.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">อะไหล่ที่ใช้</h5>
                      <div className="space-y-2">
                        {record.products.map((product, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white dark:bg-zinc-800 p-2.5 rounded-lg text-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900 dark:text-white font-medium truncate">
                                {product.product.name}
                              </div>
                              <div className="text-gray-600 dark:text-zinc-400">
                                ฿{product.price_at_time.toFixed(2)} x {product.quantity}
                              </div>
                            </div>
                            <div className="text-gray-900 dark:text-white font-semibold whitespace-nowrap">
                              ฿{(product.price_at_time * product.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {record.notes && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">หมายเหตุ</h5>
                      <p className="text-xs text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 p-3 rounded-lg">
                        {record.notes}
                      </p>
                    </div>
                  )}

                  {/* Images */}
                  {record.images && record.images.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">
                        รูปภาพ ({record.images.length})
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        {record.images.map((image) => (
                          <div key={image.id} className="relative h-32 rounded-lg overflow-hidden">
                            <Image
                              src={image.image_url}
                              alt="Service"
                              fill
                              className="object-cover"
                              sizes="50vw"
                              loading="lazy"
                              quality={75}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>

            {/* Bottom Vehicle Carousel */}
            <div className="border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    รถคันอื่นๆ ({filteredGroups.length})
                  </h2>
                </div>

                <div className="overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar">
                  <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                    {filteredGroups.map((group) => (
                      <button
                        key={group.license_plate}
                        onClick={() => {
                          setSelectedGroup(group);
                          setModalSearchDate('');
                        }}
                        className={`flex-shrink-0 w-56 rounded-xl p-3 transition-all text-left border-2 ${
                          group.license_plate === selectedGroup.license_plate
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                            : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${
                            group.license_plate === selectedGroup.license_plate
                              ? 'bg-blue-200 dark:bg-blue-800'
                              : 'bg-gray-200 dark:bg-zinc-800'
                          }`}>
                            <Car size={20} className={
                              group.license_plate === selectedGroup.license_plate
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-gray-900 dark:text-white'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-lg truncate ${
                              group.license_plate === selectedGroup.license_plate
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {group.license_plate}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                              {group.records.length} ครั้ง
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
                          {group.totalServices > 0 && (
                            <div className="flex items-center space-x-1">
                              <Wrench size={12} />
                              <span>{group.totalServices}</span>
                            </div>
                          )}
                          {group.totalProducts > 0 && (
                            <div className="flex items-center space-x-1">
                              <Package size={12} />
                              <span>{group.totalProducts}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swipe Indicator */}
          {filteredGroups.length > 1 && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 dark:bg-zinc-100/90 text-white dark:text-black px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-2 shadow-lg">
              <div className="flex items-center gap-1">
                <ChevronLeft size={14} />
                <ChevronRight size={14} />
              </div>
              <span>ปัดซ้าย-ขวาเพื่อดูรถคันอื่น</span>
            </div>
          )}
        </div>
      )}

      {/* Service Type Modal */}
      <MultiSelectModal
        isOpen={isServiceTypeModalOpen}
        onClose={() => setIsServiceTypeModalOpen(false)}
        title="ประเภทการบริการ"
        items={serviceTypes}
        selectedIds={selectedServiceTypes}
        onToggle={toggleServiceType}
        onSelectAll={selectAllServiceTypes}
        onClearAll={clearAllServiceTypes}
      />

      {/* Product Modal */}
      <MultiSelectModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="อะไหล่ที่ใช้"
        items={products}
        selectedIds={selectedProducts}
        onToggle={toggleProduct}
        onSelectAll={selectAllProducts}
        onClearAll={clearAllProducts}
      />

      {/* Edit Service Modal */}
      <EditServiceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        serviceRecord={selectedRecordForEdit}
        onSuccess={handleEditSuccess}
      />

      {/* Audit Trail Modal */}
      <AuditTrail
        serviceRecordId={selectedRecordForAudit || ''}
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
      />

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
