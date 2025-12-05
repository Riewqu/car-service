'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Search, Package, Folder, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  categoryName?: string;
  currentPrice?: number;
  stock?: number;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  products?: Product[];
};

export default function ProductsReadOnlyPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Swipe States
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);

      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select(`
          *,
          products (
            *,
            product_prices (price, effective_date),
            stock (quantity)
          )
        `)
        .order('name');

      if (catError) throw catError;

      const categoriesWithProducts = (categoriesData || []).map((category: any) => {
        const products = (category.products || []).map((product: any) => {
          const sortedPrices = (product.product_prices || [])
            .sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            category_id: product.category_id,
            categoryName: category.name,
            currentPrice: sortedPrices[0]?.price || 0,
            stock: product.stock?.[0]?.quantity || 0,
          };
        });

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          image_url: category.image_url,
          products,
        };
      });

      setCategories(categoriesWithProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryClick = useCallback((category: Category) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
    setModalSearchTerm('');
  }, []);

  const closeCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
    setModalSearchTerm('');
  }, []);

  // Navigate to next/prev category
  const navigateCategory = useCallback((direction: 'next' | 'prev') => {
    if (!selectedCategory) return;

    const currentIndex = categories.findIndex(c => c.id === selectedCategory.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % categories.length;
    } else {
      newIndex = (currentIndex - 1 + categories.length) % categories.length;
    }

    setSelectedCategory(categories[newIndex]);
    setModalSearchTerm('');
  }, [selectedCategory, categories]);

  // Keyboard navigation
  useEffect(() => {
    if (!isCategoryModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateCategory('prev');
      } else if (e.key === 'ArrowRight') {
        navigateCategory('next');
      } else if (e.key === 'Escape') {
        closeCategoryModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCategoryModalOpen, navigateCategory, closeCategoryModal]);

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
      navigateCategory('next');
    }
    if (isRightSwipe) {
      navigateCategory('prev');
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const filteredCategories = useMemo(() =>
    categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.products?.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [categories, searchTerm]
  );

  // Filter products in modal
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    if (!modalSearchTerm) return selectedCategory.products || [];

    return (selectedCategory.products || []).filter(p =>
      p.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(modalSearchTerm.toLowerCase())
    );
  }, [selectedCategory, modalSearchTerm]);

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">สินค้าและอะไหล่</h1>
            <p className="text-gray-600 dark:text-zinc-400">เลือกหมวดหมู่เพื่อดูรายการสินค้า</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="ค้นหาหมวดหมู่หรือสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Folder size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
            <p className="text-gray-600 dark:text-zinc-400 text-lg mb-4">
              {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีหมวดหมู่ในระบบ'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-zinc-600 transition-all group text-left shadow-sm hover:shadow-md"
              >
                <div className="aspect-square bg-gray-200 dark:bg-zinc-800 relative overflow-hidden">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                      quality={75}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder size={64} className="text-gray-400 dark:text-zinc-600" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mb-2 line-clamp-2">{category.description}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-zinc-500">
                    {category.products?.length || 0} สินค้า
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full-Screen Category Modal with Products */}
      {isCategoryModalOpen && selectedCategory && (
        <div
          className="fixed inset-0 bg-white dark:bg-black z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
          ref={modalRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 z-20">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={closeCategoryModal}
                className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
                title="ปิด (ESC)"
              >
                <X size={24} />
              </button>

              <div className="flex-1 mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="ค้นหาสินค้าในหมวดหมู่นี้..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateCategory('prev')}
                  className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-30"
                  disabled={categories.length <= 1}
                  title="หมวดหมู่ก่อนหน้า (←)"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => navigateCategory('next')}
                  className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-30"
                  disabled={categories.length <= 1}
                  title="หมวดหมู่ถัดไป (→)"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100vh-64px)] overflow-y-auto">
            {/* Category Hero Section */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-zinc-900 p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800">
              <div className="max-w-5xl mx-auto flex items-center gap-4">
                {selectedCategory.image_url ? (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border-2 border-white dark:border-zinc-700">
                    <Image
                      src={selectedCategory.image_url}
                      alt={selectedCategory.name}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                      quality={85}
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-white dark:border-zinc-700">
                    <Folder size={40} className="text-gray-400 dark:text-zinc-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedCategory.name}
                  </h1>
                  {selectedCategory.description && (
                    <p className="text-sm md:text-base text-gray-600 dark:text-zinc-400 line-clamp-2">
                      {selectedCategory.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
                    {filteredProducts.length} สินค้า
                    {modalSearchTerm && ` (จากทั้งหมด ${selectedCategory.products?.length || 0})`}
                  </p>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="p-4 md:p-6">
              {filteredProducts.length > 0 ? (
                <div className="max-w-5xl mx-auto space-y-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3 line-clamp-2">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Price */}
                            <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                              ฿{product.currentPrice?.toFixed(2) || '0.00'}
                            </span>

                            {/* Separator */}
                            <span className="text-gray-400 dark:text-zinc-600">•</span>

                            {/* Stock */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-zinc-500">สต็อค:</span>
                              <span className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                                {product.stock || 0}
                              </span>
                              {product.stock === 0 ? (
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                                  หมดสต็อค
                                </span>
                              ) : product.stock && product.stock < 10 ? (
                                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                  ใกล้หมด
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">
                                  พร้อมจำหน่าย
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <Package size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
                  <p className="text-gray-600 dark:text-zinc-400 text-lg">
                    {modalSearchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าในหมวดหมู่นี้'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Category Carousel */}
            <div className="border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    หมวดหมู่อื่นๆ ({categories.length})
                  </h2>
                </div>

                <div className="overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar">
                  <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category);
                          setModalSearchTerm('');
                        }}
                        className={`flex-shrink-0 w-48 rounded-xl p-3 transition-all text-left border-2 ${
                          category.id === selectedCategory.id
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                            : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {category.image_url ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={category.image_url}
                                alt={category.name}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                                quality={75}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Folder size={24} className="text-gray-400 dark:text-zinc-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold truncate ${
                              category.id === selectedCategory.id
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {category.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                              {category.products?.length || 0} สินค้า
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swipe Indicator */}
          {categories.length > 1 && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 dark:bg-zinc-100/90 text-white dark:text-black px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-2 shadow-lg">
              <div className="flex items-center gap-1">
                <ChevronLeft size={14} />
                <ChevronRight size={14} />
              </div>
              <span>ปัดซ้าย-ขวาเพื่อดูหมวดหมู่อื่น</span>
            </div>
          )}
        </div>
      )}

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
