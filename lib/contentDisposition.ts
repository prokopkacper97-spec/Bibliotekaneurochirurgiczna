export function contentDisposition(type: "inline" | "attachment", filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(filename);
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
