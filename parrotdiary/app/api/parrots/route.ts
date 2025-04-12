import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 再帰的にファイルを探索する関数
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

export async function GET() {
  const parrotsDir = path.join(process.cwd(), 'public/images');
  const allFiles = getAllFiles(parrotsDir);
  
  const gifFiles = allFiles
    .filter(file => file.endsWith('.gif'))
    .map(file => {
      // public/imagesからの相対パスに変換
      const relativePath = path.relative(parrotsDir, file);
      return {
        src: `/images/${relativePath.replace(/\\/g, '/')}`,  // Windowsのパス区切り文字を/に変換
        alt: path.basename(file, '.gif').replace(/([A-Z])/g, ' $1').trim()
      };
    });

  return NextResponse.json(gifFiles);
}