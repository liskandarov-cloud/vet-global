-- Удаление аккаунта владельцем (обезличивание).
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
