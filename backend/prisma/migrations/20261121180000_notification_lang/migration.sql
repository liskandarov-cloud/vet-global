-- Уведомления на языке пользователя: узбекский текст рядом с русским и язык устройства у push-подписки.
ALTER TABLE "Notification" ADD COLUMN "titleUz" TEXT;
ALTER TABLE "Notification" ADD COLUMN "bodyUz" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN "lang" TEXT NOT NULL DEFAULT 'ru';
