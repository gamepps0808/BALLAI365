import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { TacticalOverview } from "../src/components/match/TacticalOverview";
import { Fixture } from "../src/lib/types";

const base = {
  homeTeam: { shortName: "Mexico" },
  awayTeam: { shortName: "South Africa" },
} as unknown as Fixture;

// เคส 1: มีแผนทั้งสองทีม
const withLineups = {
  ...base,
  homeLineup: { formation: "4-2-3-1", coach: "", confirmed: true, startXI: [], bench: [] },
  awayLineup: { formation: "4-3-3", coach: "", confirmed: true, startXI: [], bench: [] },
} as unknown as Fixture;
const html1 = renderToStaticMarkup(<TacticalOverview fixture={withLineups} />);
const circles = (html1.match(/<circle/g) ?? []).length - 1; // -1 วงกลมกลางสนาม
console.log("เคสมีแผน: จุดผู้เล่น =", circles, circles === 22 ? "✅ (11+11)" : "❌");
console.log("  มีป้าย 4-2-3-1:", html1.includes("4-2-3-1") ? "✅" : "❌", "| 4-3-3:", html1.includes("4-3-3") ? "✅" : "❌");

// เคส 2: ยังไม่ประกาศ
const noLineups = { ...base } as unknown as Fixture;
const html2 = renderToStaticMarkup(<TacticalOverview fixture={noLineups} />);
console.log("เคสไม่มีแผน:", html2.includes("ยังไม่ประกาศแผนการเล่น") ? "✅ แสดง Missing Data" : "❌");

// เคส 3: ประกาศฝั่งเดียว
const oneSide = {
  ...base,
  homeLineup: { formation: "3-5-2", coach: "", confirmed: true, startXI: [], bench: [] },
} as unknown as Fixture;
const html3 = renderToStaticMarkup(<TacticalOverview fixture={oneSide} />);
const c3 = (html3.match(/<circle/g) ?? []).length - 1;
console.log("เคสฝั่งเดียว: จุด =", c3, c3 === 11 ? "✅" : "❌", "| ฝั่งขวาบอกยังไม่ประกาศ:", html3.includes("ยังไม่ประกาศ") ? "✅" : "❌");
