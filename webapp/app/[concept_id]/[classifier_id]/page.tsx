import { Metadata } from "next";
import PredictionsPageClient from "./PredictionsPageClient";

type Props = {
  params: Promise<{ concept_id: string; classifier_id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { concept_id, classifier_id } = await params;

  return {
    title: `${concept_id}/${classifier_id}`,
  };
}

export default async function PredictionsPage({ params }: Props) {
  const { concept_id, classifier_id } = await params;

  return (
    <PredictionsPageClient
      conceptId={concept_id}
      classifierId={classifier_id}
    />
  );
}