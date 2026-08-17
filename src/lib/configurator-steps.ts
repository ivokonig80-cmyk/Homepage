export type ConfiguratorStepId =
  | "upload"
  | "vorschau"
  | "farbe"
  | "sockel"
  | "platzierung"
  | "checkout";

export interface ConfiguratorStepMeta {
  id: ConfiguratorStepId;
  label: string;
}

export const CONFIGURATOR_STEPS: ConfiguratorStepMeta[] = [
  { id: "upload", label: "Foto" },
  { id: "vorschau", label: "3D-Vorschau" },
  { id: "farbe", label: "Farbe" },
  { id: "sockel", label: "Sockel & Größe" },
  { id: "platzierung", label: "Bei dir zuhause" },
  { id: "checkout", label: "Bestellen" },
];
