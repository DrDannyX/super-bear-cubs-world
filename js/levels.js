// Level designs. Tiles:
//   # ground   B brick   ? diamond block   H honey block   R berry block   U used block
//   S stone    = one-way platform   ^ spikes   [ ] log (left/right half)   J bouncy mushroom
// Entities placed with row(): o diamond, e beetle, z bee
import { ROWS } from './constants.js';

const GROUND = 12; // top row of the ground

class Builder {
  constructor(w) {
    this.w = w;
    this.grid = Array.from({ length: ROWS }, () => Array(w).fill(' '));
    this.ents = [];
    this.startX = 2;
    this.checkX = null;
    this.goalX = w - 10;
  }
  set(x, y, c) {
    if (x >= 0 && x < this.w && y >= 0 && y < ROWS) this.grid[y][x] = c;
  }
  ground(x0, x1, top = GROUND) {
    for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) this.set(x, y, '#');
    return this;
  }
  fill(x0, y0, x1, y1, c) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) this.set(x, y, c);
    return this;
  }
  row(x, y, str) {
    [...str].forEach((c, i) => {
      if (c === ' ') return;
      if (c === 'o') this.ents.push({ type: 'diamond', x: x + i, y });
      else if (c === 'e') this.ents.push({ type: 'beetle', x: x + i, y });
      else if (c === 'z') this.ents.push({ type: 'bee', x: x + i, y });
      else this.set(x + i, y, c);
    });
    return this;
  }
  enemy(type, x, y = GROUND - 1) {
    this.ents.push({ type, x, y });
    return this;
  }
  log(x, h) {
    for (let y = GROUND - h; y < GROUND; y++) {
      this.set(x, y, '[');
      this.set(x + 1, y, ']');
    }
    return this;
  }
  stairs(x, n, dir = 1) {
    for (let i = 0; i < n; i++) {
      const h = dir > 0 ? i + 1 : n - i;
      this.fill(x + i, GROUND - h, x + i, GROUND - 1, 'S');
    }
    return this;
  }
  spikes(x0, x1) {
    return this.fill(x0, GROUND - 1, x1, GROUND - 1, '^');
  }
  spring(x) {
    this.set(x, GROUND - 1, 'J');
    return this;
  }
  // A parabola of diamonds, handy over gaps.
  arc(x0, x1, top) {
    const mid = (x0 + x1) / 2, half = (x1 - x0) / 2 || 1;
    for (let x = x0; x <= x1; x++) {
      const k = (x - mid) / half;
      this.ents.push({ type: 'diamond', x, y: Math.round(top + k * k * 3) });
    }
    return this;
  }
  start(x) { this.startX = x; return this; }
  checkpoint(x) { this.checkX = x; return this; }
  goal(x) { this.goalX = x; return this; }
  done(meta) {
    return { ...meta, w: this.w, grid: this.grid, ents: this.ents, startX: this.startX, checkX: this.checkX, goalX: this.goalX };
  }
}

function sunnyMeadow() {
  const L = new Builder(214);
  L.ground(0, 68).start(3);
  L.row(9, 9, 'ooo');
  L.row(14, 8, '?');
  L.row(18, 8, 'B?BHB');
  L.row(20, 4, '?');
  L.enemy('beetle', 24);
  L.log(28, 2).row(28, 8, 'oo');
  L.log(36, 3);
  L.enemy('beetle', 40);
  L.log(44, 3).row(44, 7, 'oo');
  L.enemy('beetle', 48).enemy('beetle', 50);
  L.log(54, 2);
  L.row(58, 9, 'o o o');
  L.row(62, 8, 'B?B');
  L.arc(67, 73, 7);
  L.ground(72, 121);
  L.row(76, 8, 'B?B');
  L.row(80, 4, 'BBBBBBBB').row(80, 3, 'oooooooo');
  L.enemy('beetle', 83, 3).enemy('beetle', 86, 3);
  L.row(90, 8, 'B?BRB');
  L.spring(97).row(95, 2, 'ooooo');
  L.row(101, 8, '=====').row(101, 7, 'ooooo');
  L.enemy('bee', 106, 6);
  L.checkpoint(110);
  L.enemy('beetle', 113);
  L.stairs(118, 4);
  L.ground(124, 150).stairs(124, 4, -1);
  L.arc(121, 124, 5);
  L.enemy('beetle', 132).enemy('beetle', 134);
  L.row(137, 8, '?B?B');
  L.enemy('bee', 145, 7);
  L.arc(150, 154, 7);
  L.ground(154, 213);
  L.row(158, 8, 'BB?BB').row(160, 4, 'H');
  L.enemy('beetle', 163).enemy('beetle', 166);
  L.row(171, 8, '====').row(171, 7, 'oooo');
  L.enemy('bee', 176, 6);
  L.stairs(181, 8).fill(189, 4, 189, 11, 'S');
  L.goal(198);
  return L.done({ name: 'SUNNY MEADOW', theme: 'meadow', music: 'meadow', time: 300 });
}

