import Queue, { Job } from 'bull';
import * as xlsx from 'xlsx';
import { prisma } from '$utils/prisma.utils';
import {
  FileProcessingStatus,
  FILE_MESSAGES
} from '$entities/FileProcessing';
import Logger from '$pkg/logger';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Job data interface
interface ExcelJobData {
  fileUrl: string;
  fileProcessingId: string;
  retryCount?: number;
}

/**
 * Job Queue using Bull Queue + Redis
 */
export class BullJobQueue {
  private static queue = new Queue<ExcelJobData>('excel-processing', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 10, // Keep only 10 completed jobs
      removeOnFail: 50,     // Keep 50 failed jobs for debugging
      attempts: 3,          // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,        // Start with 2 second delay
      },
    },
  });

  /**
   * Initialize the queue and set up job processors
   */
  static async initialize() {
    try {
      // Process Excel file jobs
      this.queue.process('process-excel', this.handleExcelJob.bind(this));
      this.queue.process('process-excel-retry', this.handleExcelJob.bind(this));

      // Set up event handlers
      this.queue.on('completed', (job: Job, result: any) => {
        Logger.info(`Job ${job.id} completed successfully`);
      });

      this.queue.on('failed', (job: Job, error: Error) => {
        Logger.error(`Job ${job.id} failed:`, error);
      });

      this.queue.on('stalled', (job: Job) => {
        Logger.warn(`Job ${job.id} is stalled`);
      });

      Logger.info('Production job queue initialized with Bull Queue');
    } catch (error) {
      Logger.error('Failed to initialize production job queue:', error);
      throw error;
    }
  }

  /**
   * Add a new Excel processing job
   */
  static async addJob(name: string, data: ExcelJobData): Promise<{ id: string | number }> {
    try {
      const job = await this.queue.add(name, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      Logger.info(`Job ${job.id} added to queue: ${name}`);
      return { id: job.id };
    } catch (error) {
      Logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Handle Excel processing jobs
   */
  private static async handleExcelJob(job: Job<ExcelJobData>) {
    const { fileUrl, fileProcessingId, retryCount = 0 } = job.data;
    
    Logger.info(`Processing Excel file job ${job.id} for file ${fileProcessingId} (attempt ${retryCount + 1})`);

    try {
      // Update status to IN_PROGRESS
      await prisma.fileProcessing.update({
        where: { id: parseInt(fileProcessingId) },
        data: { 
          status: FileProcessingStatus.IN_PROGRESS,
          retryCount 
        }
      });

      // Read and process Excel file
      const workbook = xlsx.readFile(fileUrl);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (!data || data.length === 0) {
        throw new Error(FILE_MESSAGES.NO_DATA_FOUND);
      }

      // Get headers and determine total rows
      const headers = data[0] as string[];
      const totalRows = data.length - 1; // Exclude header row

      // Update total rows
      await prisma.fileProcessing.update({
        where: { id: parseInt(fileProcessingId) },
        data: { totalRows }
      });

      // Process each row
      const processedData = [];
      let processedCount = 0;

      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex] as any[];
        
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const columnName = headers[colIndex];
          const value = row[colIndex];
          
          if (value !== undefined && value !== null && value !== '') {
            processedData.push({
              fileProcessingId: parseInt(fileProcessingId),
              rowNumber: rowIndex + 1,
              columnName,
              value: String(value),
              dataType: typeof value
            });
          }
        }
        
        processedCount++;
        
        // Update progress every 10 rows
        if (processedCount % 10 === 0) {
          await prisma.fileProcessing.update({
            where: { id: parseInt(fileProcessingId) },
            data: { processedRows: processedCount }
          });
        }
      }

      // Batch insert processed data (100 records at a time)
      const batchSize = 100;
      for (let i = 0; i < processedData.length; i += batchSize) {
        const batch = processedData.slice(i, i + batchSize);
        await prisma.processedData.createMany({
          data: batch
        });
      }

      // Mark as completed
      await prisma.fileProcessing.update({
        where: { id: parseInt(fileProcessingId) },
        data: {
          status: FileProcessingStatus.COMPLETED,
          processedRows: processedCount,
          completedAt: new Date()
        }
      });

      Logger.info(`File processing completed for file ${fileProcessingId}: ${processedCount} rows processed`);
      return { success: true, processedCount };

    } catch (error) {
      // Mark as failed
      await prisma.fileProcessing.update({
        where: { id: parseInt(fileProcessingId) },
        data: {
          status: FileProcessingStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      Logger.error(`File processing failed for file ${fileProcessingId}:`, error);
      throw error;
    }
  }

  /**
   * Get job status from queue
   */
  static async getJob(jobId: string): Promise<Job<ExcelJobData> | undefined> {
    try {
      const job = await this.queue.getJob(jobId);
      return job || undefined;
    } catch (error) {
      Logger.error('Failed to get job from queue:', error);
      return undefined;
    }
  }

  /**
   * Clean up old jobs
   */
  static async cleanup() {
    try {
      await this.queue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24h
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'failed');  // Remove failed jobs older than 7 days
      Logger.info('Queue cleanup completed');
    } catch (error) {
      Logger.error('Queue cleanup failed:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown() {
    try {
      await this.queue.close();
      Logger.info('Production job queue shutdown completed');
    } catch (error) {
      Logger.error('Error during queue shutdown:', error);
    }
  }
}
