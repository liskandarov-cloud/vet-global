-- Акция на товар удаляется вместе с товаром.
-- Было ON DELETE SET NULL, а акция без товара — это скидка на весь ассортимент
-- продавца: удаление товара превращало скидку на него в скидку на все его товары.

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_productId_fkey";

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

