import fs from 'fs';
import path from 'path';
import { prisma } from '$utils/prisma.utils';
import {
  FileProcessingJobDTO,
  FileProcessingStatus,
  ProcessedDataDTO,
  FILE_MESSAGES,
  SUPPORTED_EXCEL_EXTENSIONS,
  SUPPORTED_EXCEL_MIME_TYPES
} from '$entities/FileProcessing';
import Logger from '$pkg/logger';
import { BullJobQueue } from './JobQueue';

// Job queue interface to allow switching between implementations
interface JobQueue {
  addJob(name: string, data: any): Promise<{ id: string | number }>;
}

export class FileProcessingService {
  private static jobQueue: JobQueue = BullJobQueue;

  /**
   * Upload and queue Excel file for processing
   */
  static async uploadAndProcessFile(file: any, userId: string): Promise<{ jobId: string; fileProcessingId: string }> {
    try {
      // Validate file
      this.validateFile(file);

      // Save file to temporary location
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, filename);
      
      // Move file from buffer to disk
      fs.writeFileSync(filePath, file.buffer);

      // Create file processing record in database
      const fileProcessing = await prisma.fileProcessing.create({
        data: {
          filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          status: FileProcessingStatus.PENDING,
          fileUrl: filePath,
          userId: parseInt(userId)
        }
      });

      // Add job to queue
      const job = await this.jobQueue.addJob('process-excel', {
        fileUrl: filePath,
        fileProcessingId: fileProcessing.id.toString()
      });

      return {
        jobId: String(job.id),
        fileProcessingId: fileProcessing.id.toString()
      };
    } catch (error) {
      Logger.error('FileProcessingService.uploadAndProcessFile error:', error);
      throw error;
    }
  }

  /**
   * Get file processing status
   */
  static async getFileStatus(fileProcessingId: string, userId: string): Promise<FileProcessingJobDTO | null> {
    try {
      const fileProcessing = await prisma.fileProcessing.findFirst({
        where: {
          id: parseInt(fileProcessingId),
          userId: parseInt(userId)
        },
        include: {
          data: {
            take: 5, // Sample of processed data
            orderBy: {
              id: 'desc'
            }
          }
        }
      });

      if (!fileProcessing) {
        return null;
      }

      return {
        id: fileProcessing.id.toString(),
        userId: fileProcessing.userId.toString(),
        filename: fileProcessing.filename,
        originalName: fileProcessing.originalName,
        fileUrl: fileProcessing.fileUrl,
        mimeType: fileProcessing.mimeType,
        fileSize: fileProcessing.fileSize,
        status: fileProcessing.status as FileProcessingStatus,
        totalRows: fileProcessing.totalRows || undefined,
        processedRows: fileProcessing.processedRows || undefined,
        errorMessage: fileProcessing.errorMessage || undefined,
        createdAt: fileProcessing.createdAt,
        updatedAt: fileProcessing.updatedAt,
        completedAt: fileProcessing.completedAt || undefined
      };
    } catch (error) {
      Logger.error('FileProcessingService.getFileStatus error:', error);
      throw error;
    }
  }

  /**
   * Get list of files with filtering and pagination
   */
  static async getFileList(userId: string, query: any): Promise<{
    files: FileProcessingJobDTO[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = parseInt(query.page) || 1;
      const rows = Math.min(parseInt(query.rows) || 10, 100); // Limit max 100 per page
      const skip = (page - 1) * rows;

      // Build where clause
      const where: any = {
        userId: parseInt(userId)
      };

      if (query.status) {
        where.status = query.status;
      }

      if (query.search) {
        where.OR = [
          { filename: { contains: query.search } },
          { originalName: { contains: query.search } }
        ];
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate);
        }
      }

      // Get total count
      const total = await prisma.fileProcessing.count({ where });

      // Get files with pagination
      const files = await prisma.fileProcessing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: rows,
        include: {
          _count: {
            select: { data: true }
          }
        }
      });

      return {
        files: files.map(file => ({
          id: file.id.toString(),
          userId: file.userId.toString(),
          filename: file.filename,
          originalName: file.originalName,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          status: file.status as FileProcessingStatus,
          totalRows: file.totalRows || undefined,
          processedRows: file.processedRows || undefined,
          errorMessage: file.errorMessage || undefined,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          completedAt: file.completedAt || undefined
        })),
        total,
        page,
        totalPages: Math.ceil(total / rows)
      };
    } catch (error) {
      Logger.error('FileProcessingService.getFileList error:', error);
      throw error;
    }
  }

  /**
   * Get processed data for a file
   */
  static async getProcessedData(fileProcessingId: string, userId: string, query: any): Promise<{
    data: ProcessedDataDTO[];
    total: number;
  }> {
    try {
      const page = parseInt(query.page) || 1;
      const rows = Math.min(parseInt(query.rows) || 50, 1000);
      const skip = (page - 1) * rows;

      // Verify file belongs to user
      const fileProcessing = await prisma.fileProcessing.findFirst({
        where: {
          id: parseInt(fileProcessingId),
          userId: parseInt(userId)
        }
      });

      if (!fileProcessing) {
        throw new Error(FILE_MESSAGES.FILE_NOT_FOUND);
      }

      // Get data
      const data = await prisma.processedData.findMany({
        where: {
          fileProcessingId: parseInt(fileProcessingId)
        },
        orderBy: [
          { rowNumber: 'asc' },
          { columnName: 'asc' }
        ],
        skip,
        take: rows
      });

      const total = await prisma.processedData.count({
        where: {
          fileProcessingId: parseInt(fileProcessingId)
        }
      });

      return {
        data: data.map(item => ({
          id: item.id.toString(),
          fileProcessingId: item.fileProcessingId.toString(),
          rowNumber: item.rowNumber,
          columnName: item.columnName,
          value: item.value,
          dataType: item.dataType,
          createdAt: item.createdAt
        })),
        total
      };
    } catch (error) {
      Logger.error('FileProcessingService.getProcessedData error:', error);
      throw error;
    }
  }

  /**
   * Clear processed data for a file (used before retry)
   */
  static async clearProcessedData(fileProcessingId: string, userId: string): Promise<void> {
    try {
      // Verify file belongs to user
      const fileProcessing = await prisma.fileProcessing.findFirst({
        where: {
          id: parseInt(fileProcessingId),
          userId: parseInt(userId)
        }
      });

      if (!fileProcessing) {
        throw new Error(FILE_MESSAGES.FILE_NOT_FOUND);
      }

      // Delete all processed data for this file
      await prisma.processedData.deleteMany({
        where: {
          fileProcessingId: parseInt(fileProcessingId)
        }
      });

      Logger.info(`Cleared processed data for file ${fileProcessingId}`);
    } catch (error) {
      Logger.error('FileProcessingService.clearProcessedData error:', error);
      throw error;
    }
  }

  /**
   * Retry failed file processing
   */
  static async retryFileProcessing(fileProcessingId: string, userId: string): Promise<{ jobId: string; fileProcessingId: string }> {
    try {
      // Verify file belongs to user
      const fileProcessing = await prisma.fileProcessing.findFirst({
        where: {
          id: parseInt(fileProcessingId),
          userId: parseInt(userId)
        }
      });

      if (!fileProcessing) {
        throw new Error(FILE_MESSAGES.FILE_NOT_FOUND);
      }

      // Reset file status to PENDING
      await prisma.fileProcessing.update({
        where: { id: parseInt(fileProcessingId) },
        data: {
          status: FileProcessingStatus.PENDING,
          errorMessage: null,
          totalRows: null,
          processedRows: null,
          completedAt: null
        }
      });

      // Re-queue for processing
      const job = await this.jobQueue.addJob('process-excel-retry', {
        fileUrl: fileProcessing.fileUrl,
        fileProcessingId: fileProcessing.id.toString()
      });

      Logger.info(`File ${fileProcessingId} queued for retry processing`);
      return {
        jobId: String(job.id),
        fileProcessingId: fileProcessing.id.toString()
      };
    } catch (error) {
      Logger.error('FileProcessingService.retryFileProcessing error:', error);
      throw error;
    }
  }

  /**
   * Delete file and all its processed data
   */
  static async deleteFile(fileProcessingId: string, userId: string): Promise<void> {
    try {
      // Verify file belongs to user
      const fileProcessing = await prisma.fileProcessing.findFirst({
        where: {
          id: parseInt(fileProcessingId),
          userId: parseInt(userId)
        }
      });

      if (!fileProcessing) {
        throw new Error(FILE_MESSAGES.FILE_NOT_FOUND);
      }

      // Delete physical file if it exists
      if (fileProcessing.fileUrl && fs.existsSync(fileProcessing.fileUrl)) {
        try {
          fs.unlinkSync(fileProcessing.fileUrl);
          Logger.info(`Deleted physical file: ${fileProcessing.fileUrl}`);
        } catch (fileError) {
          Logger.warn(`Failed to delete physical file ${fileProcessing.fileUrl}:`, fileError);
        }
      }

      // Delete database records (processed data will be deleted by cascade)
      await prisma.fileProcessing.delete({
        where: { id: parseInt(fileProcessingId) }
      });

      Logger.info(`Deleted file ${fileProcessingId} and all its processed data`);
    } catch (error) {
      Logger.error('FileProcessingService.deleteFile error:', error);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  private static validateFile(file: { originalname: string; size: number; mimetype: string }) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(FILE_MESSAGES.FILE_TOO_LARGE);
    }

    // Check file type
    const fileExtension = path.extname(file.originalname).toLowerCase() as '.xlsx' | '.xls';
    if (!SUPPORTED_EXCEL_EXTENSIONS.includes(fileExtension)) {
      throw new Error(FILE_MESSAGES.INVALID_FILE_TYPE);
    }

    // Additional MIME type check
    if (!SUPPORTED_EXCEL_MIME_TYPES.includes(file.mimetype as any)) {
      // Some browsers might not set the correct MIME type, so this is a warning rather than an error
      Logger.warn(`Unexpected MIME type: ${file.mimetype} for file ${file.originalname}`);
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTemporaryFiles() {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          
          if (now.getTime() - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            Logger.info(`Cleaned up temporary file: ${file}`);
          }
        }
      }
    } catch (error) {
      Logger.error('FileProcessingService.cleanupTemporaryFiles error:', error);
    }
  }
}
