import { Suspense } from "react";
import LiquidGlassCarousel from "@/components/LiquidGlassCarousel";

async function CategoryCarousel({
  params,
}: {
  params: Promise<{ workCategory: string }>;
}) {
  const { workCategory } = await params;
  const categoryTitle = workCategory
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <LiquidGlassCarousel className="h-full" categoryTitle={categoryTitle} />
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ workCategory: string }>;
}) {
  return (
    <main className="h-svh w-full overflow-hidden bg-white">
      <Suspense fallback={<div className="h-full w-full bg-white" />}>
        <CategoryCarousel params={params} />
      </Suspense>
    </main>
  );
}
