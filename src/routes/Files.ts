import { Router } from "express";
import * as FileController from "$controllers/rest/FileController";
import { authenticateToken } from "$middlewares/authMiddleware";

const FilesRoutes = Router({ mergeParams: true });

// All file routes require authentication
FilesRoutes.use(authenticateToken);

// Upload Excel file for processing
FilesRoutes.post("/upload", FileController.uploadFile);

// Get file processing status
FilesRoutes.get("/:id/status", FileController.getFileStatus);

// Get list of uploaded files with filtering and pagination
FilesRoutes.get("/", FileController.getFileList);

// Get processed data for a file
FilesRoutes.get("/:id/data", FileController.getProcessedData);

// Retry failed file processing
FilesRoutes.post("/:id/retry", FileController.retryFileProcessing);

// Delete file and its processed data
FilesRoutes.delete("/:id", FileController.deleteFile);

export default FilesRoutes;