function honeycombCaves() {
  const L = new Builder(204);
  L.fill(0, 0, 182, 1, 'B');
  L.ground(0, 40).start(3);
  L.row(9, 8, '?H?');
  L.enemy('beetle', 16).enemy('beetle', 18);
  L.row(22, 8, 'BBBBBB').row(22, 7, 'oooooo');
  L.enemy('beetle', 24, 7);
  L.spikes(30, 32).row(30, 8, 'ooo');
  L.enemy('bee', 36, 8);
  L.row(42, 9, '==').row(42, 8, 'oo');
  L.ground(45, 90);
  L.log(50, 3);
  L.row(56, 8, 'B?B?B').row(57, 4, 'BRB');
  L.enemy('beetle', 60).enemy('beetle', 62);
  L.stairs(66, 3).spikes(69, 71).row(69, 6, 'ooo').stairs(72, 3, -1);
  L.row(78, 8, 'B?B');
  L.enemy('bee', 84, 7);
  L.checkpoint(88);
  L.row(92, 9, '==').row(95, 7, '==').row(95, 6, 'oo');
  L.ground(98, 150);
  L.spring(101).row(100, 2, 'ooo');
  L.row(104, 8, '?B?B?B?B?').row(104, 4, 'BBBHBBBBB');
  L.enemy('beetle', 106).enemy('beetle', 109).enemy('beetle', 112);
  L.spikes(118, 120).row(118, 8, '===').row(118, 7, 'ooo');
  L.enemy('bee', 124, 8).enemy('bee', 130, 6);
  L.log(134, 2).enemy('beetle', 137).log(140, 3).row(140, 7, 'oo');
  L.enemy('beetle', 145);
  L.arc(150, 155, 7);
  L.ground(155, 203);
  L.row(159, 8, 'B?B');
  L.enemy('beetle', 163).enemy('bee', 166, 7);
  L.stairs(170, 6).fill(176, 6, 176, 11, 'S');
  L.goal(186);
  return L.done({ name: 'HONEYCOMB CAVES', theme: 'caves', music: 'caves', time: 300 });
}

function snowyPeaks() {
  const L = new Builder(226);
  L.ground(0, 30).start(3);
  L.row(8, 8, '?H?');
  L.enemy('beetle', 14);
  L.row(18, 7, '====').row(18, 6, 'oooo');
  L.enemy('beetle', 24);
  L.row(31, 9, '==').arc(30, 35, 6);
  L.ground(35, 70);
  L.log(38, 2).enemy('beetle', 41).log(44, 3);
  L.enemy('bee', 48, 7);
  L.row(52, 8, 'BB?BB').row(52, 4, 'ooooo');
  L.spring(60).row(58, 2, 'ooooo');
  L.enemy('beetle', 64).enemy('beetle', 66);
  L.row(72, 9, '===').row(72, 8, 'ooo');
  L.ground(76, 120);
  L.spikes(80, 81);
  L.row(86, 8, 'BRB');
  L.stairs(92, 3).stairs(95, 3, -1);
  L.enemy('bee', 99, 7);
  L.checkpoint(104);
  L.enemy('bee', 108, 6).enemy('bee', 114, 8);
  L.row(121, 9, '==').row(124, 7, '==').row(124, 6, 'oo');
  L.ground(127, 170);
  L.row(130, 8, '?B?B?').row(132, 4, 'H');
  L.enemy('beetle', 134).enemy('beetle', 136).enemy('beetle', 140);
  L.spikes(146, 148).row(146, 8, '===').row(146, 7, 'ooo');
  L.log(152, 3).enemy('bee', 156, 7).log(160, 3);
  L.enemy('beetle', 164);
  L.arc(170, 175, 6);
  L.ground(175, 225);
  L.row(178, 8, 'B?B?B');
  L.enemy('beetle', 181).enemy('bee', 186, 7);
  L.stairs(192, 8).fill(200, 4, 200, 11, 'S');
  L.goal(209);
  return L.done({ name: 'SNOWY PEAKS', theme: 'snow', music: 'snow', time: 300 });
}

export const LEVELS = [sunnyMeadow(), honeycombCaves(), snowyPeaks()];
