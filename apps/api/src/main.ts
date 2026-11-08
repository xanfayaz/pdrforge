import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http';
import { resolveUploads } from './common/paths';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origin = (config.get<string>('WEB_ORIGIN') || 'http://localhost:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  app.enableCors({
    origin(requestOrigin, callback) {
      if (!requestOrigin || origin.includes(requestOrigin) || isPrivateDevOrigin(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: false,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const uploads = resolveUploads();
  if (!existsSync(uploads)) mkdirSync(uploads, { recursive: true });
  app.use(
    '/uploads',
    express.static(uploads, {
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'none'; script-src 'none'");
      },
    }),
  );

  const port = Number(config.get('PORT') || 4000);
  await app.listen(port, '0.0.0.0');
}

function isPrivateDevOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    const match = /^172\.(\d{1,3})\./.exec(host);
    if (!match) return false;
    const second = Number(match[1]);
    return second >= 16 && second <= 31;
  } catch {
    return false;
  }
}

void bootstrap();
