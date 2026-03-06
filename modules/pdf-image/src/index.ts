/*
  JS bridge for the PdfImage Expo native module.
  Provides PDF-to-image conversion: open, generate single/all pages, close.
*/

import { requireNativeModule } from 'expo-modules-core';

const NativeModule = requireNativeModule('PdfImage');

const DEFAULT_SCALE = 1.0;

const clampScale = (scale?: number): number => {
  const s = scale ?? DEFAULT_SCALE;
  return Math.min(Math.max(s, 0.1), 10.0);
};

export type PageImage = {
  uri: string;
  width: number;
  height: number;
};

export type PdfInfo = {
  uri: string;
  pageCount: number;
};

export default class PdfImage {
  static async open(uri: string): Promise<PdfInfo> {
    return NativeModule.openPdf(uri);
  }

  static async generate(
    uri: string,
    page: number,
    scale?: number
  ): Promise<PageImage> {
    return NativeModule.generate(uri, page, clampScale(scale));
  }

  static async generateAllPages(
    uri: string,
    scale?: number
  ): Promise<PageImage[]> {
    return NativeModule.generateAllPages(uri, clampScale(scale));
  }

  static async close(uri: string): Promise<void> {
    return NativeModule.closePdf(uri);
  }
}
