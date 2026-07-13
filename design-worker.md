# Worker Service — Design Doc

## Overview

Python worker that consumes document processing jobs from RabbitMQ. Extracts text from uploaded documents (PDF, PPTX, XLSX), chunks the content, generates embeddings (mocked), and stores results in PostgreSQL with pgvector.

---

## Tech Stack

- Python 3.11+
- `pika` (RabbitMQ client)
- `psycopg2` or `asyncpg` (PostgreSQL)
- `pymupdf` or `pdfplumber` (PDF extraction)
- `python-pptx` (PPTX extraction)
- `openpyxl` (XLSX extraction)
- `minio` (MinIO client)
- `numpy` (for mock embeddings)

---

## File Structure

```
worker/
├── src/
│   ├── main.py                 # Entry point, starts consumer
│   ├── consumer.py             # RabbitMQ consumer
│   ├── processor.py            # Document processing orchestrator
│   ├── extractors/
│   │   ├── __init__.py
│   │   ├── base.py             # Base extractor interface
│   │   ├── pdf.py              # PDF extraction
│   │   ├── pptx.py             # PPTX extraction
│   │   └── xlsx.py             # XLSX extraction
│   ├── chunker.py              # Text chunking logic
│   ├── embedder.py             # Embedding generation (mocked)
│   ├── storage.py              # MinIO client wrapper
│   └── db.py                   # PostgreSQL connection + queries
├── requirements.txt
└── Dockerfile
```

---

## Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Document Processing Flow                      │
└─────────────────────────────────────────────────────────────────────┘

  RabbitMQ                    Worker                         MinIO
     │                          │                              │
     │  consume message         │                              │
     │  {documentId, storageKey}│                              │
     │─────────────────────────▶│                              │
     │                          │                              │
     │                          │  download file               │
     │                          │─────────────────────────────▶│
     │                          │                              │
     │                          │  file bytes                  │
     │                          │◀─────────────────────────────│
     │                          │                              │
     │                          │  extract text                │
     │                          │  ┌─────────────────────┐    │
     │                          │  │ PDF  → pymupdf      │    │
     │                          │  │ PPTX → python-pptx  │    │
     │                          │  │ XLSX → openpyxl     │    │
     │                          │  └─────────────────────┘    │
     │                          │                              │
     │                          │  chunk text (512 tokens)     │
     │                          │                              │
     │                          │  generate embeddings (mock)  │
     │                          │                              │
     │                          │  insert chunks to PostgreSQL │
     │                          │                              │
     │                          │  update document status      │
     │                          │  status = 'ready'            │
     │                          │                              │
```

---

## Components

### Consumer (`consumer.py`)

```python
import pika
import json
from processor import process_document

def start_consumer():
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=os.environ.get('RABBITMQ_HOST', 'localhost'))
    )
    channel = connection.channel()

    channel.queue_declare(queue='document.process', durable=True)

    def callback(ch, method, properties, body):
        message = json.loads(body)
        document_id = message['documentId']
        storage_key = message['storageKey']

        try:
            process_document(document_id, storage_key)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"Error processing {document_id}: {e}")
            # Requeue on failure (with retry limit in production)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_qos(prefetch_count=1)  # Process one at a time
    channel.basic_consume(queue='document.process', on_message_callback=callback)

    print("Worker started. Waiting for messages...")
    channel.start_consuming()
```

### Processor (`processor.py`)

```python
from extractors import get_extractor
from chunker import chunk_text
from embedder import generate_embeddings
from storage import download_file
from db import insert_chunks, update_document_status

