import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import GeneratedResume from "@/models/GeneratedResume";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await dbConnect();
    
    const result = await GeneratedResume.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
  }
}
