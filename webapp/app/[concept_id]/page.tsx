import { Metadata } from "next";
import ConceptPageClient from "./ConceptPageClient";

type Props = {
  params: Promise<{ concept_id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { concept_id } = await params;

  return {
    title: concept_id,
  };
}

export default async function ConceptPage({ params }: Props) {
  const { concept_id } = await params;

  return <ConceptPageClient conceptId={concept_id} />;
}