def process_document(document_id: str, storage_key: str):
    """Main processing pipeline for a single document."""

    # 1. Update status to 'processing'
    update_document_status(document_id, 'processing')

    try:
        # 2. Download file from MinIO
        file_bytes = download_file(storage_key)

        # 3. Extract text based on file type
        extractor = get_extractor(storage_key)
        extracted = extractor.extract(file_bytes)
        # Returns: list of ExtractedPage { page_num, text, metadata }

        # 4. Chunk text
        chunks = []
        for page in extracted:
            page_chunks = chunk_text(page.text, chunk_size=512)
            for i, chunk in enumerate(page_chunks):
                chunks.append({
                    'content': chunk,
                    'metadata': {
                        'page': page.page_num,
                        'chunk_index': i,
                        **page.metadata,
                    }
                })

        # 5. Generate embeddings (mocked)
        embeddings = generate_embeddings([c['content'] for c in chunks])

        # 6. Insert chunks with embeddings
        insert_chunks(
            document_id=document_id,
            org_id=get_document_org(document_id),
            chunks=chunks,
            embeddings=embeddings,
        )

        # 7. Update status to 'ready'
        update_document_status(document_id, 'ready')

    except Exception as e:
        update_document_status(document_id, 'failed', error=str(e))
        raise
```

### Extractors

#### Base Extractor (`extractors/base.py`)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List

@dataclass
class ExtractedPage:
    page_num: int
    text: str
    metadata: dict

class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, file_bytes: bytes) -> List[ExtractedPage]:
        """Extract text from file bytes. Returns list of pages."""
        pass

def get_extractor(filename: str) -> BaseExtractor:
    """Factory function to get appropriate extractor by file extension."""
    ext = filename.lower().split('.')[-1]
    if ext == 'pdf':
        return PDFExtractor()
    elif ext == 'pptx':
        return PPTXExtractor()
    elif ext == 'xlsx':
        return XLSXExtractor()
    else:
        raise ValueError(f"Unsupported file type: {ext}")
```

#### PDF Extractor (`extractors/pdf.py`)

```python
import pymupdf  # PyMuPDF
from .base import BaseExtractor, ExtractedPage

class PDFExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes) -> list[ExtractedPage]:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        pages = []

        for i, page in enumerate(doc):
            text = page.get_text()
            if text.strip():
                pages.append(ExtractedPage(
                    page_num=i + 1,
                    text=text.strip(),
                    metadata={'format': 'pdf'}
                ))

        doc.close()
        return pages
```

#### PPTX Extractor (`extractors/pptx.py`)

```python
from pptx import Presentation
from io import BytesIO
from .base import BaseExtractor, ExtractedPage

class PPTXExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes) -> list[ExtractedPage]:
        prs = Presentation(BytesIO(file_bytes))
        pages = []

        for i, slide in enumerate(prs.slides):
            text_parts = []

            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    text_parts.append(shape.text.strip())

            if text_parts:
                pages.append(ExtractedPage(
                    page_num=i + 1,
                    text='\n'.join(text_parts),
                    metadata={'format': 'pptx', 'slide_num': i + 1}
                ))

        return pages
```

#### XLSX Extractor (`extractors/xlsx.py`)

```python
from openpyxl import load_workbook
from io import BytesIO
from .base import BaseExtractor, ExtractedPage

class XLSXExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes) -> list[ExtractedPage]:
        wb = load_workbook(BytesIO(file_bytes), data_only=True)
        pages = []

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = []

            for row in ws.iter_rows(values_only=True):
                row_text = '\t'.join(str(cell) if cell is not None else '' for cell in row)
                if row_text.strip():
                    rows.append(row_text)

            if rows:
                pages.append(ExtractedPage(
                    page_num=1,  # Sheets don't have page numbers
                    text='\n'.join(rows),
                    metadata={'format': 'xlsx', 'sheet': sheet_name}
                ))

        return pages
```

### Chunker (`chunker.py`)

```python
from typing import List

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    """
    Split text into chunks of approximately chunk_size tokens.
    Uses word count as proxy for tokens (1 word ≈ 1.3 tokens).
    """
    words = text.split()
    estimated_tokens_per_word = 1.3
    words_per_chunk = int(chunk_size / estimated_tokens_per_word)
    overlap_words = int(overlap / estimated_tokens_per_word)

    chunks = []
    start = 0

    while start < len(words):
        end = start + words_per_chunk
        chunk = ' '.join(words[start:end])

        if chunk.strip():
            chunks.append(chunk)

        start = end - overlap_words

    return chunks if chunks else [text]
```

