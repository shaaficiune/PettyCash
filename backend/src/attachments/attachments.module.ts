import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [AttachmentsController],
})
export class AttachmentsModule {}
