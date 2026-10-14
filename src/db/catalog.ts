export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "full_body",
  "cardio",
] as const;

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

export const MUSCLE_GROUP_LABELS = {
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraço",
  quadriceps: "Quadríceps",
  hamstrings: "Posterior",
  glutes: "Glúteos",
  calves: "Panturrilha",
  abs: "Abdômen",
  full_body: "Corpo inteiro",
  cardio: "Cardio",
} as const satisfies Record<MuscleGroup, string>;

export const EQUIPMENT_LABELS = {
  barbell: "Barra",
  dumbbell: "Halteres",
  machine: "Máquina",
  cable: "Cabo",
  bodyweight: "Peso corporal",
  kettlebell: "Kettlebell",
  band: "Elástico",
  other: "Outro",
} as const satisfies Record<Equipment, string>;

export type CatalogExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
};

export const CATALOG_EXERCISES = [
  { name: "Supino reto (barra)", muscleGroup: "chest", equipment: "barbell" },
  {
    name: "Supino inclinado (barra)",
    muscleGroup: "chest",
    equipment: "barbell",
  },
  {
    name: "Supino declinado (barra)",
    muscleGroup: "chest",
    equipment: "barbell",
  },
  {
    name: "Supino reto (halteres)",
    muscleGroup: "chest",
    equipment: "dumbbell",
  },
  {
    name: "Supino inclinado (halteres)",
    muscleGroup: "chest",
    equipment: "dumbbell",
  },
  { name: "Crucifixo (halteres)", muscleGroup: "chest", equipment: "dumbbell" },
  {
    name: "Crucifixo inclinado (halteres)",
    muscleGroup: "chest",
    equipment: "dumbbell",
  },
  {
    name: "Supino máquina (máquina)",
    muscleGroup: "chest",
    equipment: "machine",
  },
  { name: "Crossover (cabo)", muscleGroup: "chest", equipment: "cable" },
  {
    name: "Flexão de braços (peso corporal)",
    muscleGroup: "chest",
    equipment: "bodyweight",
  },
  { name: "Puxada frontal (cabo)", muscleGroup: "back", equipment: "cable" },
  { name: "Remada curvada (barra)", muscleGroup: "back", equipment: "barbell" },
  {
    name: "Remada cavalinho (barra)",
    muscleGroup: "back",
    equipment: "barbell",
  },
  {
    name: "Remada unilateral (halter)",
    muscleGroup: "back",
    equipment: "dumbbell",
  },
  { name: "Remada sentada (cabo)", muscleGroup: "back", equipment: "cable" },
  { name: "Remada baixa (máquina)", muscleGroup: "back", equipment: "machine" },
  {
    name: "Barra fixa (peso corporal)",
    muscleGroup: "back",
    equipment: "bodyweight",
  },
  { name: "Pullover (halter)", muscleGroup: "back", equipment: "dumbbell" },
  {
    name: "Remada elástica (elástico)",
    muscleGroup: "back",
    equipment: "band",
  },
  { name: "Pulldown (máquina)", muscleGroup: "back", equipment: "machine" },
  {
    name: "Desenvolvimento militar (barra)",
    muscleGroup: "shoulders",
    equipment: "barbell",
  },
  {
    name: "Desenvolvimento (halteres)",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
  },
  {
    name: "Desenvolvimento (máquina)",
    muscleGroup: "shoulders",
    equipment: "machine",
  },
  {
    name: "Elevação lateral (halteres)",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
  },
  {
    name: "Elevação frontal (halteres)",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
  },
  {
    name: "Elevação lateral (cabo)",
    muscleGroup: "shoulders",
    equipment: "cable",
  },
  {
    name: "Remada alta (barra)",
    muscleGroup: "shoulders",
    equipment: "barbell",
  },
  { name: "Face pull (cabo)", muscleGroup: "shoulders", equipment: "cable" },
  { name: "Rosca direta (barra)", muscleGroup: "biceps", equipment: "barbell" },
  {
    name: "Rosca direta (halteres)",
    muscleGroup: "biceps",
    equipment: "dumbbell",
  },
  {
    name: "Rosca martelo (halteres)",
    muscleGroup: "biceps",
    equipment: "dumbbell",
  },
  { name: "Rosca scott (barra)", muscleGroup: "biceps", equipment: "barbell" },
  {
    name: "Rosca scott (máquina)",
    muscleGroup: "biceps",
    equipment: "machine",
  },
  {
    name: "Rosca concentrada (halter)",
    muscleGroup: "biceps",
    equipment: "dumbbell",
  },
  { name: "Rosca cabo (cabo)", muscleGroup: "biceps", equipment: "cable" },
  {
    name: "Tríceps testa (barra)",
    muscleGroup: "triceps",
    equipment: "barbell",
  },
  {
    name: "Tríceps testa (halteres)",
    muscleGroup: "triceps",
    equipment: "dumbbell",
  },
  { name: "Tríceps corda (cabo)", muscleGroup: "triceps", equipment: "cable" },
  { name: "Tríceps pulley (cabo)", muscleGroup: "triceps", equipment: "cable" },
  {
    name: "Tríceps francês (halter)",
    muscleGroup: "triceps",
    equipment: "dumbbell",
  },
  {
    name: "Mergulho entre bancos (peso corporal)",
    muscleGroup: "triceps",
    equipment: "bodyweight",
  },
  {
    name: "Tríceps máquina (máquina)",
    muscleGroup: "triceps",
    equipment: "machine",
  },
  {
    name: "Rosca inversa (barra)",
    muscleGroup: "forearms",
    equipment: "barbell",
  },
  {
    name: "Rosca de punho (halteres)",
    muscleGroup: "forearms",
    equipment: "dumbbell",
  },
  {
    name: "Extensão de punho (halteres)",
    muscleGroup: "forearms",
    equipment: "dumbbell",
  },
  { name: "Rosca inversa (cabo)", muscleGroup: "forearms", equipment: "cable" },
  {
    name: "Agachamento livre (barra)",
    muscleGroup: "quadriceps",
    equipment: "barbell",
  },
  {
    name: "Agachamento frontal (barra)",
    muscleGroup: "quadriceps",
    equipment: "barbell",
  },
  {
    name: "Leg press (máquina)",
    muscleGroup: "quadriceps",
    equipment: "machine",
  },
  {
    name: "Cadeira extensora (máquina)",
    muscleGroup: "quadriceps",
    equipment: "machine",
  },
  {
    name: "Agachamento goblet (halter)",
    muscleGroup: "quadriceps",
    equipment: "dumbbell",
  },
  {
    name: "Afundo (halteres)",
    muscleGroup: "quadriceps",
    equipment: "dumbbell",
  },
  {
    name: "Agachamento hack (máquina)",
    muscleGroup: "quadriceps",
    equipment: "machine",
  },
  {
    name: "Agachamento elástico (elástico)",
    muscleGroup: "quadriceps",
    equipment: "band",
  },
  {
    name: "Levantamento terra romeno (barra)",
    muscleGroup: "hamstrings",
    equipment: "barbell",
  },
  {
    name: "Stiff (halteres)",
    muscleGroup: "hamstrings",
    equipment: "dumbbell",
  },
  {
    name: "Mesa flexora (máquina)",
    muscleGroup: "hamstrings",
    equipment: "machine",
  },
  {
    name: "Cadeira flexora (máquina)",
    muscleGroup: "hamstrings",
    equipment: "machine",
  },
  {
    name: "Good morning (barra)",
    muscleGroup: "hamstrings",
    equipment: "barbell",
  },
  {
    name: "Levantamento terra (barra)",
    muscleGroup: "hamstrings",
    equipment: "barbell",
  },
  { name: "Hip thrust (barra)", muscleGroup: "glutes", equipment: "barbell" },
  {
    name: "Elevação pélvica (peso corporal)",
    muscleGroup: "glutes",
    equipment: "bodyweight",
  },
  {
    name: "Abdução de quadril (máquina)",
    muscleGroup: "glutes",
    equipment: "machine",
  },
  { name: "Glúteo no cabo (cabo)", muscleGroup: "glutes", equipment: "cable" },
  {
    name: "Agachamento sumô (halter)",
    muscleGroup: "glutes",
    equipment: "dumbbell",
  },
  {
    name: "Panturrilha em pé (máquina)",
    muscleGroup: "calves",
    equipment: "machine",
  },
  {
    name: "Panturrilha sentado (máquina)",
    muscleGroup: "calves",
    equipment: "machine",
  },
  {
    name: "Panturrilha no leg press (máquina)",
    muscleGroup: "calves",
    equipment: "machine",
  },
  {
    name: "Panturrilha unilateral (peso corporal)",
    muscleGroup: "calves",
    equipment: "bodyweight",
  },
  {
    name: "Abdominal crunch (peso corporal)",
    muscleGroup: "abs",
    equipment: "bodyweight",
  },
  {
    name: "Elevação de pernas (peso corporal)",
    muscleGroup: "abs",
    equipment: "bodyweight",
  },
  {
    name: "Abdominal máquina (máquina)",
    muscleGroup: "abs",
    equipment: "machine",
  },
  { name: "Abdominal na polia (cabo)", muscleGroup: "abs", equipment: "cable" },
  {
    name: "Abdominal elástico (elástico)",
    muscleGroup: "abs",
    equipment: "band",
  },
  {
    name: "Swing (kettlebell)",
    muscleGroup: "full_body",
    equipment: "kettlebell",
  },
  { name: "Thruster (barra)", muscleGroup: "full_body", equipment: "barbell" },
  {
    name: "Agachamento com desenvolvimento (halteres)",
    muscleGroup: "full_body",
    equipment: "dumbbell",
  },
  {
    name: "Burpee (peso corporal)",
    muscleGroup: "full_body",
    equipment: "bodyweight",
  },
  {
    name: "Arranco (kettlebell)",
    muscleGroup: "full_body",
    equipment: "kettlebell",
  },
  {
    name: "Empurrar trenó (outro)",
    muscleGroup: "full_body",
    equipment: "other",
  },
  {
    name: "Polichinelo (peso corporal)",
    muscleGroup: "cardio",
    equipment: "bodyweight",
  },
  {
    name: "Mountain climber (peso corporal)",
    muscleGroup: "cardio",
    equipment: "bodyweight",
  },
  {
    name: "Bicicleta ergométrica (máquina)",
    muscleGroup: "cardio",
    equipment: "machine",
  },
  {
    name: "Remo ergométrico (máquina)",
    muscleGroup: "cardio",
    equipment: "machine",
  },
] as const satisfies readonly CatalogExercise[];
