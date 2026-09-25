import {
  ValidationPipe,
} from '@nestjs/common';

import {
  NestFactory,
} from '@nestjs/core';

import {
  NestExpressApplication,
} from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';

import {
  join,
} from 'path';

import {
  AppModule,
} from './app.module.js';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  /*
   * Cookie parser must be registered
   * before requests reach controllers.
   */
  app.use(
    cookieParser(),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
    ],

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useStaticAssets(
    join(
      process.cwd(),
      'uploads',
    ),
    {
      prefix:
        '/uploads/',
    },
  );

  await app.listen(
    4000,
  );

  console.log(
    'Backend running on http://localhost:4000',
  );
}

void bootstrap();