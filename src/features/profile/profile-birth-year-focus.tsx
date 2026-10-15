"use client";

import { useEffect } from "react";

/** Foca o campo `#birthYear` quando a URL traz `/perfil#birthYear`. */
export function ProfileBirthYearFocus() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#birthYear") return;
    const field = document.getElementById("birthYear");
    if (field instanceof HTMLElement) {
      field.focus();
      field.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  return null;
}
