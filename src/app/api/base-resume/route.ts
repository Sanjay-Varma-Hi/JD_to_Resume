import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BaseResume from "@/models/BaseResume";

export async function GET() {
  try {
    await dbConnect();
    const baseResume = await BaseResume.findOne().sort({ updatedAt: -1 });
    
    return NextResponse.json({ baseResume: baseResume || null }, { status: 200 });
  } catch (error) {
    console.error("Error fetching base resume:", error);
    return NextResponse.json({ error: "Failed to fetch base resume" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { content, fileData, fileName, fileType } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    // Upsert the single base resume document
    let baseResume = await BaseResume.findOne();
    if (baseResume) {
      baseResume.content = content;
      if (fileData !== undefined) baseResume.fileData = fileData;
      if (fileName !== undefined) baseResume.fileName = fileName;
      if (fileType !== undefined) baseResume.fileType = fileType;
      baseResume.updatedAt = new Date();
      await baseResume.save();
    } else {
      baseResume = await BaseResume.create({ content, fileData, fileName, fileType });
    }

    return NextResponse.json({ success: true, baseResume }, { status: 200 });
  } catch (error) {
    console.error("Error saving base resume:", error);
    return NextResponse.json({ error: "Failed to save base resume" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    await BaseResume.deleteMany({}); // Delete the single base resume
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting base resume:", error);
    return NextResponse.json({ error: "Failed to delete base resume" }, { status: 500 });
  }
}

