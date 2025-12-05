'use client';

import { useState, useEffect } from 'react';
import { History, Clock, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { getServiceRecordHistory, formatActionType, formatChangedFields, getTimeAgo } from '@/lib/service-audit';
import type { ServiceRecordHistory } from '@/lib/service-audit';

type AuditTrailProps = {
  serviceRecordId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function AuditTrail({ serviceRecordId, isOpen, onClose }: AuditTrailProps) {
  const [history, setHistory] = useState<ServiceRecordHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serviceRecordId) {
      fetchHistory();
    }
  }, [isOpen, serviceRecordId]);

  const fetchHistory = async () => {
    setLoading(true);
    const result = await getServiceRecordHistory(serviceRecordId);
    if (result.success) {
      setHistory(result.data);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700';
      case 'RESTORE':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-400 border-gray-300 dark:border-zinc-700';
    }
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-900 dark:bg-white p-2 rounded-lg">
              <History size={24} className="text-white dark:text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ประวัติการเปลี่ยนแปลง
              </h2>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                บันทึกทุกการแก้ไขและการเปลี่ยนแปลง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <History size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
              <p className="text-gray-600 dark:text-zinc-400 text-lg">
                ยังไม่มีประวัติการเปลี่ยนแปลง
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => {
                const isExpanded = expandedEntry === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 transition-all"
                  >
                    {/* Entry Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Action Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border ${getActionColor(entry.action)}`}>
                            {formatActionType(entry.action as any)}
                          </span>

                          {/* Time */}
                          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-zinc-400">
                            <Clock size={14} />
                            <span>{getTimeAgo(entry.changed_at)}</span>
                          </div>
                        </div>

                        {/* Changed By */}
                        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-zinc-300">
                          <User size={14} />
                          <span className="font-medium">{entry.changed_by}</span>
                          {entry.change_reason && (
                            <>
                              <span className="text-gray-400 dark:text-zinc-600">•</span>
                              <span className="text-gray-600 dark:text-zinc-400 italic">
                                "{entry.change_reason}"
                              </span>
                            </>
                          )}
                        </div>

                        {/* Changed Fields */}
                        {entry.changed_fields && entry.changed_fields.length > 0 && (
                          <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-zinc-400">
                            <FileText size={14} className="mt-0.5 flex-shrink-0" />
                            <span>
                              แก้ไข: <span className="font-medium">{formatChangedFields(entry.changed_fields)}</span>
                            </span>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-gray-500 dark:text-zinc-500">
                          {new Date(entry.changed_at).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Expand Button */}
                      {(entry.old_data || entry.new_data) && (
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                          title={isExpanded ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด'}
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700 space-y-4">
                        {/* Old Data */}
                        {entry.old_data && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                              ข้อมูลก่อนหน้า:
                            </h4>
                            <pre className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3 text-xs text-gray-800 dark:text-zinc-200 overflow-x-auto">
                              {JSON.stringify(entry.old_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* New Data */}
                        {entry.new_data && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                              ข้อมูลใหม่:
                            </h4>
                            <pre className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3 text-xs text-gray-800 dark:text-zinc-200 overflow-x-auto">
                              {JSON.stringify(entry.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
