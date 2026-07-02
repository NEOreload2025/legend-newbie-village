import Phaser from 'phaser';
import { CLASS_ORDER, CLASS_STATS } from '../data/ClassStats';
import type { ClassId } from '../data/ClassStats';
import { GameState } from '../data/GameState';

const PANEL_W = 210;
const PANEL_H = 320;

/** 職業選擇（§3）：點擊面板 或 鍵盤 1 / 2 / 3 */
export class ClassSelectScene extends Phaser.Scene {
  static readonly KEY = 'ClassSelect';

  constructor() {
    super(ClassSelectScene.KEY);
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 70, '熱血傳奇新手村', {
        fontFamily: 'serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffd766',
        stroke: '#5a2a00',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 108, 'Legend Newbie Village — 選擇你的職業', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    const centers = [width / 2 - 240, width / 2, width / 2 + 240];
    CLASS_ORDER.forEach((id, i) => {
      this.createPanel(id, i + 1, centers[i], 330);
    });

    this.add
      .text(width / 2, height - 40, '點擊職業面板，或按鍵盤 1 / 2 / 3 選擇', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-ONE', () => this.select('warrior'));
      keyboard.on('keydown-TWO', () => this.select('mage'));
      keyboard.on('keydown-THREE', () => this.select('taoist'));
    }
  }

  private createPanel(id: ClassId, index: number, cx: number, cy: number): void {
    const stats = CLASS_STATS[id];

    const bg = this.add
      .rectangle(cx, cy, PANEL_W, PANEL_H, 0x1e2230, 0.95)
      .setStrokeStyle(3, stats.color);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x2c3248, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(0x1e2230, 0.95));
    bg.on('pointerdown', () => this.select(id));

    this.add
      .text(cx, cy - PANEL_H / 2 + 26, `[${index}] ${stats.nameZh}`, {
        fontFamily: 'serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: `#${stats.color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - PANEL_H / 2 + 50, stats.nameEn, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // 角色預覽（程式生成貼圖放大）
    this.add.image(cx, cy - 10, `player-${id}`).setScale(3);

    const lines = [
      `HP   ${stats.hp}`,
      `ATK  ${stats.atk}`,
      `DEF  ${stats.def}`,
      `攻速 ${stats.attackCooldownMs}ms/次`,
    ];
    this.add
      .text(cx, cy + 48, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#eeeeee',
        align: 'left',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(cx, cy + PANEL_H / 2 - 24, stats.traitZh, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffd766',
      })
      .setOrigin(0.5);
  }

  private select(id: ClassId): void {
    GameState.selectedClass = id;
    this.scene.start('Village');
  }
}
