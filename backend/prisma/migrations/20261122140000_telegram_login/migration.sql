-- Вход через Telegram: одноразовые ключи подтверждения из бота.
-- CreateTable
CREATE TABLE "TelegramLogin" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramLogin_expiresAt_idx" ON "TelegramLogin"("expiresAt");

