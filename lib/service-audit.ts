/**
 * Service Audit Helper Functions
 * Handles soft delete, restore, and audit trail operations for service records
 */

import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE';

export type ServiceRecordHistory = {
  id: string;
  service_record_id?: string;
  action: AuditAction | string;
  old_data: any;
  new_data: any;
  changed_fields: string[];
  changed_by: string;
  changed_at: string;
  change_reason: string | null;
  metadata?: any;
};

export type ServiceRecordWithAudit = {
  id: string;
  license_plate: string;
  service_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  updated_by: string | null;
  change_reason: string | null;
};

// ============================================================================
// Soft Delete Operations
// ============================================================================

/**
 * Soft delete a service record
 * @param recordId - The UUID of the service record
 * @param deletedBy - Username or identifier of who deleted it
 * @param reason - Optional reason for deletion
 * @returns Success status and message
 */
export async function softDeleteServiceRecord(
  recordId: string,
  deletedBy: string = 'user',
  reason?: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    // Call the database function for soft delete
    const { data, error } = await supabase.rpc('soft_delete_service_record', {
      p_record_id: recordId,
      p_deleted_by: deletedBy,
      p_reason: reason || undefined,
    });

    if (error) {
      console.error('Error soft deleting service record:', error);
      return {
        success: false,
        message: 'ไม่สามารถลบรายการได้',
        error,
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'ไม่พบรายการที่ต้องการลบ หรือรายการถูกลบไปแล้ว',
      };
    }

    return {
      success: true,
      message: 'ลบรายการสำเร็จ',
    };
  } catch (error) {
    console.error('Exception in softDeleteServiceRecord:', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error,
    };
  }
}

/**
 * Restore a soft-deleted service record
 * @param recordId - The UUID of the service record
 * @param restoredBy - Username or identifier of who restored it
 * @param reason - Optional reason for restoration
 * @returns Success status and message
 */
export async function restoreServiceRecord(
  recordId: string,
  restoredBy: string = 'user',
  reason?: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    const { data, error } = await supabase.rpc('restore_service_record', {
      p_record_id: recordId,
      p_restored_by: restoredBy,
      p_reason: reason || undefined,
    });

    if (error) {
      console.error('Error restoring service record:', error);
      return {
        success: false,
        message: 'ไม่สามารถกู้คืนรายการได้',
        error,
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'ไม่พบรายการที่ถูกลบ',
      };
    }

    return {
      success: true,
      message: 'กู้คืนรายการสำเร็จ',
    };
  } catch (error) {
    console.error('Exception in restoreServiceRecord:', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error,
    };
  }
}

// ============================================================================
// Audit Trail Operations
// ============================================================================

/**
 * Get audit history for a service record
 * @param recordId - The UUID of the service record
 * @returns Array of history entries
 */
export async function getServiceRecordHistory(
  recordId: string
): Promise<{ success: boolean; data: ServiceRecordHistory[]; error?: any }> {
  try {
    const { data, error } = await supabase.rpc('get_service_record_history', {
      p_record_id: recordId,
    });

    if (error) {
      console.error('Error fetching service record history:', error);
      return {
        success: false,
        data: [],
        error,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('Exception in getServiceRecordHistory:', error);
    return {
      success: false,
      data: [],
      error,
    };
  }
}

/**
 * Get deleted service records (for admin view)
 * @param limit - Max number of records to return
 * @returns Array of deleted service records
 */
export async function getDeletedServiceRecords(
  limit: number = 50
): Promise<{ success: boolean; data: any[]; error?: any }> {
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
        )
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching deleted service records:', error);
      return {
        success: false,
        data: [],
        error,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('Exception in getDeletedServiceRecords:', error);
    return {
      success: false,
      data: [],
      error,
    };
  }
}

// ============================================================================
// Update Operations with Audit Trail
// ============================================================================

/**
 * Update a service record with audit trail
 * @param recordId - The UUID of the service record
 * @param updates - Fields to update
 * @param updatedBy - Username or identifier of who updated it
 * @param reason - Optional reason for the update
 * @returns Success status and message
 */
export async function updateServiceRecordWithAudit(
  recordId: string,
  updates: {
    license_plate?: string;
    service_date?: string;
    notes?: string | null;
  },
  updatedBy: string = 'user',
  reason?: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    const updateData: any = {
      ...updates,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.change_reason = reason;
    }

    const { data, error } = await supabase
      .from('service_records')
      .update(updateData)
      .eq('id', recordId)
      .is('deleted_at', null) // Only update non-deleted records
      .select()
      .single();

    if (error) {
      console.error('Error updating service record:', error);
      return {
        success: false,
        message: 'ไม่สามารถอัพเดทรายการได้',
        error,
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'ไม่พบรายการที่ต้องการอัพเดท',
      };
    }

    return {
      success: true,
      message: 'อัพเดทรายการสำเร็จ',
    };
  } catch (error) {
    console.error('Exception in updateServiceRecordWithAudit:', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error,
    };
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get active (non-deleted) service records with filters
 * @param filters - Optional filters
 * @returns Array of active service records
 */
export async function getActiveServiceRecords(filters?: {
  licensePlate?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; data: any[]; error?: any }> {
  try {
    let query = supabase
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
      .is('deleted_at', null)
      .order('service_date', { ascending: false });

    if (filters?.licensePlate) {
      query = query.ilike('license_plate', `%${filters.licensePlate}%`);
    }

    if (filters?.startDate) {
      query = query.gte('service_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('service_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active service records:', error);
      return {
        success: false,
        data: [],
        error,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('Exception in getActiveServiceRecords:', error);
    return {
      success: false,
      data: [],
      error,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format action type for display in Thai
 */
export function formatActionType(action: AuditAction): string {
  const actionMap: Record<AuditAction, string> = {
    INSERT: 'สร้างรายการ',
    UPDATE: 'แก้ไข',
    DELETE: 'ลบ',
    RESTORE: 'กู้คืน',
  };
  return actionMap[action] || action;
}

/**
 * Format changed fields for display
 */
export function formatChangedFields(fields: string[]): string {
  if (!fields || fields.length === 0) return '-';
  if (fields.includes('*')) return 'ทุกฟิลด์';

  const fieldMap: Record<string, string> = {
    license_plate: 'ทะเบียนรถ',
    service_date: 'วันที่บริการ',
    notes: 'หมายเหตุ',
    deleted_at: 'สถานะการลบ',
  };

  return fields.map(f => fieldMap[f] || f).join(', ');
}

/**
 * Calculate time ago in Thai
 */
export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now.getTime() - past.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'เมื่อสักครู่';
  if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
  if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
  if (diffInDays === 0) return 'วันนี้';
  if (diffInDays === 1) return 'เมื่อวาน';
  if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} สัปดาห์ที่แล้ว`;
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} เดือนที่แล้ว`;
  }
  const years = Math.floor(diffInDays / 365);
  return `${years} ปีที่แล้ว`;
}
