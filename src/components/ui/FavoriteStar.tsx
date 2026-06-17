"use client";

import { Star } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * ปุ่มติดตามคู่บอล (ทีมโปรด) — เก็บในเครื่อง (localStorage) ต้นทุน 0
 * เก็บข้อมูลคู่ครบในตัว → หน้า /favorites อ่านได้เลยโดยไม่ต้องเรียก API
 */

export interface FavMatch {
  id: string;
  home: string;
  away: string;
  kickoff: string;
  kickoffLabel: string;
  league: string;
}

const KEY = "ballai:favorites";
const EVENT = "ballai:favchange";

export function readFavorites(): FavMatch[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as FavMatch[];
  } catch {
    return [];
  }
}

function writeFavorites(list: FavMatch[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export function removeFavorite(id: string): void {
  writeFavorites(readFavorites().filter((m) => m.id !== id));
}

/** ให้ component อื่นรับรู้เมื่อรายการโปรดเปลี่ยน */
export function onFavoritesChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function FavoriteStar({ match }: { match: FavMatch }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(readFavorites().some((m) => m.id === match.id));
  }, [match.id]);

  function toggle() {
    const list = readFavorites();
    const exists = list.some((m) => m.id === match.id);
    writeFavorites(exists ? list.filter((m) => m.id !== match.id) : [...list, match]);
    setOn(!exists);
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "เลิกติดตามคู่นี้" : "ติดตามคู่นี้"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        on
          ? "border-[var(--gold)] text-[var(--gold)]"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Star size={14} fill={on ? "currentColor" : "none"} />
      {on ? "ติดตามแล้ว" : "ติดตาม"}
    </button>
  );
}
