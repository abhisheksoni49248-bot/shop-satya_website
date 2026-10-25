"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || !email || !password) {
    redirect("/admin/login?error=missing");
  }

  if (email !== adminEmail) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/admin/login?error=invalid");
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== adminEmail) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=invalid");
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}