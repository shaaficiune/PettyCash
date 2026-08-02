import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { StorageService } from '../storage/storage.service';
import { Inject } from '@nestjs/common';
import { Get, Query } from '@nestjs/common';

const uploadDir = './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('File Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}
  
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          // Generate unique file name
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB limit
      },
      fileFilter: (req, file, cb) => {
        // Allowed formats
        const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Unsupported file format. Allowed types: ${allowedExtensions.join(', ')}`), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload file attachment (invoice, receipt, quotation)' })
  @ApiConsumes('multipart/form-data')
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    // If configured to use MinIO, upload the saved file to MinIO and return its URL
    const localPath = join(uploadDir, file.filename);
    let fileUrl = `/uploads/${file.filename}`;
    try {
      if ((process.env.STORAGE_TYPE || 'local') === 'minio') {
        fileUrl = await this.storage.uploadLocalFile(localPath, file.filename);
      }
    } catch (e) {
      // Log error and continue returning local path as fallback
      console.error('Storage upload failed:', e.message || e);
    }

    return {
      fileName: file.originalname,
      fileUrl,
      fileType: extname(file.originalname).substring(1).toUpperCase(),
      fileSize: file.size,
    };
  }

  @Get('presign')
  @ApiOperation({ summary: 'Get presigned URL for an object stored in MinIO' })
  async presign(@Query('objectName') objectName: string) {
    if (!objectName) {
      throw new BadRequestException('objectName query parameter is required');
    }

    if ((process.env.STORAGE_TYPE || 'local') !== 'minio') {
      // For local storage, return local path
      return { url: `/uploads/${objectName}` };
    }

    try {
      const url = await this.storage.getPresignedUrl(objectName);
      return { url };
    } catch (e) {
      throw new BadRequestException('Could not generate presigned URL');
    }
  }
}
