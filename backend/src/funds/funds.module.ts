import { Module } from '@nestjs/common';
import { FundsService } from './funds.service';
import { MonthlyBookService } from './monthly-book.service';
import { FundsController } from './funds.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FundsService, MonthlyBookService],
  controllers: [FundsController],
  exports: [FundsService, MonthlyBookService],
})
export class FundsModule {}
