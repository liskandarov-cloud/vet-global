-- Захват отправки счёта-фактуры в Didox: двойное нажатие выпускало два документа.
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "sendingAt" TIMESTAMP(3);

