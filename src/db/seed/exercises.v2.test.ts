import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { exerciseSeedSchema } from "./exercises-v2-schema";

const seed = JSON.parse(
  readFileSync("src/db/seed/exercises.v2.json", "utf8"),
) as unknown;

describe("LED-32 exercise seed v2", () => {
  it("accepts the official catalog: 136 unique ids and live substitutions", () => {
    const parsed = exerciseSeedSchema.parse(seed);
    expect(parsed.count).toBe(136);
    expect(parsed.exercises).toHaveLength(136);
    expect(new Set(parsed.exercises.map((item) => item.id)).size).toBe(136);
    expect(parsed.exercises.some((item) => item.id === "supino_fechado")).toBe(
      true,
    );
    const bench = parsed.exercises.find(
      (item) => item.id === "supino_reto_com_barra",
    );
    expect(bench?.name_pt).toBe("Supino reto com barra");
    expect(bench?.movement_pattern).toBe("horizontal_push");
    expect(bench?.equipment).toBe("barbell");
    expect(bench?.primary_muscles).toEqual(["chest"]);
  });

  it("marks plyometrics exactly as the v2 reference", () => {
    const parsed = exerciseSeedSchema.parse(seed);
    const plyometric = parsed.exercises.filter((item) => item.is_plyometric);
    expect(
      parsed.exercises.every(
        (item) => item.is_plyometric === true || item.is_plyometric === false,
      ),
    ).toBe(true);
    expect(plyometric.map((item) => item.id)).toEqual([
      "agachamento_com_salto",
    ]);
  });

  it("keeps mergulho_no_banco substitutions in the published v2 order", () => {
    const parsed = exerciseSeedSchema.parse(seed);
    const dip = parsed.exercises.find(
      (item) => item.id === "mergulho_no_banco",
    );
    expect(dip?.substitutions).toEqual([
      "supino_com_halteres_pegada_neutra",
      "supino_fechado",
      "paralelas_mergulho_para_peito",
    ]);
  });

  it("rejects a substitution that does not point at an id", () => {
    const broken = structuredClone(seed) as {
      exercises: { id: string; substitutions: string[] }[];
    };
    const first = broken.exercises[0];
    expect(first).toBeDefined();
    if (!first) return;
    first.substitutions = ["exercicio_que_nao_existe"];
    expect(exerciseSeedSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a duplicate id and an unknown enum", () => {
    const broken = structuredClone(seed) as {
      exercises: { id: string; equipment: string }[];
    };
    const [first, second] = broken.exercises;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    second.id = first.id;
    first.equipment = "other";
    const result = exerciseSeedSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });
});
