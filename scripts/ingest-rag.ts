/**
 * RAG Corpus Ingest Script — BA §2.5.1 & §3.4
 *
 * Reads PDF files from ./corpus/ directory,
 * chunks them into passages, creates embeddings,
 * and uploads to ChromaDB.
 *
 * Run: npx tsx scripts/ingest-rag.ts
 *
 * Expected corpus structure:
 *   corpus/
 *     thong-tu-06-2026.pdf         (Thông tư 06/2026/TT-BGDĐT)
 *     vinuni-de-an-tuyen-sinh-2026.pdf
 *     hust-de-an-tuyen-sinh-2026.pdf
 *     usth-de-an-tuyen-sinh-2026.pdf
 *     vju-de-an-tuyen-sinh-2026.pdf
 *     fpt-de-an-tuyen-sinh-2026.pdf
 *     swinburne-de-an-tuyen-sinh-2026.pdf
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import fs from 'fs'
import path from 'path'
import { ChromaClient } from 'chromadb'

const COLLECTION_NAME = 'green_stem_corpus'
const CORPUS_DIR = path.join(process.cwd(), 'corpus')
const CHUNK_SIZE = 800   // chars per chunk
const CHUNK_OVERLAP = 100

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    chunks.push(text.slice(start, end))
    start += size - overlap
  }
  return chunks
}

async function parsePdf(filePath: string): Promise<string> {
  // Dynamic import to avoid requiring pdf-parse at module load
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)
  return data.text
}

function extractDocMeta(filename: string): { source: string; date: string } {
  const META: Record<string, { source: string; date: string }> = {
    'thong-tu-06-2026': { source: 'Thông tư 06/2026/TT-BGDĐT', date: '2026-01-01' },
    'vinuni-de-an': { source: 'Đề án tuyển sinh VinUni 2026', date: '2026-01-15' },
    'hust-de-an': { source: 'Đề án tuyển sinh HUST 2026', date: '2026-02-01' },
    'usth-de-an': { source: 'Đề án tuyển sinh USTH 2026', date: '2026-02-01' },
    'vju-de-an': { source: 'Đề án tuyển sinh VJU 2026', date: '2026-02-01' },
    'fpt-de-an': { source: 'Đề án tuyển sinh FPT 2026', date: '2026-02-01' },
    'swinburne-de-an': { source: 'Đề án tuyển sinh Swinburne 2026', date: '2026-02-01' },
  }

  const key = Object.keys(META).find((k) => filename.includes(k))
  return key ? META[key] : { source: filename, date: '2026-01-01' }
}

async function main() {
  console.log('🔍 RAG Corpus Ingest — Green STEM Compass')
  console.log(`   Corpus dir: ${CORPUS_DIR}`)

  if (!fs.existsSync(CORPUS_DIR)) {
    console.error(`❌ corpus/ directory not found at ${CORPUS_DIR}`)
    console.error('   Create it and add PDF files before running ingest.')
    process.exit(1)
  }

  const pdfFiles = fs.readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.pdf'))
  if (pdfFiles.length === 0) {
    console.error('❌ No PDF files found in corpus/')
    process.exit(1)
  }

  console.log(`   Found ${pdfFiles.length} PDF(s): ${pdfFiles.join(', ')}`)

  // Connect to ChromaDB
  const chroma = new ChromaClient({
    path: process.env.CHROMA_URL ?? 'http://localhost:8000',
  })

  // Delete and recreate collection (full re-ingest)
  try {
    await chroma.deleteCollection({ name: COLLECTION_NAME })
    console.log('   ✓ Old collection deleted')
  } catch {
    console.log('   — No existing collection to delete')
  }

  const collection = await chroma.createCollection({
    name: COLLECTION_NAME,
    metadata: { description: 'Green STEM Compass — tuyển sinh corpus' },
  })
  console.log('   ✓ New collection created')

  let totalChunks = 0

  for (const filename of pdfFiles) {
    const filePath = path.join(CORPUS_DIR, filename)
    const meta = extractDocMeta(filename)

    console.log(`\n   📄 Processing: ${filename}`)
    console.log(`      Source: ${meta.source}`)

    let text: string
    try {
      text = await parsePdf(filePath)
      console.log(`      Extracted ${text.length} chars`)
    } catch (err) {
      console.error(`      ❌ Failed to parse PDF: ${err}`)
      continue
    }

    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP)
    console.log(`      Split into ${chunks.length} chunks`)

    // Upload in batches of 50
    const BATCH_SIZE = 50
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const ids = batch.map((_, j) => `${filename}-chunk-${i + j}`)
      const metadatas = batch.map((_, j) => ({
        source: meta.source,
        page: String(Math.floor((i + j) / 3) + 1), // rough page estimate
        date: meta.date,
        filename,
        chunk_index: i + j,
      }))

      await collection.add({
        ids,
        documents: batch,
        metadatas,
      })
    }

    totalChunks += chunks.length
    console.log(`      ✓ ${chunks.length} chunks uploaded`)
  }

  console.log(`\n✅ Ingest complete! Total: ${totalChunks} chunks across ${pdfFiles.length} documents.`)
  console.log(`   Collection: ${COLLECTION_NAME}`)
  console.log(`   Update RAG_DATA_FRESHNESS_DATE in .env.local to today's date.`)
}

main().catch((err) => {
  console.error('❌ Ingest failed:', err)
  process.exit(1)
})
