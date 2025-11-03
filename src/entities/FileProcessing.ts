export interface FileUploadRequestDTO {
  file: any;
  userId: string;
}

export interface FileProcessingJobDTO {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  status: FileProcessingStatus;
  totalRows?: number;
  processedRows?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ProcessedDataDTO {
  id: string;
  fileProcessingId: string;
  rowNumber: number;
  columnName: string;
  value: string;
  dataType: string;
  createdAt: Date;
}

export interface FileListQueryDTO {
  page?: number;
  rows?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface FileListResponseDTO {
  files: FileProcessingJobDTO[];
  total: number;
  page: number;
  totalPages: number;
}

export enum FileProcessingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export const FILE_MESSAGES = {
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_NOT_FOUND: 'File not found',
  INVALID_FILE_TYPE: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 10MB',
  PROCESSING_STARTED: 'File processing started',
  PROCESSING_COMPLETED: 'File processing completed successfully',
  PROCESSING_FAILED: 'File processing failed',
  NO_DATA_FOUND: 'No data found in the Excel file'
} as const;

export const SUPPORTED_EXCEL_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
] as const;

export const SUPPORTED_EXCEL_EXTENSIONS = ['.xlsx', '.xls'] as const;
