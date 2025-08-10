export const FEATURES_ORDER = [
  "worst_radius",
  "worst_texture",
  "worst_perimeter",
  "worst_area",
  "worst_smoothness",
  "mean_radius",
  "mean_texture",
  "mean_perimeter",
  "mean_area",
  "mean_concave_points"
] as const;

// Metadados para exibir no formulário
export const FEATURES_META: {
  key: (typeof FEATURES_ORDER)[number];
  label: string;
  hint?: string;
}[] = [
  { key: "worst_radius", label: "Maior Raio (Worst Radius)", hint: "ex: 16.1" },
  { key: "worst_texture", label: "Maior Textura (Worst Texture)", hint: "ex: 25.4" },
  { key: "worst_perimeter", label: "Maior Perímetro (Worst Perimeter)", hint: "ex: 107.2" },
  { key: "worst_area", label: "Maior Área (Worst Area)", hint: "ex: 880.7" },
  { key: "worst_smoothness", label: "Maior Suavidade (Worst Smoothness)", hint: "ex: 0.131" },
  { key: "mean_radius", label: "Raio Médio (Mean Radius)", hint: "ex: 14.2" },
  { key: "mean_texture", label: "Textura Média (Mean Texture)", hint: "ex: 18.3" },
  { key: "mean_perimeter", label: "Perímetro Médio (Mean Perimeter)", hint: "ex: 92.4" },
  { key: "mean_area", label: "Área Média (Mean Area)", hint: "ex: 654.4" },
  { key: "mean_concave_points", label: "Pontos Côncavos Médios (Mean Concave Points)", hint: "ex: 0.181" }
];
