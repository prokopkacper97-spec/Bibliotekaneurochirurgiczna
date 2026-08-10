import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

/**
 * Issues short-lived signed upload URLs so the browser can send the PDF
 * (and optional cover image) straight to Supabase Storage, bypassing
 * Vercel's serverless function body size limit (4.5MB) entirely.
 */
export async function POST() {
  const id = nanoid();
  const bucket = supabase.storage.from(STORAGE_BUCKET);

  const [pdfResult, coverResult] = await Promise.all([
    bucket.createSignedUploadUrl(`books/${id}.pdf`),
    bucket.createSignedUploadUrl(`covers/${id}.jpg`),
  ]);

  if (pdfResult.error || !pdfResult.data) {
    return NextResponse.json(
      { error: "Nie udało się przygotować przesyłania pliku." },
      { status: 500 }
    );
  }
  if (coverResult.error || !coverResult.data) {
    return NextResponse.json(
      { error: "Nie udało się przygotować przesyłania okładki." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id,
    pdf: {
      signedUrl: pdfResult.data.signedUrl,
      token: pdfResult.data.token,
    },
    cover: {
      signedUrl: coverResult.data.signedUrl,
      token: coverResult.data.token,
    },
  });
}
