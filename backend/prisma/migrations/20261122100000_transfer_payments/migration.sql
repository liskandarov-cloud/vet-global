-- Оплата перечислением на счёт продавца: отметка продавца по своей части заказа.
-- CreateTable
CREATE TABLE "TransferPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferPayment_sellerId_paidAt_idx" ON "TransferPayment"("sellerId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "TransferPayment_orderId_sellerId_key" ON "TransferPayment"("orderId", "sellerId");

-- AddForeignKey
ALTER TABLE "TransferPayment" ADD CONSTRAINT "TransferPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferPayment" ADD CONSTRAINT "TransferPayment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

