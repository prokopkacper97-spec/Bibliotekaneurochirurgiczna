import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

function pdfPath(id: string) {
  return `books/${id}.pdf`;
}

function coverPath(id: string) {
  return `covers/${id}.png`;
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
};
