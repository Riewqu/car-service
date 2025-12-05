'use client';

import { useState, useEffect } from 'react';
import { X, Car, Calendar, FileText, Save } from 'lucide-react';
import { updateServiceRecordWithAudit } from '@/lib/service-audit';

type ServiceRecordData = {
  id: string;
  license_plate: string;
  service_date: string;
  notes: string | null;
};

type EditServiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  serviceRecord: ServiceRecordData | null;
  onSuccess: () => void;
};

export default function EditServiceModal({
  isOpen,
  onClose,
  serviceRecord,
  onSuccess,
}: EditServiceModalProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && serviceRecord) {
      setLicensePlate(serviceRecord.license_plate);
      setServiceDate(serviceRecord.service_date.split('T')[0]);
      setNotes(serviceRecord.notes || '');
      setChangeReason('');
    }
  }, [isOpen, serviceRecord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceRecord) return;

    if (!licensePlate.trim()) {
      alert('กรุณากรอกทะเบียนรถ');
      return;
    }

    if (!changeReason.trim()) {
      alert('กรุณาระบุเหตุผลของการแก้ไข');
      return;
    }

    try {
      setLoading(true);

      const result = await updateServiceRecordWithAudit(
        serviceRecord.id,
        {
          license_plate: licensePlate.trim(),
          service_date: new Date(serviceDate).toISOString(),
          notes: notes.trim() || null,
        },
        'user', // You can pass actual username from auth context
        changeReason.trim()
      );

      if (result.success) {
        alert('แก้ไขข้อมูลสำเร็จ');
        onSuccess();
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error updating service record:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  if (!isOpen || !serviceRecord) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-black md:bg-black/50 md:backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 md:rounded-2xl shadow-2xl w-full max-w-2xl h-full md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-900 dark:bg-white p-2 rounded-lg">
              <Save size={24} className="text-white dark:text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                แก้ไขข้อมูลการบริการ
              </h2>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                แก้ไขข้อมูลพื้นฐานของรายการบริการ
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* License Plate */}
          <div>
            <label className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300 mb-2 font-medium">
              <Car size={18} />
              <span>ทะเบียนรถ <span className="text-red-500">*</span></span>
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

          {/* Service Date */}
          <div>
            <label className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300 mb-2 font-medium">
              <Calendar size={18} />
              <span>วันที่บริการ <span className="text-red-500">*</span></span>
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300 mb-2 font-medium">
              <FileText size={18} />
              <span>หมายเหตุ</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-300 dark:focus:border-zinc-600 resize-none"
              placeholder="บันทึกเพิ่มเติม..."
              rows={4}
            />
          </div>

          {/* Change Reason - REQUIRED */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <label className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-400 mb-2 font-semibold">
              <FileText size={18} />
              <span>เหตุผลของการแก้ไข <span className="text-red-500">*</span></span>
            </label>
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full bg-white dark:bg-zinc-800 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-yellow-300 dark:focus:border-yellow-600 resize-none"
              placeholder="เช่น: แก้ไขทะเบียนรถที่พิมพ์ผิด, เปลี่ยนวันที่ตามความเป็นจริง, เพิ่มหมายเหตุเพิ่มเติม..."
              rows={3}
              required
            />
            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2">
              📝 เหตุผลนี้จะถูกบันทึกในประวัติการเปลี่ยนแปลงเพื่อการตรวจสอบ
            </p>
          </div>

          {/* Warning Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              <span className="font-semibold">ℹ️ หมายเหตุ:</span> การแก้ไขนี้จะถูกบันทึกในระบบ audit log
              และสามารถตรวจสอบประวัติการเปลี่ยนแปลงได้ทุกเมื่อ
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-800 p-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2.5 bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-black"></div>
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>บันทึกการแก้ไข</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
