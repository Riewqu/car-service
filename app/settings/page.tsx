'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, Package, Wrench, Settings as SettingsIcon, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PinSettings from '@/components/PinSettings';

type Category = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  currentPrice?: number;
};

type ServiceType = {
  id: string;
  name: string;
  description?: string | null;
  default_price?: number | null;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'security'>('products');
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Product states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Service Type states
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null);
  const [serviceTypeForm, setServiceTypeForm] = useState({
    name: '',
    description: '',
    default_price: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: '',
  });

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'products') {
      await fetchCategories();
    } else {
      await fetchServiceTypes();
    }
    setLoading(false);
  }, [activeTab]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data: categoriesData, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      const categoriesWithProducts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .order('name');

          const productsWithPrice = await Promise.all(
            (productsData || []).map(async (product) => {
              const { data: priceData } = await supabase
                .from('product_prices')
                .select('price')
                .eq('product_id', product.id)
                .order('effective_date', { ascending: false })
                .limit(1)
                .single();

              return {
                ...product,
                currentPrice: priceData?.price || 0,
              };
            })
          );

          return {
            ...category,
            products: productsWithPrice,
          };
        })
      );

      setCategories(categoriesWithProducts as any);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchServiceTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setServiceTypes((data as ServiceType[]) || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  }, [expandedCategories]);

  // Category handlers
  const handleOpenCategoryModal = (category: Category | null = null) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category?.name || '',
      description: category?.description || '',
      image_url: category?.image_url || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      setSaving(true);
      if (editingCategory) {
        await supabase
          .from('categories')
          .update(categoryForm)
          .eq('id', editingCategory.id);
      } else {
        await supabase.from('categories').insert(categoryForm);
      }
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('ลบหมวดหมู่นี้? สินค้าในหมวดหมู่จะถูกลบด้วย')) return;
    try {
      await supabase.from('categories').delete().eq('id', id);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Product handlers
  const handleOpenProductModal = (categoryId: string, product: Product | null = null) => {
    setSelectedCategoryId(categoryId);
    setEditingProduct(product);
    setProductForm({
      name: product?.name || '',
      description: product?.description || '',
      price: product?.currentPrice?.toString() || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    try {
      setSaving(true);
      if (editingProduct) {
        await supabase
          .from('products')
          .update({
            name: productForm.name,
            description: productForm.description || null,
          })
          .eq('id', editingProduct.id);

        if (productForm.price && parseFloat(productForm.price) !== editingProduct.currentPrice) {
          await supabase.from('product_prices').insert({
            product_id: editingProduct.id,
            price: parseFloat(productForm.price),
            effective_date: new Date().toISOString(),
          });
        }
      } else {
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            name: productForm.name,
            description: productForm.description || null,
            category_id: selectedCategoryId,
          })
          .select()
          .single();

        if (productForm.price && newProduct) {
          await supabase.from('product_prices').insert({
            product_id: newProduct.id,
            price: parseFloat(productForm.price),
            effective_date: new Date().toISOString(),
          });

          await supabase.from('stock').insert({
            product_id: newProduct.id,
            quantity: 0,
          });
        }
      }
      setIsProductModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('ลบสินค้านี้?')) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Service Type handlers
  const handleOpenServiceTypeModal = (serviceType: ServiceType | null = null) => {
    setEditingServiceType(serviceType);
    setServiceTypeForm({
      name: serviceType?.name || '',
      description: serviceType?.description || '',
      default_price: serviceType?.default_price?.toString() || '',
    });
    setIsServiceTypeModalOpen(true);
  };

  const handleSaveServiceType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTypeForm.name.trim()) return;

    try {
      setSaving(true);
      const data = {
        name: serviceTypeForm.name,
        description: serviceTypeForm.description || null,
        default_price: serviceTypeForm.default_price ? parseFloat(serviceTypeForm.default_price) : null,
      };

      if (editingServiceType) {
        await supabase.from('service_types').update(data).eq('id', editingServiceType.id);
      } else {
        await supabase.from('service_types').insert(data);
      }
      setIsServiceTypeModalOpen(false);
      fetchServiceTypes();
    } catch (error) {
      console.error('Error saving service type:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteServiceType = async (id: string) => {
    if (!confirm('ลบประเภทการบริการนี้?')) return;
    try {
      await supabase.from('service_types').delete().eq('id', id);
      fetchServiceTypes();
    } catch (error) {
      console.error('Error deleting service type:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <SettingsIcon size={32} className="text-gray-900 dark:text-white" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ตั้งค่า</h1>
          </div>
          <p className="text-gray-600 dark:text-zinc-400">จัดการสินค้าและประเภทการบริการ</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 sm:space-x-2 mb-6 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              activeTab === 'products'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-md'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Package size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">สินค้า/อะไหล่</span>
            <span className="xs:hidden">สินค้า</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              activeTab === 'services'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-md'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Wrench size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">ประเภทการบริการ</span>
            <span className="xs:hidden">บริการ</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              activeTab === 'security'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-md'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Shield size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">ความปลอดภัย</span>
            <span className="xs:hidden">PIN</span>
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => handleOpenCategoryModal()}
                className="flex items-center space-x-1.5 sm:space-x-2 bg-gray-900 dark:bg-white text-white dark:text-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all text-sm sm:text-base shadow-md"
              >
                <Plus size={18} className="sm:w-5 sm:h-5" />
                <span>เพิ่มหมวดหมู่</span>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {categories.map((category: any) => (
                  <div key={category.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-3 sm:p-4">
                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{category.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400">{category.products?.length || 0} สินค้า</p>
                          </div>
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="p-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-lg transition-all"
                          >
                            {expandedCategories.has(category.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleOpenProductModal(category.id)}
                            className="flex items-center justify-center space-x-1 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-xs sm:text-sm"
                          >
                            <Plus size={16} />
                            <span>สินค้า</span>
                          </button>
                          <button
                            onClick={() => handleOpenCategoryModal(category)}
                            className="flex items-center justify-center space-x-1 p-2 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-600 text-gray-900 dark:text-white rounded-lg transition-all text-xs sm:text-sm"
                          >
                            <Edit size={16} />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="flex items-center justify-center space-x-1 p-2 bg-red-600 dark:bg-red-900 hover:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition-all text-xs sm:text-sm"
                          >
                            <Trash2 size={16} />
                            <span>ลบ</span>
                          </button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-zinc-400">{category.products?.length || 0} สินค้า</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="flex items-center space-x-1 px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-lg transition-all"
                          >
                            <span>{expandedCategories.has(category.id) ? 'ซ่อน' : 'แสดง'}สินค้า</span>
                            {expandedCategories.has(category.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <button
                            onClick={() => handleOpenProductModal(category.id)}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                          >
                            <Plus size={20} />
                          </button>
                          <button
                            onClick={() => handleOpenCategoryModal(category)}
                            className="p-2 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-600 text-gray-900 dark:text-white rounded-lg transition-all"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-2 bg-red-600 dark:bg-red-900 hover:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      {expandedCategories.has(category.id) && category.products && category.products.length > 0 && (
                        <div className="mt-3 sm:mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          {category.products.map((product: Product) => (
                            <div key={product.id} className="flex items-center justify-between bg-gray-100 dark:bg-zinc-800 p-2.5 sm:p-3 rounded-lg">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium truncate">{product.name}</p>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400">฿{product.currentPrice?.toFixed(2)}</p>
                              </div>
                              <div className="flex space-x-1.5 sm:space-x-2">
                                <button
                                  onClick={() => handleOpenProductModal(category.id, product)}
                                  className="p-1.5 sm:p-2 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-600 text-gray-900 dark:text-white rounded transition-all"
                                >
                                  <Edit size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-1.5 sm:p-2 bg-red-600 dark:bg-red-900 hover:bg-red-700 dark:hover:bg-red-800 text-white rounded transition-all"
                                >
                                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Service Types Tab */}
        {activeTab === 'services' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => handleOpenServiceTypeModal()}
                className="flex items-center space-x-1.5 sm:space-x-2 bg-gray-900 dark:bg-white text-white dark:text-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all text-sm sm:text-base shadow-md"
              >
                <Plus size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">เพิ่มประเภทการบริการ</span>
                <span className="xs:hidden">เพิ่มบริการ</span>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {serviceTypes.map((serviceType) => (
                  <div key={serviceType.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{serviceType.name}</h3>
                        {serviceType.description && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1 line-clamp-2">{serviceType.description}</p>
                        )}
                        {serviceType.default_price && (
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-2">
                            ราคาเริ่มต้น: ฿{serviceType.default_price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-1.5 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => handleOpenServiceTypeModal(serviceType)}
                          className="p-2 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-600 text-gray-900 dark:text-white rounded-lg transition-all"
                        >
                          <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => handleDeleteServiceType(serviceType.id)}
                          className="p-2 bg-red-600 dark:bg-red-900 hover:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition-all"
                        >
                          <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <PinSettings />
          </div>
        )}
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
              </h2>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">
                  ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">คำอธิบาย</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-6 py-3 rounded-xl font-semibold"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}
              </h2>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">รายละเอียด</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">
                  ราคา (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-6 py-3 rounded-xl font-semibold"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Type Modal */}
      {isServiceTypeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingServiceType ? 'แก้ไขประเภทการบริการ' : 'เพิ่มประเภทการบริการ'}
              </h2>
            </div>
            <form onSubmit={handleSaveServiceType} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">
                  ชื่อประเภทการบริการ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={serviceTypeForm.name}
                  onChange={(e) => setServiceTypeForm({ ...serviceTypeForm, name: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">คำอธิบาย</label>
                <textarea
                  value={serviceTypeForm.description}
                  onChange={(e) => setServiceTypeForm({ ...serviceTypeForm, description: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">ราคาเริ่มต้น (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceTypeForm.default_price}
                  onChange={(e) => setServiceTypeForm({ ...serviceTypeForm, default_price: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsServiceTypeModalOpen(false)}
                  className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-6 py-3 rounded-xl font-semibold"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
