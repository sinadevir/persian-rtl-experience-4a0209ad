import { useEffect } from "react";
import { toJalali, toJalaliDateTime } from "@/lib/jalali";

const ISO = /\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?\b/g;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);
const fa = (s: string) => s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);

/** Turns any Gregorian ISO date into a Jalali one and Latin digits into Persian digits. */
export function persianize(s: string) {
  const withDates = s.replace(ISO, (m, _y, _mo, _d, h, mi) => {
    const out = h && (h !== "00" || mi !== "00") ? toJalaliDateTime(m) : toJalali(m);
    return out === "—" ? m : out;
  });
  return fa(withDates);
}

function fix(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentElement;
    if (!p || SKIP.has(p.tagName) || p.closest("[data-keep-latin]") || p.isContentEditable) return;
    const v = node.nodeValue ?? "";
    if (!/[0-9]/.test(v)) return;
    const n = persianize(v);
    if (n !== v) node.nodeValue = n;
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE && SKIP.has((node as Element).tagName)) return;
  node.childNodes.forEach(fix);
}

/**
 * Safety net for the whole app: every date on screen is Solar Hijri and every number uses Persian digits,
 * even when a value comes straight from the server. Inputs are left alone so typing still works.
 */
export function PersianText() {
  useEffect(() => {
    fix(document.body);
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") fix(m.target);
        else m.addedNodes.forEach(fix);
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, []);
  return null;
}
