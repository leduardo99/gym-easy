import seed from "./catalog/exercises.json";
import type { TrainingLevel } from "./domain";
import { LEVEL_VALUES } from "./domain";

/**
 * Catálogo LED-32, versão 2026-10-14.
 * Chaves, slugs e enums ficam em inglês. O nome exibido fica em português.
 * A ordem de substituição de `bench_dip` segue a revisão da LED-32:
 * pegada neutra, paralelas para peito, supino fechado.
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
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
  "smith",
  "accessory",
] as const;

export const MOVEMENT_PATTERNS = [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hip_hinge",
  "lunge",
  "core",
  "isolation",
  "carry",
] as const;

export const MUSCLES = [
  "pectoralis",
  "latissimus",
  "rhomboids",
  "upper_trapezius",
  "middle_trapezius",
  "erector_spinae",
  "anterior_deltoid",
  "lateral_deltoid",
  "posterior_deltoid",
  "rotator_cuff",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "glutes",
  "gluteus_medius",
  "adductors",
  "hip_flexors",
  "calves",
  "soleus",
  "abdominals",
  "obliques",
] as const;

export const BODY_REGIONS = [
  "shoulder",
  "elbow",
  "wrist",
  "neck",
  "lumbar_spine",
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
  cable: "Cabo",
  bodyweight: "Peso corporal",
  kettlebell: "Kettlebell",
  band: "Elástico",
  other: "Outro",
  smith: "Smith",
  accessory: "Acessório",
} as const satisfies Record<Equipment, string>;

export const MOVEMENT_PATTERN_LABELS = {
  horizontal_push: "Empurrar horizontal",
  vertical_push: "Empurrar vertical",
  horizontal_pull: "Puxar horizontal",
  vertical_pull: "Puxar vertical",
  squat: "Agachamento",
  hip_hinge: "Dobradiça de quadril",
  lunge: "Avanço",
  core: "Core",
  isolation: "Isolamento",
  carry: "Carregamento",
} as const satisfies Record<MovementPattern, string>;

export const MUSCLE_LABELS = {
  pectoralis: "Peitoral",
  latissimus: "Latíssimo",
  rhomboids: "Romboides",
  upper_trapezius: "Trapézio superior",
  middle_trapezius: "Trapézio médio",
  erector_spinae: "Eretores da espinha",
  anterior_deltoid: "Deltoide anterior",
  lateral_deltoid: "Deltoide lateral",
  posterior_deltoid: "Deltoide posterior",
  rotator_cuff: "Manguito rotador",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraço",
  quadriceps: "Quadríceps",
  hamstrings: "Isquiotibiais",
  glutes: "Glúteos",
  gluteus_medius: "Glúteo médio",
  adductors: "Adutores",
  hip_flexors: "Flexores do quadril",
  calves: "Panturrilha",
  soleus: "Sóleo",
  abdominals: "Abdômen",
  obliques: "Oblíquos",
} as const satisfies Record<Muscle, string>;

export const BODY_REGION_LABELS = {
  shoulder: "Ombro",
  elbow: "Cotovelo",
  wrist: "Punho",
  neck: "Pescoço",
  lumbar_spine: "Coluna lombar",
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
  pectoralis: "chest",
  latissimus: "back",
  rhomboids: "back",
  upper_trapezius: "back",
  middle_trapezius: "back",
  erector_spinae: "back",
  anterior_deltoid: "shoulders",
  lateral_deltoid: "shoulders",
  posterior_deltoid: "shoulders",
  rotator_cuff: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  quadriceps: "quadriceps",
  hamstrings: "hamstrings",
  glutes: "glutes",
  gluteus_medius: "glutes",
  adductors: "glutes",
  hip_flexors: "abs",
  calves: "calves",
  soleus: "calves",
  abdominals: "abs",
  obliques: "abs",
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
    const primaryMuscles = enumList(MUSCLES, item.primaryMuscles, "muscle");
    const primary = primaryMuscles[0];
    if (primary === undefined) {
      throw new Error(`Catálogo inválido: ${item.slug} sem músculo primário.`);
    }
    return {
      slug: item.slug,
      name: item.name,
      muscleGroup: COARSE_MUSCLE_GROUP[primary],
      equipment: enumValue(EQUIPMENT, item.equipment, "equipment"),
      movementPattern: enumValue(
        MOVEMENT_PATTERNS,
        item.movementPattern,
        "movementPattern",
      ),
      primaryMuscles,
      secondaryMuscles: enumList(
        MUSCLES,
        item.secondaryMuscles,
        "secondaryMuscle",
      ),
      level: enumValue(LEVEL_VALUES, item.level, "level"),
      contraindicatedRegions: enumList(
        BODY_REGIONS,
        item.contraindicatedRegions,
        "region",
      ),
      unilateral: item.unilateral,
      defaultRepsMin: item.defaultRepsMin,
      defaultRepsMax: item.defaultRepsMax,
      substitutions: [...item.substitutions],
    };
  },
);
