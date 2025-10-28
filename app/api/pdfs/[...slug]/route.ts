import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

const PDF_BASE_PATH = path.join(process.cwd(), 'pdfs');

export async function GET(
  _request: Request,
  context: { params: { slug?: string[] } }
) {
  const slugParts = context.params.slug || [];

  if (!slugParts.length) {
    return NextResponse.json({ message: 'File not specified' }, { status: 400 });
  }

  const relativePath = slugParts.join('/');
  if (!relativePath.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ message: 'Unsupported file type' }, { status: 400 });
  }

  const absolutePath = path.normalize(path.join(PDF_BASE_PATH, relativePath));
  if (!absolutePath.startsWith(PDF_BASE_PATH)) {
    return NextResponse.json({ message: 'Invalid file path' }, { status: 400 });
  }

  try {
    await stat(absolutePath);
  } catch {
    return NextResponse.json({ message: 'File not found' }, { status: 404 });
  }

  try {
    const nodeStream = createReadStream(absolutePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(path.basename(absolutePath))}"`
      }
    });
  } catch (error) {
    console.error('Failed to stream pdf', error);
    return NextResponse.json({ message: 'Unable to read file' }, { status: 500 });
  }
}
