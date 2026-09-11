"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return <main className="flex min-h-svh items-center justify-center p-6"><p role="status" className="text-sm text-muted-foreground">Membuka halaman login…</p></main>;
}
