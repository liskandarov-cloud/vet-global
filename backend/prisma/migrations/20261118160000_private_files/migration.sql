-- Закрытые файлы: лицензии продавцов больше не отдаются по публичной ссылке.
ALTER TABLE "StoredFile" ADD COLUMN "private" BOOLEAN NOT NULL DEFAULT false;

-- Уже загруженные лицензии закрываются сразу.
UPDATE "StoredFile" SET "private" = true
WHERE "id" IN (
  SELECT substring("fileUrl" from '/api/files/([0-9a-fA-F-]{36})$') FROM "SellerDocument"
);
