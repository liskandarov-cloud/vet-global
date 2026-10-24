import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { text } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { corsOrigins } from './common/frontend-url';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Приложение живёт за прокси (Render / Caddy). Без доверия к прокси req.ip
  // у всех запросов равен адресу прокси — ограничитель частоты считал бы всех
  // пользователей одним клиентом и лимит на вход блокировал бы всех разом.
  app.set('trust proxy', 1);

  // Accept raw CommerceML/XML bodies (1C sync endpoint) as text.
  app.use(text({ type: ['application/xml', 'text/xml'], limit: '10mb' }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );

  // Единый обработчик ошибок: структурный лог + оповещение о 5xx (если задан
  // ERROR_WEBHOOK_URL). Без него сбой на демо виден только зрителю.
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS. По умолчанию — только собственный фронтенд: значение «*» вместе с
  // credentials:true отражало любой Origin (проверено: evil-example.com получал
  // access-control-allow-origin на себя). Явная звёздочка в CORS_ORIGINS всё ещё
  // возможна для локальной отладки, но тогда отключаем credentials.
  const { origins, allowAll } = corsOrigins();
  app.enableCors({
    origin: allowAll ? true : origins,
    credentials: !allowAll,
  });

  // Swagger публикует карту всех ~114 эндпоинтов. Сами данные она не отдаёт
  // (всё под авторизацией), но для атакующего это готовая разведка. На время
  // показа и интеграций удобно держать включённой; выключается SWAGGER_ENABLED=false.
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('VetHub API')
      .setDescription('B2B veterinary marketplace API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  console.log(
    `VetHub API listening on :${port}` + (swaggerEnabled ? ' (docs at /api/docs)' : ' (docs disabled)'),
  );
}
// Падение на старте должно завершать процесс с ошибкой: иначе необработанное
// отклонение промиса выглядит в логах случайной трассировкой, а на Render
// неудачная выкатка не отличается от удачной — старый контейнер продолжает
// отвечать, и ошибку видно только по отсутствию изменений.
bootstrap().catch((err) => {
  console.error('VetHub API не поднялся:', err);
  process.exit(1);
});
