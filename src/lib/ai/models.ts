const FREE_SUFFIX = ":free";

export type FreeModelList =
  { ok: true; models: string[] } | { ok: false; reason: "not_free" };

/** Nomes de modelo vêm do ambiente. Só variantes `:free` entram na lista. */
export function parseFreeModelList(value: string | undefined): FreeModelList {
  if (!value || value.trim() === "") return { ok: true, models: [] };
  const models = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (
    models.some(
      (model) =>
        !model.endsWith(FREE_SUFFIX) ||
        model.includes(" ") ||
        model.length > 120,
    )
  ) {
    return { ok: false, reason: "not_free" };
  }
  return { ok: true, models };
}
