import type { Goal, Sex, TrainingLevel, TrainingPlace } from "@/db/domain";
import {
  GOAL_VALUES,
  LEVEL_VALUES,
  SESSION_MINUTE_VALUES,
  SEX_VALUES,
  TRAINING_PLACE_VALUES,
} from "@/db/domain";

export const PROFILE_FIELD_LABELS = {
  birthYear: "Ano de nascimento",
  sex: "Sexo",
  heightCm: "Altura (cm)",
  goal: "Objetivo",
  level: "Nível",
  daysPerWeek: "Dias por semana",
  sessionMinutes: "Duração da sessão (min)",
  trainingPlace: "Onde treina",
} as const;

const SEX_LABELS: Record<Sex, string> = {
  male: "Masculino",
  female: "Feminino",
  undisclosed: "Prefiro não dizer",
};

const GOAL_LABELS: Record<Goal, string> = {
  hypertrophy: "Hipertrofia",
  strength: "Força",
  fat_loss: "Perda de gordura",
  conditioning: "Condicionamento",
  health: "Saúde geral",
};

const LEVEL_LABELS: Record<TrainingLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

const PLACE_LABELS: Record<TrainingPlace, string> = {
  full_gym: "Academia completa",
  dumbbells: "Halteres em casa",
  home: "Casa (equipamento básico)",
  bodyweight: "Peso corporal",
};

export function sexOptions() {
  return SEX_VALUES.map((value) => ({
    value,
    label: SEX_LABELS[value],
  }));
}

export function goalOptions() {
  return GOAL_VALUES.map((value) => ({
    value,
    label: GOAL_LABELS[value],
  }));
}

export function levelOptions() {
  return LEVEL_VALUES.map((value) => ({
    value,
    label: LEVEL_LABELS[value],
  }));
}

export function trainingPlaceOptions() {
  return TRAINING_PLACE_VALUES.map((value) => ({
    value,
    label: PLACE_LABELS[value],
  }));
}

export function sessionMinuteOptions() {
  return SESSION_MINUTE_VALUES.map((value) => ({
    value: String(value),
    label: `${value} min`,
  }));
}

export const PROFILE_FORM_EMPTY_OPTION = "Não informado";
