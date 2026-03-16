import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from "@nestjs/common"
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
const express = require('express');

async function bootstrap() {
  //local
  const app = await NestFactory.create(AppModule);
  //end local

  //cloud
  // const fs = require('fs')
  // const httpsOptions = {
  //   key: fs.readFileSync('../config/secrets/private-key.pem'),
  //   cert: fs.readFileSync('../config/secrets/public-certificate.pem'),
  // };
  // const app = await NestFactory.create(AppModule, {
  //   httpsOptions,
  // });
  // end cloud

  app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
  app.use(express.json());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  app.enableCors({
    origin: JSON.parse(process.env.CORSENVIROMENT),
    credentials: true
  })
  const config = new DocumentBuilder()
    .setTitle('MVP')
    .setDescription('API MVP')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)
  
  await app.listen(33188);
}
bootstrap();
