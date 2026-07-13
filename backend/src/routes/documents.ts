import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, deleteFile, generateStorageKey } from '../services/storage.js';
import { publish } from '../services/queue.js';
import {
  findDocumentById,
  findDocumentsByOrg,
  createDocument,
  updateDocumentStatus,
  deleteDocument,
  deleteChunksByDocument,
} from '../db/queries.js';
import { NotFoundError, ValidationError } from '../middleware/error.js';
import { DocumentProcessMessage } from '../types.js';

const documents = new Hono();

/**
 * POST /documents/upload
 * Upload a document (PDF, PPTX, XLSX) to MinIO and queue for processing.
 */
documents.post('/upload', async (c) => {
  const user = c.get('user');
  const orgId = c.get('orgId');

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new ValidationError('No file provided');
  }

  // Validate file type
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedMimes.includes(file.type)) {
    throw new ValidationError('Invalid file type. Allowed: PDF, PPTX, XLSX');
  }

  // Validate file size (50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new ValidationError('File too large. Maximum size: 50MB');
  }

  // Generate document ID and storage key
  const documentId = uuidv4();
  const storageKey = generateStorageKey(orgId, documentId, file.name);

  // Upload to MinIO
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadFile(storageKey, buffer, file.type);

  // Create document record
  const document = await createDocument({
    orgId,
    uploadedBy: user.id,
    filename: file.name,
    mimeType: file.type,
    storageKey,
    size: file.size,
  });

  // Queue for processing
  const message: DocumentProcessMessage = {
    documentId: document.id,
    storageKey,
  };
  await publish('document.process', message);

  return c.json({
    id: document.id,
    filename: document.filename,
    mimeType: document.mimeType,
    size: file.size,
    status: document.status,
    createdAt: document.createdAt,
  }, 201);
});

/**
 * GET /documents
 * List all documents for the current org.
 */
documents.get('/', async (c) => {
  const orgId = c.get('orgId');
  const docs = await findDocumentsByOrg(orgId);

  return c.json(docs.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    status: doc.status,
    createdAt: doc.createdAt,
  })));
});

/**
 * GET /documents/:id
 * Get a single document by ID.
 */
documents.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const documentId = c.req.param('id');

  const doc = await findDocumentById(documentId);
  if (!doc || doc.orgId !== orgId) {
    throw new NotFoundError('Document');
  }

  return c.json({
    id: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    status: doc.status,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
  });
});

/**
 * DELETE /documents/:id
 * Delete a document and its chunks.
 */
documents.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const documentId = c.req.param('id');

  const doc = await findDocumentById(documentId);
  if (!doc || doc.orgId !== orgId) {
    throw new NotFoundError('Document');
  }

  // Delete from MinIO
  await deleteFile(doc.storageKey);

  // Delete chunks from DB
  await deleteChunksByDocument(documentId);

  // Delete document record
  await deleteDocument(documentId);

  return c.json({ success: true });
});

export default documents;