### Embedder (`embedder.py`)

```python
import numpy as np
from typing import List

EMBEDDING_DIM = 1536  # Match pgvector column dimension

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate mock embeddings.
    Replace with real embedding model (OpenAI, local, etc.) later.
    """
    embeddings = []
    for text in texts:
        # Generate random vector for now
        # In production: openai.embeddings.create(input=text, model="text-embedding-3-small")
        vector = np.random.randn(EMBEDDING_DIM).tolist()
        # Normalize to unit vector (for cosine similarity)
        norm = np.linalg.norm(vector)
        vector = (vector / norm).tolist()
        embeddings.append(vector)

    return embeddings
```

### Storage (`storage.py`)

```python
from minio import Minio
import os

minio_client = Minio(
    endpoint=os.environ.get('MINIO_ENDPOINT', 'localhost:9000'),
    access_key=os.environ.get('MINIO_ACCESS_KEY', 'minioadmin'),
    secret_key=os.environ.get('MINIO_SECRET_KEY', 'minioadmin'),
    secure=False,
)

BUCKET = 'documents'

def download_file(storage_key: str) -> bytes:
    """Download file from MinIO and return as bytes."""
    response = minio_client.get_object(BUCKET, storage_key)
    data = response.read()
    response.close()
    response.release_conn()
    return data
```

### Database (`db.py`)

```python
import psycopg2
import json
import os
from typing import List

def get_connection():
    return psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/workspace'))

def update_document_status(document_id: str, status: str, error: str = None):
    conn = get_connection()
    cur = conn.cursor()

    if error:
        cur.execute(
            "UPDATE documents SET status = %s, metadata = jsonb_set(metadata, '{error}', %s) WHERE id = %s",
            (status, json.dumps(error), document_id)
        )
    else:
        cur.execute("UPDATE documents SET status = %s WHERE id = %s", (status, document_id))

    conn.commit()
    cur.close()
    conn.close()

def get_document_org(document_id: str) -> str:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT org_id FROM documents WHERE id = %s", (document_id,))
    org_id = cur.fetchone()[0]
    cur.close()
    conn.close()
    return org_id

def insert_chunks(document_id: str, org_id: str, chunks: List[dict], embeddings: List[List[float]]):
    conn = get_connection()
    cur = conn.cursor()

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        cur.execute(
            """INSERT INTO document_chunks (document_id, org_id, chunk_index, content, metadata, embedding)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                document_id,
                org_id,
                i,
                chunk['content'],
                json.dumps(chunk['metadata']),
                embedding,  # pgvector accepts list directly
            )
        )

    conn.commit()
    cur.close()
    conn.close()
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workspace
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

---

## Error Handling

- **Extraction failures**: Catch per-format exceptions, update document status to `failed` with error message
- **MinIO download failures**: Retry 3 times with exponential backoff
- **Database errors**: Log and re-raise (message will be requeued)
- **Unknown file type**: Fail immediately with descriptive error

---

## Implementation Order

1. **Project setup**: Python package, requirements.txt
2. **Consumer**: RabbitMQ connection, basic message handling
3. **Storage**: MinIO download
4. **Extractors**: PDF, PPTX, XLSX extraction
5. **Chunker**: 512-token chunking with overlap
6. **Embedder**: Mock embeddings (random vectors)
7. **Database**: Insert chunks, update status
8. **Processor**: Orchestrate full pipeline
9. **Error handling**: Status updates, retry logic
10. **Dockerfile**: Container for deployment

---

## Dependencies on Other Services

| Dependency | From | Used For |
|------------|------|----------|
| RabbitMQ | Infrastructure | Consuming document processing jobs |
| PostgreSQL | Infrastructure | Storing chunks and embeddings |
| MinIO | Infrastructure | Downloading uploaded files |
| API | RabbitMQ | API publishes jobs for worker to consume |
