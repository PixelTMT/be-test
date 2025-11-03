import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { FileProcessingService } from '$services/FileProcessingService';
import { FileProcessingStatus, FILE_MESSAGES } from '$entities/FileProcessing';
import { response_success } from '$utils/response.utils';
import Logger from '$pkg/logger';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error(FILE_MESSAGES.INVALID_FILE_TYPE));
    }
    
    cb(null, true);
  }
});

/**
 * Upload Excel file for processing
 * POST /files/upload
 */
export async function uploadFile(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Handle file upload using multer middleware
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      try {
        // Upload and queue file for processing
        const result = await FileProcessingService.uploadAndProcessFile(file, req.user!.id);

        return response_success(res, {
          jobId: result.jobId,
          fileProcessingId: result.fileProcessingId,
          message: FILE_MESSAGES.PROCESSING_STARTED
        }, FILE_MESSAGES.FILE_UPLOADED);
      } catch (uploadError) {
        Logger.error('FileController.uploadFile error:', uploadError);
        return res.status(500).json({
          success: false,
          message: uploadError instanceof Error ? uploadError.message : 'File processing failed'
        });
      }
    });

    // Return a pending response since the actual response will be handled by multer
    return res.status(202).json({
      success: true,
      message: 'File upload in progress'
    });
  } catch (error) {
    Logger.error('FileController.uploadFile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get file processing status
 * GET /files/:id/status
 */
export async function getFileStatus(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const fileProcessingId = req.params.id;
    const fileStatus = await FileProcessingService.getFileStatus(fileProcessingId, req.user.id);

    if (!fileStatus) {
      return res.status(404).json({
        success: false,
        message: FILE_MESSAGES.FILE_NOT_FOUND
      });
    }

    return response_success(res, fileStatus, 'File status retrieved successfully');
  } catch (error) {
    Logger.error('FileController.getFileStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get list of uploaded files with filtering and pagination
 * GET /files
 */
export async function getFileList(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const query = req.query;
    const result = await FileProcessingService.getFileList(req.user.id, query);

    return response_success(res, {
      files: result.files,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        rows: query.rows || 10
      }
    }, 'File list retrieved successfully');
  } catch (error) {
    Logger.error('FileController.getFileList error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get processed data for a file
 * GET /files/:id/data
 */
export async function getProcessedData(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const fileProcessingId = req.params.id;
    const query = req.query;
    const result = await FileProcessingService.getProcessedData(fileProcessingId, req.user.id, query);

    return response_success(res, {
      data: result.data,
      pagination: {
        total: result.total,
        page: parseInt(query.page as string) || 1,
        rows: parseInt(query.rows as string) || 50
      }
    }, 'Processed data retrieved successfully');
  } catch (error) {
    Logger.error('FileController.getProcessedData error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve processed data'
    });
  }
}

/**
 * Retry failed file processing
 * POST /files/:id/retry
 */
export async function retryFileProcessing(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const fileProcessingId = req.params.id;
    
    // Get current file status
    const fileStatus = await FileProcessingService.getFileStatus(fileProcessingId, req.user.id);
    
    if (!fileStatus) {
      return res.status(404).json({
        success: false,
        message: FILE_MESSAGES.FILE_NOT_FOUND
      });
    }

    // Only allow retry for failed files
    if (fileStatus.status !== FileProcessingStatus.FAILED) {
      return res.status(400).json({
        success: false,
        message: 'File can only be retried if it failed'
      });
    }

    // Clear existing processed data and reset status
    await FileProcessingService.clearProcessedData(fileProcessingId, req.user.id);
    
    // Reset file status to PENDING and re-queue for processing
    const result = await FileProcessingService.retryFileProcessing(fileProcessingId, req.user.id);

    return response_success(res, {
      jobId: result.jobId,
      fileProcessingId: result.fileProcessingId,
      message: 'File retry processing started'
    }, 'File retry has been queued successfully');
  } catch (error) {
    Logger.error('FileController.retryFileProcessing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete file and its processed data
 * DELETE /files/:id
 */
export async function deleteFile(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const fileProcessingId = req.params.id;
    
    // Get current file status
    const fileStatus = await FileProcessingService.getFileStatus(fileProcessingId, req.user.id);
    
    if (!fileStatus) {
      return res.status(404).json({
        success: false,
        message: FILE_MESSAGES.FILE_NOT_FOUND
      });
    }

    // Delete file from database and physical file
    await FileProcessingService.deleteFile(fileProcessingId, req.user.id);

    return response_success(res, {
      message: 'File deleted successfully'
    }, 'File and all its processed data have been deleted');
  } catch (error) {
    Logger.error('FileController.deleteFile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Export multer middleware for route use
export { upload };
