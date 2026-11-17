-- Коды ИКПУ у товара и снимок в позиции заказа.
ALTER TABLE "Product" ADD COLUMN "mxikCode" TEXT;
ALTER TABLE "Product" ADD COLUMN "packageCode" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "mxikCode" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "packageCode" TEXT;
