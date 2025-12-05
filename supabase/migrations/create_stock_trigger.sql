-- Create trigger to automatically decrease stock when service record products are inserted

CREATE OR REPLACE FUNCTION decrease_stock_on_service()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease stock quantity
  UPDATE stock
  SET quantity = quantity - NEW.quantity,
      updated_at = NOW()
  WHERE product_id = NEW.product_id;

  -- Check if stock went negative
  IF (SELECT quantity FROM stock WHERE product_id = NEW.product_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product_id %', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_decrease_stock ON service_record_products;

CREATE TRIGGER trigger_decrease_stock
AFTER INSERT ON service_record_products
FOR EACH ROW
EXECUTE FUNCTION decrease_stock_on_service();
