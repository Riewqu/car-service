'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Car, Calendar, FileText, Package, Wrench, Plus, X, Image as ImageIcon, Upload, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SelectModal from '@/components/SelectModal';
import CameraCapture from '@/components/CameraCapture';

type ServiceType = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  currentPrice: number;
  stock: number;
};

type SelectedProduct = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  stock: number;
};

type ServiceImage = {
  file: File;
  preview: string;
  date: string;
};

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [licensePlate, setLicensePlate] = useState('');
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [serviceImages, setServiceImages] = useState<ServiceImage[]>([]);

  // Data
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Service Type Modal
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);

  // Camera Modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    fetchServiceTypes();
    fetchProducts();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      const productsWithDetails = await Promise.all(
        (productsData || []).map(async (product) => {
          // Get current price
          const { data: priceData } = await supabase
            .from('product_prices')
            .select('price')
            .eq('product_id', product.id)
            .order('effective_date', { ascending: false })
            .limit(1)
            .single();

          // Get stock
          const { data: stockData } = await supabase
            .from('stock')
            .select('quantity')
            .eq('product_id', product.id)
            .single();

          return {
            id: product.id,
            name: product.name,
            currentPrice: priceData?.price || 0,
            stock: stockData?.quantity || 0,
          };
        })
      );

      setProducts(productsWithDetails);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleServiceTypeToggle = (typeId: string) => {
    setSelectedServiceTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existing = selectedProducts.find((p) => p.product_id === productId);
    if (existing) {
      // Increase quantity if already added
      if (existing.quantity < product.stock) {
        setSelectedProducts(
          selectedProducts.map((p) =>
            p.product_id === productId
              ? { ...p, quantity: p.quantity + 1 }
              : p
          )
        );
      } else {
        alert('สต็อคไม่เพียงพอ');
      }
    } else {
      // Add new product
      if (product.stock > 0) {
        setSelectedProducts([
          ...selectedProducts,
          {
            product_id: productId,
            name: product.name,
            quantity: 1,
            price: product.currentPrice,
            stock: product.stock,
          },
        ]);
      } else {
        alert('สินค้าหมดสต็อค');
      }
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== productId));
  };

  const handleProductQuantityChange = (productId: string, quantity: number) => {
    const product = selectedProducts.find((p) => p.product_id === productId);
    if (!product) return;

    if (quantity <= 0) {
      handleRemoveProduct(productId);
      return;
    }

    if (quantity > product.stock) {
      alert('จำนวนเกินสต็อคที่มี');
      return;
    }

    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product_id === productId ? { ...p, quantity } : p
      )
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ServiceImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
          date: new Date().toISOString(),
        });
      }
    }

    setServiceImages([...serviceImages, ...newImages]);
  };

  const handleCameraCapture = (file: File) => {
    const newImage: ServiceImage = {
      file,
      preview: URL.createObjectURL(file),
      date: new Date().toISOString(),
    };
    setServiceImages([...serviceImages, newImage]);
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(serviceImages[index].preview);
    setServiceImages(serviceImages.filter((_, i) => i !== index));
  };

  const handleImageDateChange = (index: number, date: string) => {
    setServiceImages(
      serviceImages.map((img, i) =>
        i === index ? { ...img, date: new Date(date).toISOString() } : img
      )
    );
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licensePlate.trim()) {
      alert('กรุณากรอกทะเบียนรถ');
      return;
    }

    if (selectedServiceTypes.length === 0 && selectedProducts.length === 0) {
      alert('กรุณาเลือกบริการหรืออะไหล่อย่างน้อย 1 รายการ');
      return;
    }

    try {
      setLoading(true);

      // Create service record
      const { data: serviceRecord, error: recordError } = await supabase
        .from('service_records')
        .insert({
          license_plate: licensePlate.trim(),
          service_date: new Date(serviceDate).toISOString(),
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Insert service types
      if (selectedServiceTypes.length > 0) {
        const { error: servicesError } = await supabase
          .from('service_record_services')
          .insert(
            selectedServiceTypes.map((typeId) => ({
              service_record_id: serviceRecord.id,
              service_type_id: typeId,
            }))
          );

        if (servicesError) throw servicesError;
      }

      // Insert products (stock will be automatically decreased by trigger)
      if (selectedProducts.length > 0) {
        const { error: productsError } = await supabase
          .from('service_record_products')
          .insert(
            selectedProducts.map((product) => ({
              service_record_id: serviceRecord.id,
              product_id: product.product_id,
              quantity: product.quantity,
              price_at_time: product.price,
            }))
          );

        if (productsError) throw productsError;
      }

      // Upload images
      if (serviceImages.length > 0) {
        for (const image of serviceImages) {
          // Upload to storage
          const fileName = `${serviceRecord.id}/${Date.now()}_${image.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('service-images')
            .upload(fileName, image.file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('service-images')
            .getPublicUrl(fileName);

          // Insert image record
          const { error: imageError } = await supabase
            .from('service_images')
            .insert({
              service_record_id: serviceRecord.id,
              image_url: publicUrl,
              image_date: image.date,
            });

          if (imageError) throw imageError;
        }
      }

      alert('บันทึกการบริการสำเร็จ!');
      router.push('/services');
    } catch (error) {
      console.error('Error creating service record:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">บันทึกการบริการ</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400">เพิ่มข้อมูลการบริการรถใหม่</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* License Plate */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-zinc-400 mb-2 sm:mb-3">
              <Car size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">ทะเบียนรถ <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-lg font-bold placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
              placeholder="เช่น กก 1234 กรุงเทพ"
              required
            />
          </div>

          {/* Images */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-zinc-400 mb-3 sm:mb-4">
              <ImageIcon size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">รูปภาพ (ไม่บังคับ)</span>
            </label>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-gray-900 dark:bg-white text-white dark:text-black px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
              >
                <Camera size={18} className="sm:w-5 sm:h-5" />
                <span>ถ่ายรูป</span>
              </button>
              <label className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all">
                <Upload size={18} className="sm:w-5 sm:h-5" />
                <span>เลือกรูป</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Image Previews */}
            {serviceImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                {serviceImages.map((image, index) => (
                  <div key={index} className="relative bg-gray-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
                    <img
                      src={image.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-40 sm:h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                    <div className="p-3">
                      <input
                        type="datetime-local"
                        value={new Date(image.date).toISOString().slice(0, 16)}
                        onChange={(e) => handleImageDateChange(index, e.target.value)}
                        className="w-full bg-gray-200 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                        {new Date(image.date).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service Date */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-zinc-400 mb-2 sm:mb-3">
              <Calendar size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">วันที่บริการ</span>
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
            />
          </div>

          {/* Service Types */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-zinc-400 mb-3 sm:mb-4">
              <Wrench size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">ประเภทการบริการ</span>
            </label>
            <button
              type="button"
              onClick={() => setIsServiceTypeModalOpen(true)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-zinc-600 transition-all"
            >
              {selectedServiceTypes.length > 0
                ? `เลือกแล้ว ${selectedServiceTypes.length} รายการ`
                : 'เลือกประเภทการบริการ...'}
            </button>
            {selectedServiceTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedServiceTypes.map((typeId) => {
                  const type = serviceTypes.find((t) => t.id === typeId);
                  return (
                    <span
                      key={typeId}
                      className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black px-3 py-1 rounded-lg text-sm font-medium"
                    >
                      {type?.name}
                      <button
                        type="button"
                        onClick={() => handleServiceTypeToggle(typeId)}
                        className="hover:opacity-70"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-zinc-400 mb-3 sm:mb-4">
              <Package size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">อะไหล่ที่ใช้</span>
            </label>

            {/* Product Selector */}
            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProduct(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
              >
                <option value="">เลือกอะไหล่...</option>
                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                    disabled={product.stock === 0}
                  >
                    {product.name} - ฿{product.currentPrice.toFixed(2)} (สต็อค: {product.stock})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                {selectedProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="bg-gray-100 dark:bg-zinc-800 rounded-xl p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mb-1 truncate">
                          {product.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400">
                          ฿{product.price.toFixed(2)} x {product.quantity} = ฿
                          {(product.price * product.quantity).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <input
                          type="number"
                          min="1"
                          max={product.stock}
                          value={product.quantity}
                          onChange={(e) =>
                            handleProductQuantityChange(
                              product.product_id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-14 sm:w-20 bg-gray-200 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base text-gray-900 dark:text-white text-center focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.product_id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 sm:p-2"
                        >
                          <X size={18} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="bg-gray-200 dark:bg-zinc-800 rounded-xl p-3 sm:p-4 flex items-center justify-between border-2 border-gray-300 dark:border-zinc-700">
                  <span className="text-base sm:text-lg text-gray-900 dark:text-white font-semibold">รวมทั้งหมด</span>
                  <span className="text-xl sm:text-2xl text-gray-900 dark:text-white font-bold">
                    ฿{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-zinc-400 mb-2 sm:mb-3">
              <FileText size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">หมายเหตุ (ไม่บังคับ)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
              placeholder="บันทึกเพิ่มเติม..."
              rows={4}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการบริการ'}
            </button>
          </div>
        </form>

        {/* Service Type Modal */}
        <SelectModal
          isOpen={isServiceTypeModalOpen}
          onClose={() => setIsServiceTypeModalOpen(false)}
          title="เลือกประเภทการบริการ"
          items={serviceTypes}
          selectedIds={selectedServiceTypes}
          onToggle={handleServiceTypeToggle}
          searchPlaceholder="ค้นหาประเภทการบริการ..."
        />

        {/* Camera Capture */}
        <CameraCapture
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
        />
      </div>
    </div>
  );
}
