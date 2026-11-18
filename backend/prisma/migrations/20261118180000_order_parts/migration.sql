-- Статус части заказа по продавцу. Заказ нескольких поставщиков продавец
-- ведёт только в своей части; общий статус складывается из частей. Записи
-- создаются при первом изменении части (статусом заказа на тот момент).
CREATE TABLE "OrderPart" (
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "cancelled" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPart_pkey" PRIMARY KEY ("orderId","sellerId")
);

ALTER TABLE "OrderPart" ADD CONSTRAINT "OrderPart_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
