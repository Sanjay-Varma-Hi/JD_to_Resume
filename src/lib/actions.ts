"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginWithPassword(prevState: any, formData: FormData) {
  const password = formData.get("password") as string;
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return { error: "SITE_PASSWORD environment variable is not set." };
  }

  if (password === sitePassword) {
    const cookieStore = await cookies();
    cookieStore.set("auth_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    
    redirect("/dashboard");
  } else {
    return { error: "Invalid password" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
  redirect("/");
}
