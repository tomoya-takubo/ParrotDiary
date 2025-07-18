import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 再帰的にディレクトリ内の全ファイルを取得する関数
 * @param dirPath 探索対象のディレクトリパス
 * @param arrayOfFiles ファイルパスを格納する配列（再帰用）
 * @returns 全ファイルパスの配列
 */
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

/**
 * パロット画像ファイル一覧を取得するGET API
 * public/imagesディレクトリから全てのGIFファイルを探索し、
 * フロントエンドで使用できる形式で返す
 * @returns パロット画像データの配列（src, alt）
 */
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