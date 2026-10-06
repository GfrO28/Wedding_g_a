"use server";

import { redirect } from "next/navigation";
import { checkPassword, createAdminSession } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!checkPassword(password)) {
    redirect("/admin?error=1");
  }

  await createAdminSession();
  redirect("/admin/dashboard");
}
