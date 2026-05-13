import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import GeneratedResume from "@/models/GeneratedResume";

export async function GET() {
  try {
    await dbConnect();
    const history = await GeneratedResume.find({}, "-resumeJson")
      .sort({ createdAt: -1 })
      .limit(50);
      
    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
