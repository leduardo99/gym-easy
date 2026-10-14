import seed from "./seed/exercises.v2.json";
import type { TrainingLevel } from "./domain";
import { LEVEL_VALUES } from "./domain";

/**
 * Catálogo LED-32, versão 2026-10-14.v2.
 * O JSON oficial é a fonte única. Ids em português são os slugs estáveis.
 * Enums ficam em inglês. O nome exibido fica em `name_pt`.
 */

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
  "smith_machine",
  "cable",
  "bodyweight",
  "resistance_band",
  "kettlebell",
  "accessory",
] as const;

export const MOVEMENT_PATTERNS = [
  "squat",
  "hip_hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "core",
  "isolation",
  "carry",
] as const;

export const MUSCLES = [
  "chest",
  "triceps",
  "biceps",
  "forearms",
  "front_delts",
  "side_delts",
  "rear_delts",
  "rotator_cuff",
  "lats",
  "rhomboids",
  "mid_traps",
  "upper_traps",
  "spinal_erectors",
  "abs",
  "obliques",
  "hip_flexors",
  "glutes",
  "glute_medius",
  "adductors",
  "quadriceps",
  "hamstrings",
  "calves",
  "soleus",
] as const;

export const BODY_REGIONS = [
  "shoulder",
  "elbow",
  "wrist",
  "neck",
  "lower_back",
  "hip",
  "knee",
  "ankle",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];
export type Muscle = (typeof MUSCLES)[number];
export type BodyRegion = (typeof BODY_REGIONS)[number];

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
  smith_machine: "Smith",
  cable: "Cabo",
  bodyweight: "Peso corporal",
  resistance_band: "Elástico",
  kettlebell: "Kettlebell",
  accessory: "Acessório",
} as const satisfies Record<Equipment, string>;

export const MOVEMENT_PATTERN_LABELS = {
  squat: "Agachamento",
  hip_hinge: "Dobradiça de quadril",
  lunge: "Avanço",
  horizontal_push: "Empurrar horizontal",
  vertical_push: "Empurrar vertical",
  horizontal_pull: "Puxar horizontal",
  vertical_pull: "Puxar vertical",
  core: "Core",
  isolation: "Isolamento",
  carry: "Carregamento",
} as const satisfies Record<MovementPattern, string>;

export const MUSCLE_LABELS = {
  chest: "Peitoral",
  triceps: "Tríceps",
  biceps: "Bíceps",
  forearms: "Antebraço",
  front_delts: "Deltoide anterior",
  side_delts: "Deltoide lateral",
  rear_delts: "Deltoide posterior",
  rotator_cuff: "Manguito rotador",
  lats: "Latíssimo",
  rhomboids: "Romboides",
  mid_traps: "Trapézio médio",
  upper_traps: "Trapézio superior",
  spinal_erectors: "Eretores da espinha",
  abs: "Abdômen",
  obliques: "Oblíquos",
  hip_flexors: "Flexores do quadril",
  glutes: "Glúteos",
  glute_medius: "Glúteo médio",
  adductors: "Adutores",
  quadriceps: "Quadríceps",
  hamstrings: "Isquiotibiais",
  calves: "Panturrilha",
  soleus: "Sóleo",
} as const satisfies Record<Muscle, string>;

export const BODY_REGION_LABELS = {
  shoulder: "Ombro",
  elbow: "Cotovelo",
  wrist: "Punho",
  neck: "Pescoço",
  lower_back: "Coluna lombar",
  hip: "Quadril",
  knee: "Joelho",
  ankle: "Tornozelo",
} as const satisfies Record<BodyRegion, string>;

export const LEVEL_LABELS = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
} as const satisfies Record<TrainingLevel, string>;

/** Grupo amplo usado no filtro da biblioteca, a partir do primeiro músculo primário. */
const COARSE_MUSCLE_GROUP = {
  chest: "chest",
  triceps: "triceps",
  biceps: "biceps",
  forearms: "forearms",
  front_delts: "shoulders",
  side_delts: "shoulders",
  rear_delts: "shoulders",
  rotator_cuff: "shoulders",
  lats: "back",
  rhomboids: "back",
  mid_traps: "back",
  upper_traps: "back",
  spinal_erectors: "back",
  abs: "abs",
  obliques: "abs",
  hip_flexors: "abs",
  glutes: "glutes",
  glute_medius: "glutes",
  adductors: "glutes",
  quadriceps: "quadriceps",
  hamstrings: "hamstrings",
  calves: "calves",
  soleus: "calves",
} as const satisfies Record<Muscle, MuscleGroup>;

export type CatalogExercise = {
  slug: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  movementPattern: MovementPattern;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  level: TrainingLevel;
  contraindicatedRegions: BodyRegion[];
  unilateral: boolean;
  defaultRepsMin: number;
  defaultRepsMax: number;
  substitutions: string[];
};

export const CATALOG_VERSION = seed.version;

function enumValue<T extends string>(
  values: readonly T[],
  value: string,
  field: string,
): T {
  const match = values.find((item) => item === value);
  if (match === undefined) {
    throw new Error(`Catálogo inválido: ${field} "${value}".`);
  }
  return match;
}

function enumList<T extends string>(
  values: readonly T[],
  items: readonly string[],
  field: string,
): T[] {
  return items.map((item) => enumValue(values, item, field));
}

export const CATALOG_EXERCISES: readonly CatalogExercise[] = seed.exercises.map(
  (item) => {
    const primaryMuscles = enumList(MUSCLES, item.primary_muscles, "muscle");
    const primary = primaryMuscles[0];
    if (primary === undefined) {
      throw new Error(`Catálogo inválido: ${item.id} sem músculo primário.`);
    }
    const [defaultRepsMin, defaultRepsMax] = item.default_rep_range;
    if (defaultRepsMin === undefined || defaultRepsMax === undefined) {
      throw new Error(`Catálogo inválido: ${item.id} sem faixa de repetições.`);
    }
    return {
      slug: item.id,
      name: item.name_pt,
      muscleGroup: COARSE_MUSCLE_GROUP[primary],
      equipment: enumValue(EQUIPMENT, item.equipment, "equipment"),
      movementPattern: enumValue(
        MOVEMENT_PATTERNS,
        item.movement_pattern,
        "movementPattern",
      ),
      primaryMuscles,
      secondaryMuscles: enumList(
        MUSCLES,
        item.secondary_muscles,
        "secondaryMuscle",
      ),
      level: enumValue(LEVEL_VALUES, item.level, "level"),
      contraindicatedRegions: enumList(
        BODY_REGIONS,
        item.contraindicated_regions,
        "region",
      ),
      unilateral: item.unilateral,
      defaultRepsMin,
      defaultRepsMax,
      substitutions: [...item.substitutions],
    };
  },
);
