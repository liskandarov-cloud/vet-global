-- Язык и корзина чата с ботом — в базе, а не в памяти процесса.
-- CreateTable
CREATE TABLE "TelegramChatState" (
    "chatId" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ru',
    "cart" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChatState_pkey" PRIMARY KEY ("chatId")
);

