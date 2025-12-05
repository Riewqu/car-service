-- ============================================================================
-- Migration: Audit Logging and Soft Delete for Service Records
-- Description: Add audit trail, soft delete, and history tracking
-- Date: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Audit Columns to service_records
-- ============================================================================

-- Add deleted_at for soft delete
ALTER TABLE service_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_by to track who deleted
ALTER TABLE service_records
ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

-- Add updated_by to track who made changes
ALTER TABLE service_records
ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT NULL;

-- Add comment/note about the change
ALTER TABLE service_records
ADD COLUMN IF NOT EXISTS change_reason TEXT DEFAULT NULL;

-- ============================================================================
-- STEP 2: Create service_record_history table for Audit Trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_record_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to original record
  service_record_id UUID NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,

  -- Action type
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),

  -- Complete snapshot of data before change (JSONB for flexibility)
  old_data JSONB,
  new_data JSONB,

  -- Changed fields only (for quick filtering)
  changed_fields TEXT[],

  -- Who made the change
  changed_by TEXT NOT NULL,

  -- When the change was made
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional reason for the change
  change_reason TEXT,

  -- IP address or additional metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Indexes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_history_service_record_id ON service_record_history(service_record_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON service_record_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_action ON service_record_history(action);
CREATE INDEX IF NOT EXISTS idx_history_changed_by ON service_record_history(changed_by);

-- ============================================================================
-- STEP 3: Create Trigger Function to Auto-Log Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_service_record_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[];
  v_old_data JSONB;
  v_new_data JSONB;
  v_action TEXT;
  v_changed_by TEXT;
BEGIN
  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    v_old_data := NULL;
    v_new_data := row_to_json(NEW)::JSONB;
    v_changed_by := COALESCE(NEW.updated_by, 'system');
    v_changed_fields := ARRAY['*']; -- All fields for INSERT

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Check if it's a soft delete
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
      v_action := 'DELETE';
      v_changed_by := COALESCE(NEW.deleted_by, NEW.updated_by, 'system');
    -- Check if it's a restore
    ELSIF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
      v_action := 'RESTORE';
      v_changed_by := COALESCE(NEW.updated_by, 'system');
    ELSE
      v_action := 'UPDATE';
      v_changed_by := COALESCE(NEW.updated_by, 'system');
    END IF;

    v_old_data := row_to_json(OLD)::JSONB;
    v_new_data := row_to_json(NEW)::JSONB;

    -- Detect which fields changed
    v_changed_fields := ARRAY(
      SELECT key
      FROM jsonb_each(v_old_data)
      WHERE v_old_data->key IS DISTINCT FROM v_new_data->key
    );

  ELSIF (TG_OP = 'DELETE') THEN
    -- Hard delete (should rarely happen)
    v_action := 'DELETE';
    v_old_data := row_to_json(OLD)::JSONB;
    v_new_data := NULL;
    v_changed_by := COALESCE(OLD.deleted_by, 'system');
    v_changed_fields := ARRAY['*']; -- All fields for DELETE
  END IF;

  -- Insert into history table
  INSERT INTO service_record_history (
    service_record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    changed_by,
    change_reason,
    changed_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_changed_by,
    COALESCE(NEW.change_reason, OLD.change_reason),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Attach Trigger to service_records Table
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_log_service_record_changes ON service_records;

CREATE TRIGGER trigger_log_service_record_changes
AFTER INSERT OR UPDATE OR DELETE ON service_records
FOR EACH ROW
EXECUTE FUNCTION log_service_record_changes();

-- ============================================================================
-- STEP 5: Create Helper Functions for Common Operations
-- ============================================================================

-- Function: Soft Delete a Service Record
CREATE OR REPLACE FUNCTION soft_delete_service_record(
  p_record_id UUID,
  p_deleted_by TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE service_records
  SET
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    change_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_record_id
    AND deleted_at IS NULL; -- Only delete if not already deleted

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Restore a Soft-Deleted Service Record
CREATE OR REPLACE FUNCTION restore_service_record(
  p_record_id UUID,
  p_restored_by TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE service_records
  SET
    deleted_at = NULL,
    deleted_by = NULL,
    updated_by = p_restored_by,
    change_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_record_id
    AND deleted_at IS NOT NULL; -- Only restore if deleted

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get Audit History for a Service Record
CREATE OR REPLACE FUNCTION get_service_record_history(p_record_id UUID)
RETURNS TABLE (
  id UUID,
  action TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ,
  change_reason TEXT,
  changed_fields TEXT[],
  old_data JSONB,
  new_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.action,
    h.changed_by,
    h.changed_at,
    h.change_reason,
    h.changed_fields,
    h.old_data,
    h.new_data
  FROM service_record_history h
  WHERE h.service_record_id = p_record_id
  ORDER BY h.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create View for Active (Non-Deleted) Service Records
-- ============================================================================

CREATE OR REPLACE VIEW service_records_active AS
SELECT *
FROM service_records
WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 7: Update RLS Policies (if needed)
-- ============================================================================

-- Allow public to read history (you can restrict this if needed)
ALTER TABLE service_record_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to history" ON service_record_history;
CREATE POLICY "Allow public read access to history"
ON service_record_history FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to history" ON service_record_history;
CREATE POLICY "Allow authenticated insert to history"
ON service_record_history FOR INSERT
TO public
WITH CHECK (true);

-- ============================================================================
-- STEP 8: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE service_record_history IS 'Audit trail table that logs all changes to service records';
COMMENT ON COLUMN service_record_history.action IS 'Type of action: INSERT, UPDATE, DELETE, or RESTORE';
COMMENT ON COLUMN service_record_history.old_data IS 'Complete snapshot of record before change';
COMMENT ON COLUMN service_record_history.new_data IS 'Complete snapshot of record after change';
COMMENT ON COLUMN service_record_history.changed_fields IS 'Array of field names that were changed';
COMMENT ON FUNCTION soft_delete_service_record IS 'Soft delete a service record by setting deleted_at timestamp';
COMMENT ON FUNCTION restore_service_record IS 'Restore a previously deleted service record';
COMMENT ON FUNCTION get_service_record_history IS 'Get complete audit history for a service record';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================

-- Check if columns were added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_records' AND column_name IN ('deleted_at', 'deleted_by', 'updated_by', 'change_reason');

-- Check if history table was created
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'service_record_history';

-- Check if triggers exist
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trigger_log_service_record_changes';

-- Test soft delete
-- SELECT soft_delete_service_record('some-uuid-here', 'admin', 'Testing soft delete');

-- Test restore
-- SELECT restore_service_record('some-uuid-here', 'admin', 'Testing restore');

-- View history
-- SELECT * FROM get_service_record_history('some-uuid-here');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
