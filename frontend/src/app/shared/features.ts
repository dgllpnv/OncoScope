export const FEATURES_ORDER = [
  "mean radius","mean texture","mean perimeter","mean area","mean smoothness",
  "mean compactness","mean concavity","mean concave points","mean symmetry",
  "mean fractal dimension","radius error","texture error","perimeter error",
  "area error","smoothness error","compactness error","concavity error",
  "concave points error","symmetry error","fractal dimension error","worst radius",
  "worst texture","worst perimeter","worst area","worst smoothness",
  "worst compactness","worst concavity","worst concave points",
  "worst symmetry","worst fractal dimension"
] as const;

type Group = 'Médias' | 'Erro (SE)' | 'Pior (worst)';

export const FEATURES_META: { key: (typeof FEATURES_ORDER)[number]; label: string; group: Group; hint?: string }[] = [
  // Médias
  { key: "mean radius", label: "Raio (média)", group: "Médias" },
  { key: "mean texture", label: "Textura (média)", group: "Médias" },
  { key: "mean perimeter", label: "Perímetro (média)", group: "Médias" },
  { key: "mean area", label: "Área (média)", group: "Médias" },
  { key: "mean smoothness", label: "Suavidade (média)", group: "Médias" },
  { key: "mean compactness", label: "Compacidade (média)", group: "Médias" },
  { key: "mean concavity", label: "Concavidade (média)", group: "Médias" },
  { key: "mean concave points", label: "Pontos côncavos (média)", group: "Médias" },
  { key: "mean symmetry", label: "Simetria (média)", group: "Médias" },
  { key: "mean fractal dimension", label: "Dimensão fractal (média)", group: "Médias" },

  // Erro (SE)
  { key: "radius error", label: "Raio (erro)", group: "Erro (SE)" },
  { key: "texture error", label: "Textura (erro)", group: "Erro (SE)" },
  { key: "perimeter error", label: "Perímetro (erro)", group: "Erro (SE)" },
  { key: "area error", label: "Área (erro)", group: "Erro (SE)" },
  { key: "smoothness error", label: "Suavidade (erro)", group: "Erro (SE)" },
  { key: "compactness error", label: "Compacidade (erro)", group: "Erro (SE)" },
  { key: "concavity error", label: "Concavidade (erro)", group: "Erro (SE)" },
  { key: "concave points error", label: "Pontos côncavos (erro)", group: "Erro (SE)" },
  { key: "symmetry error", label: "Simetria (erro)", group: "Erro (SE)" },
  { key: "fractal dimension error", label: "Dimensão fractal (erro)", group: "Erro (SE)" },

  // Pior (worst)
  { key: "worst radius", label: "Raio (pior)", group: "Pior (worst)" },
  { key: "worst texture", label: "Textura (pior)", group: "Pior (worst)" },
  { key: "worst perimeter", label: "Perímetro (pior)", group: "Pior (worst)" },
  { key: "worst area", label: "Área (pior)", group: "Pior (worst)" },
  { key: "worst smoothness", label: "Suavidade (pior)", group: "Pior (worst)" },
  { key: "worst compactness", label: "Compacidade (pior)", group: "Pior (worst)" },
  { key: "worst concavity", label: "Concavidade (pior)", group: "Pior (worst)" },
  { key: "worst concave points", label: "Pontos côncavos (pior)", group: "Pior (worst)" },
  { key: "worst symmetry", label: "Simetria (pior)", group: "Pior (worst)" },
  { key: "worst fractal dimension", label: "Dimensão fractal (pior)", group: "Pior (worst)" },
];
