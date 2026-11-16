import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded, type Request, type Response } from 'express';
import { AppModule } from './app.module';

let appPromise: Promise<INestApplication> | null = null;

export async function crearApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const enProduccion = process.env.NODE_ENV === 'production';

  if (enProduccion && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error(
      'En producción JWT_SECRET es obligatorio y debe tener al menos 32 caracteres.',
    );
  }

  // CORS_ORIGIN: lista separada por comas con los dominios de la web o "*".
  // Sin definir: se permite cualquier origen (solo para uso local).
  const origenes = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);
  if (enProduccion && origenes.length === 0) {
    throw new Error('En producción CORS_ORIGIN es obligatorio.');
  }
  const permitirCualquierOrigen =
    origenes.length === 0 || origenes.includes('*');
  app.enableCors({
    origin: permitirCualquierOrigen ? true : origenes,
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

  await app.init();
  return app;
}

async function obtenerApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = crearApp().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export async function handler(req: Request, res: Response): Promise<void> {
  const app = await obtenerApp();
  const server = app.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => void;
  server(req, res);
}

async function bootstrap() {
  const app = await obtenerApp();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

if (!process.env.VERCEL) {
  void bootstrap();
}
