import { Controller, Post, Get, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Request, Param, Res, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { basename, extname, join, resolve, sep } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { StorageService } from '../storage/storage.service';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';

const uploadDir = resolve(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('File Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(
    @Inject(StorageService) private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}
  
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const userDirectory = join(uploadDir, req.user.userId);
          mkdirSync(userDirectory, { recursive: true });
          cb(null, userDirectory);
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
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png',
          'image/jpeg',
          'image/pjpeg',
          // Note: 'application/octet-stream' intentionally excluded — prevents MIME spoofing
        ];
        const ext = extname(file.originalname).toLowerCase();
        const mime = file.mimetype?.toLowerCase();

        // Require both extension AND an explicit matching MIME type (|| !mime removed to close bypass)
        if (allowedExtensions.includes(ext) && mime && allowedMimeTypes.includes(mime)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Unsupported file format. Allowed types: ${allowedExtensions.join(', ')}`), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload file attachment (invoice, receipt, quotation)' })
  @ApiConsumes('multipart/form-data')
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    // If configured to use MinIO, upload the saved file to MinIO and return its URL
    const localPath = join(uploadDir, req.user.userId, file.filename);
    const objectName = `${req.user.userId}/${file.filename}`;
    let fileUrl = `/uploads/${objectName}`;
    try {
      if ((process.env.STORAGE_TYPE || 'local') === 'minio') {
        fileUrl = await this.storage.uploadLocalFile(localPath, objectName);
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

  @Get(':id/file')
  @ApiParam({ name: 'id', description: 'Attachment record ID' })
  @ApiOperation({ summary: 'Download an attachment after checking request access' })
  async download(@Param('id') id: string, @Request() req: any, @Res() response: Response) {
    const details = await this.getAuthorizedFileDetails(id, req.user);

    if (details.isMinio) {
      const url = await this.storage.getPresignedUrl(details.objectName);
      return response.redirect(url);
    }

    const userDirectory = details.ownerId ? join(uploadDir, details.ownerId) : uploadDir;
    const filePath = resolve(userDirectory, details.fileName);
    const allowedRoot = resolve(userDirectory) + sep;
    if (!filePath.startsWith(allowedRoot) || !existsSync(filePath)) {
      throw new NotFoundException('Attachment file not found');
    }

    return response.sendFile(filePath);
  }

  @Get(':id/presign')
  @ApiParam({ name: 'id', description: 'Attachment record ID' })
  @ApiOperation({ summary: 'Get an authorized presigned URL for an attachment' })
  async presign(@Param('id') id: string, @Request() req: any) {
    const details = await this.getAuthorizedFileDetails(id, req.user);
    if (!details.isMinio) {
      return { url: `/api/attachments/${id}/file` };
    }
    return { url: await this.storage.getPresignedUrl(details.objectName) };
  }

  private async getAuthorizedFileDetails(id: string, user: any) {
    const attachment = await this.prisma.pettyCashAttachment.findUnique({
      where: { id },
      include: { request: { select: { userId: true } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (user.role === RoleName.EMPLOYEE && attachment.request.userId !== user.userId) {
      throw new ForbiddenException('You do not have access to this attachment');
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(attachment.fileUrl, 'http://local').pathname);
    } catch {
      throw new NotFoundException('Attachment file not found');
    }

    const parts = pathname.split('/').filter(Boolean);
    let ownerId: string | null = null;
    let fileName: string;
    let objectName: string;
    let isMinio = false;

    const bucket = process.env.MINIO_BUCKET || 'petty-cash-attachments';
    if (parts[0] === bucket && parts.length === 3) {
      isMinio = true;
      ownerId = parts[1];
      fileName = parts[2];
      objectName = `${ownerId}/${fileName}`;
    } else if (parts[0] === bucket && parts.length === 2) {
      isMinio = true;
      // Allow legacy attachment rows, but only through their existing DB record.
      ownerId = null;
      fileName = parts[1];
      objectName = fileName;
    } else if (parts[0] === 'uploads' && parts.length === 3) {
      ownerId = parts[1];
      fileName = parts[2];
      objectName = `${ownerId}/${fileName}`;
    } else if (parts[0] === 'uploads' && parts.length === 2) {
      // Legacy files remain available only through their existing attachment record.
      ownerId = null;
      fileName = parts[1];
      objectName = fileName;
    } else {
      throw new NotFoundException('Attachment file not found');
    }

    if (basename(fileName) !== fileName || (ownerId && ownerId !== attachment.request.userId)) {
      throw new NotFoundException('Attachment file not found');
    }

    return { ownerId, fileName, objectName, isMinio };
  }
}
