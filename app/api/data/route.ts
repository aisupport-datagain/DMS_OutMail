import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'db.json');

export async function GET() {
  try {
    const file = await readFile(DATA_PATH, 'utf-8');
    const payload = JSON.parse(file);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Failed to load data file', error);
    return NextResponse.json({ message: 'Failed to load data file' }, { status: 500 });
  }
}
