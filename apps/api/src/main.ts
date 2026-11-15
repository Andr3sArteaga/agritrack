import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const enProduccion = process.env.NODE_ENV === 'production';

  if (enProduccion && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error(
      'En producción JWT_SECRET es obligatorio y debe tener al menos 32 caracteres.',
    );
  }

  // CORS_ORIGIN: lista separada por comas con los dominios de la web.
  // Sin definir: se permite cualquier origen (solo para uso local).
  const origenes = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);
  if (enProduccion && origenes.length === 0) {
    throw new Error('En producción CORS_ORIGIN es obligatorio.');
  }
  app.enableCors({
    origin: origenes.length > 0 ? origenes : true,
    exposedHeaders: ['Content-Disposition'],
  });
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AgriTrack API')
    .setDescription('API de gestion agricola para AgroAn')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
bootstrap();
