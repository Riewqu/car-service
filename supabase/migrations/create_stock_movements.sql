-- Create stock_movements table for tracking all stock changes
-- รายงานเคลื่อนไหวสต็อค: บันทึกทุกการเปลี่ยนแปลงของสต็อค

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'SERVICE_USE'
  quantity INTEGER NOT NULL, -- จำนวนที่เปลี่ยน (+ สำหรับเพิ่ม, - สำหรับลด)
  quantity_before INTEGER NOT NULL, -- สต็อคก่อนเปลี่ยน
  quantity_after INTEGER NOT NULL, -- สต็อคหลังเปลี่ยน
  reference_id UUID, -- service_record_id (ถ้าเป็นการใช้ในบริการ)
  notes TEXT, -- หมายเหตุ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public read access on stock_movements" ON stock_movements FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on stock_movements" ON stock_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on stock_movements" ON stock_movements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on stock_movements" ON stock_movements FOR DELETE USING (true);

-- Function to log stock movement
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  old_quantity INTEGER;
  new_quantity INTEGER;
  quantity_change INTEGER;
BEGIN
  -- Get old quantity (0 if insert)
  IF TG_OP = 'INSERT' THEN
    old_quantity := 0;
  ELSE
    old_quantity := OLD.quantity;
  END IF;

  -- Get new quantity
  new_quantity := NEW.quantity;

  -- Calculate change
  quantity_change := new_quantity - old_quantity;

  -- Only log if quantity actually changed
  IF quantity_change != 0 THEN
    -- Determine movement type based on change
    INSERT INTO stock_movements (
      product_id,
      movement_type,
      quantity,
      quantity_before,
      quantity_after,
      notes
    ) VALUES (
      NEW.product_id,
      CASE
        WHEN quantity_change > 0 THEN 'IN'
        ELSE 'OUT'
      END,
      quantity_change,
      old_quantity,
      new_quantity,
      CASE TG_OP
        WHEN 'INSERT' THEN 'เพิ่มสต็อคเริ่มต้น'
        WHEN 'UPDATE' THEN 'ปรับปรุงสต็อค'
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on stock table
DROP TRIGGER IF EXISTS trigger_log_stock_movement ON stock;

CREATE TRIGGER trigger_log_stock_movement
AFTER INSERT OR UPDATE OF quantity ON stock
FOR EACH ROW
EXECUTE FUNCTION log_stock_movement();

-- Update the existing decrease_stock_on_service function to log movement
CREATE OR REPLACE FUNCTION decrease_stock_on_service()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT quantity INTO current_stock
  FROM stock
  WHERE product_id = NEW.product_id;

  -- Check if stock went negative before update
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product_id %. Available: %, Required: %',
      NEW.product_id, current_stock, NEW.quantity;
  END IF;

  -- Decrease stock quantity
  UPDATE stock
  SET quantity = quantity - NEW.quantity,
      updated_at = NOW()
  WHERE product_id = NEW.product_id;

  -- Log the movement
  INSERT INTO stock_movements (
    product_id,
    movement_type,
    quantity,
    quantity_before,
    quantity_after,
    reference_id,
    notes
  ) VALUES (
    NEW.product_id,
    'SERVICE_USE',
    -NEW.quantity, -- negative for decrease
    current_stock,
    current_stock - NEW.quantity,
    NEW.service_record_id,
    'ใช้อะไหล่ในการบริการ'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_decrease_stock ON service_record_products;

CREATE TRIGGER trigger_decrease_stock
AFTER INSERT ON service_record_products
FOR EACH ROW
EXECUTE FUNCTION decrease_stock_on_service();
