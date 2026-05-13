import { NextResponse } from "next/server";
// Polyfills for pdf-parse in Node.js environment
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {
    constructor() {}
  };
}
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {
    constructor() {}
  };
}

const pdfParse = require("pdf-parse");
import * as mammoth from "mammoth";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or DOCX." }, { status: 400 });
    }

    const fileData = buffer.toString("base64");

    return NextResponse.json({ 
      text: extractedText,
      fileData: fileData,
      fileName: file.name,
      fileType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }, { status: 200 });
  } catch (error) {
    console.error("Error extracting text:", error);
    return NextResponse.json({ error: "Failed to extract text from file" }, { status: 500 });
  }
}
