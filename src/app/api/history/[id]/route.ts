import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
    
    // Also remove this resume from any Lead in the raw_posts collection
    // to ensure the Leads Dashboard stays perfectly in sync with History.
    try {
      const rawPostsCollection = mongoose.connection.db?.collection("raw_posts");
      if (rawPostsCollection) {
        // Find leads where generated_resume._id matches the deleted ID (string or ObjectId)
        // Since the API might have stored it as a string or ObjectId, we check both or just clear it if it matches
        await rawPostsCollection.updateMany(
          { "generated_resume._id": { $in: [id, new mongoose.Types.ObjectId(id)] } },
          { $unset: { "generated_resume": "" } }
        );
      }
    } catch (e) {
      console.error("Failed to sync deletion with raw_posts:", e);
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
  }
}
