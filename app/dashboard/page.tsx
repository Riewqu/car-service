'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, TrendingUp, Car, Package, Wrench, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

type DashboardStats = {
  totalRevenue: number;
  totalServices: number;
  totalVehicles: number;
  totalProductsUsed: number;
};

type ServiceSummary = {
  service_name: string;
  count: number;
};

type ProductSummary = {
  product_name: string;
  quantity: number;
  total_price: number;
};

type VehicleRecord = {
  license_plate: string;
  service_date: string;
  total_amount: number;
  services_count: number;
};

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalServices: 0,
    totalVehicles: 0,
    totalProductsUsed: 0,
  });
  const [serviceSummary, setServiceSummary] = useState<ServiceSummary[]>([]);
  const [productSummary, setProductSummary] = useState<ProductSummary[]>([]);
  const [vehicleRecords, setVehicleRecords] = useState<VehicleRecord[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      // Get service records for the selected date
      const { data: records, error: recordsError } = await supabase
        .from('service_records')
        .select('*')
        .gte('service_date', startOfDay)
        .lte('service_date', endOfDay)
        .is('deleted_at', null);

      if (recordsError) throw recordsError;

      if (!records || records.length === 0) {
        // No records for this date
        setStats({
          totalRevenue: 0,
          totalServices: 0,
          totalVehicles: 0,
          totalProductsUsed: 0,
        });
        setServiceSummary([]);
        setProductSummary([]);
        setVehicleRecords([]);
        setLoading(false);
        return;
      }

      const recordIds = records.map((r) => r.id);

      // Get products used
      const { data: productsData, error: productsError } = await supabase
        .from('service_record_products')
        .select('product_id, quantity, price_at_time, products(name)')
        .in('service_record_id', recordIds);

      if (productsError) throw productsError;

      // Get services performed
      const { data: servicesData, error: servicesError } = await supabase
        .from('service_record_services')
        .select('service_type_id, service_types(name)')
        .in('service_record_id', recordIds);

      if (servicesError) throw servicesError;

      // Calculate stats
      const totalRevenue = (productsData || []).reduce(
        (sum, p) => sum + p.price_at_time * p.quantity,
        0
      );

      const totalServices = (servicesData || []).length;
      const totalVehicles = new Set(records.map((r) => r.license_plate)).size;
      const totalProductsUsed = (productsData || []).reduce((sum, p) => sum + p.quantity, 0);

      setStats({
        totalRevenue,
        totalServices,
        totalVehicles,
        totalProductsUsed,
      });

      // Service summary
      const serviceMap: { [key: string]: number } = {};
      (servicesData || []).forEach((s: any) => {
        const name = s.service_types?.name || 'ไม่ระบุ';
        serviceMap[name] = (serviceMap[name] || 0) + 1;
      });
      const serviceSummaryArray = Object.entries(serviceMap).map(([name, count]) => ({
        service_name: name,
        count,
      }));
      setServiceSummary(serviceSummaryArray);

      // Product summary
      const productMap: { [key: string]: { quantity: number; total_price: number } } = {};
      (productsData || []).forEach((p: any) => {
        const name = p.products?.name || 'ไม่ระบุ';
        if (!productMap[name]) {
          productMap[name] = { quantity: 0, total_price: 0 };
        }
        productMap[name].quantity += p.quantity;
        productMap[name].total_price += p.price_at_time * p.quantity;
      });
      const productSummaryArray = Object.entries(productMap).map(([name, data]) => ({
        product_name: name,
        quantity: data.quantity,
        total_price: data.total_price,
      }));
      setProductSummary(productSummaryArray);

      // Vehicle records with details
      const vehicleRecordsArray = await Promise.all(
        records.map(async (record) => {
          // Get products for this record
          const { data: recordProducts } = await supabase
            .from('service_record_products')
            .select('quantity, price_at_time')
            .eq('service_record_id', record.id);

          // Get services count for this record
          const { data: recordServices } = await supabase
            .from('service_record_services')
            .select('id')
            .eq('service_record_id', record.id);

          const total_amount = (recordProducts || []).reduce(
            (sum, p) => sum + p.price_at_time * p.quantity,
            0
          );

          return {
            license_plate: record.license_plate,
            service_date: record.service_date,
            total_amount,
            services_count: (recordServices || []).length,
          };
        })
      );

      setVehicleRecords(vehicleRecordsArray);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-black dark:via-zinc-900 dark:to-black pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400">
                สรุปยอดและสถิติการบริการ
              </p>
            </div>

            {/* Date Picker */}
            <div className="flex items-center space-x-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 shadow-sm">
              <Calendar size={20} className="text-gray-600 dark:text-zinc-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-gray-900 dark:text-white font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                    <DollarSign size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-white/80 text-xs sm:text-sm flex items-center">
                    <TrendingUp size={14} className="mr-1" />
                  </span>
                </div>
                <div className="text-white">
                  <p className="text-xs sm:text-sm font-medium mb-1 opacity-90">ยอดรวม</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                    {formatCurrency(stats.totalRevenue).replace('THB', '฿')}
                  </p>
                </div>
              </div>

              {/* Total Vehicles */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                    <Car size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="text-white">
                  <p className="text-xs sm:text-sm font-medium mb-1 opacity-90">รถที่บริการ</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.totalVehicles}</p>
                  <p className="text-xs opacity-75 mt-1">คัน</p>
                </div>
              </div>

              {/* Total Services */}
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                    <Wrench size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="text-white">
                  <p className="text-xs sm:text-sm font-medium mb-1 opacity-90">บริการทั้งหมด</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.totalServices}</p>
                  <p className="text-xs opacity-75 mt-1">รายการ</p>
                </div>
              </div>

              {/* Total Products Used */}
              <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                    <Package size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="text-white">
                  <p className="text-xs sm:text-sm font-medium mb-1 opacity-90">อะไหล่ที่ใช้</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.totalProductsUsed}</p>
                  <p className="text-xs opacity-75 mt-1">ชิ้น</p>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Service Summary */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-zinc-800">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Wrench size={20} className="mr-2" />
                    บริการที่ทำ
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  {serviceSummary.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-zinc-500 py-8">
                      ไม่มีข้อมูลบริการในวันนี้
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {serviceSummary.map((service, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                            <span className="text-sm sm:text-base text-gray-900 dark:text-white font-medium truncate">
                              {service.service_name}
                            </span>
                          </div>
                          <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 ml-3">
                            {service.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Summary */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-zinc-800">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Package size={20} className="mr-2" />
                    อะไหล่ที่ใช้
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  {productSummary.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-zinc-500 py-8">
                      ไม่มีข้อมูลอะไหล่ในวันนี้
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {productSummary.map((product, index) => (
                        <div
                          key={index}
                          className="p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm sm:text-base text-gray-900 dark:text-white font-medium flex-1">
                              {product.product_name}
                            </span>
                            <span className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400 ml-3">
                              {product.quantity} ชิ้น
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400">
                            มูลค่า: {formatCurrency(product.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Records Table */}
            <div className="mt-4 sm:mt-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-zinc-800">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Car size={20} className="mr-2" />
                  รถที่มาบริการ ({vehicleRecords.length} คัน)
                </h2>
              </div>
              <div className="p-4 sm:p-6">
                {vehicleRecords.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-zinc-500 py-8">
                    ไม่มีรถมาบริการในวันนี้
                  </p>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="block sm:hidden space-y-3">
                      {vehicleRecords.map((vehicle, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              {vehicle.license_plate}
                            </span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(vehicle.total_amount)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-zinc-400">
                            บริการ: {vehicle.services_count} รายการ
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-zinc-800">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-zinc-400">
                              ทะเบียนรถ
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-zinc-400">
                              จำนวนบริการ
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-zinc-400">
                              ยอดรวม
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleRecords.map((vehicle, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                                {vehicle.license_plate}
                              </td>
                              <td className="py-4 px-4 text-gray-600 dark:text-zinc-400">
                                {vehicle.services_count} รายการ
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(vehicle.total_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
