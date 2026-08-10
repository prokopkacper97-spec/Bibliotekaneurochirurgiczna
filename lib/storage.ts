import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

function pdfPath(id: string) {
  return `books/${id}.pdf`;
}

function coverPath(id: string) {
  return `covers/${id}.png`;
}

function brainPath(id: string) {
  return `brains/${id}.png`;
}

const bucket = () => supabase.storage.from(STORAGE_BUCKET);

export const storage = {
  async savePdf(id: string, data: Buffer) {
    const { error } = await bucket().upload(pdfPath(id), data, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) throw error;
  },
  async readPdf(id: string): Promise<Buffer> {
    const { data, error } = await bucket().download(pdfPath(id));
    if (error || !data) throw error ?? new Error(`PDF not found: ${id}`);
    return Buffer.from(await data.arrayBuffer());
  },
  async deletePdf(id: string) {
    await bucket().remove([pdfPath(id)]);
  },
  /**
   * A temporary URL the browser can load the PDF from directly, bypassing
   * our Vercel function entirely — needed because that function would
   * otherwise have to buffer the whole file in memory before responding,
   * which is far too slow (and unreliable) for 50-150MB textbooks.
   */
  async getPdfSignedUrl(id: string, downloadFileName?: string): Promise<string> {
    const { data, error } = await bucket().createSignedUrl(
      pdfPath(id),
      3600,
      downloadFileName ? { download: downloadFileName } : undefined
    );
    if (error || !data) throw error ?? new Error(`Could not sign URL for PDF: ${id}`);
    return data.signedUrl;
  },
  async saveCover(id: string, data: Buffer) {
    const { error } = await bucket().upload(coverPath(id), data, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) throw error;
  },
  async readCover(id: string): Promise<Buffer | null> {
    const { data, error } = await bucket().download(coverPath(id));
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  },
  async deleteCover(id: string) {
    await bucket().remove([coverPath(id)]);
  },
  async saveBrain(id: string, data: Buffer) {
    const { error } = await bucket().upload(brainPath(id), data, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) throw error;
  },
  async readBrain(id: string): Promise<Buffer | null> {
    const { data, error } = await bucket().download(brainPath(id));
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  },
};
