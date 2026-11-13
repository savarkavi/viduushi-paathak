import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PORTFOLIO_ITEMS } from "@/data/portfolio";
import ProjectImagesCarousel from "@/components/ProjectImagesCarousel";

type ProjectPageProps = {
  params: Promise<{ workCategory: string; projectSlug: string }>;
};

async function ProjectCarouselContent({ params }: ProjectPageProps) {
  const { workCategory, projectSlug } = await params;

  const project = PORTFOLIO_ITEMS.find(
    (item) =>
      item.category.toLowerCase() === workCategory.toLowerCase() &&
      item.slug === projectSlug,
  );

  if (!project) {
    notFound();
  }

  return (
    <ProjectImagesCarousel
      initialImage={project.source}
      initialAspect={3 / 4}
    />
  );
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <main className="h-svh w-full overflow-hidden bg-white">
      <Suspense fallback={<div className="h-full w-full bg-white" />}>
        <ProjectCarouselContent params={params} />
      </Suspense>
    </main>
  );
}
