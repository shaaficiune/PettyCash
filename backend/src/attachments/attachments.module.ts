import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AttachmentsController],
})
export class AttachmentsModule {}
