import { notFound } from "next/navigation";
import { KonfiguratorStepView } from "@/components/configurator/KonfiguratorStepView";
import { CONFIGURATOR_STEPS, type ConfiguratorStepId } from "@/lib/configurator-steps";

export function generateStaticParams() {
  return CONFIGURATOR_STEPS.map((step) => ({ step: step.id }));
}

export default async function KonfiguratorStepPage(props: PageProps<"/konfigurator/[step]">) {
  const { step } = await props.params;
  if (!CONFIGURATOR_STEPS.some((s) => s.id === step)) notFound();

  return <KonfiguratorStepView step={step as ConfiguratorStepId} />;
}
