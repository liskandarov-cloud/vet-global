-- Уведомления в Telegram: привязка личного чата с ботом к аккаунту.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLang" TEXT NOT NULL DEFAULT 'ru',
ADD COLUMN     "telegramLinkToken" TEXT,
ADD COLUMN     "telegramLinkUntil" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramLinkToken_key" ON "User"("telegramLinkToken");

