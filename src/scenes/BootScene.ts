import Phaser from 'phaser';
import { CLASS_ORDER, CLASS_STATS } from '../data/ClassStats';
import { TILE_H, TILE_W } from '../utils/IsoMap';

/** BootScene（§2）：程式生成全部貼圖，禁用外部素材 */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'Boot';

  constructor() {
    super(BootScene.KEY);
  }

  create(): void {
    this.makeTiles();
    this.makePlayers();
    this.makePet();
    this.makeDummy();
    this.makeSlime();
    this.makeHouse();
    this.makeTree();
    this.makeFx();
    this.scene.start('ClassSelect');
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  /** 菱形 tile：草地 / 泥土路 / 訓練區 */
  private makeTiles(): void {
    const defs: { key: string; base: number; edge: number; speckle: number }[] = [
      { key: 'tile-grass', base: 0x3f7a34, edge: 0x2c5424, speckle: 0x5a9c48 },
      { key: 'tile-dirt', base: 0x8a6a42, edge: 0x624a2c, speckle: 0xa5845a },
      { key: 'tile-training', base: 0xa08858, edge: 0x74603a, speckle: 0xc0a878 },
    ];
    for (const d of defs) {
      const g = this.g();
      g.fillStyle(d.base, 1);
      g.beginPath();
      g.moveTo(TILE_W / 2, 0);
      g.lineTo(TILE_W, TILE_H / 2);
      g.lineTo(TILE_W / 2, TILE_H);
      g.lineTo(0, TILE_H / 2);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, d.edge, 0.6);
      g.strokePath();
      // 隨機斑點增加地面質感
      g.fillStyle(d.speckle, 0.8);
      for (let i = 0; i < 8; i++) {
        const px = 8 + Math.random() * (TILE_W - 16);
        const py = 6 + Math.random() * (TILE_H - 12);
        // 只取菱形內的點
        if (Math.abs(px - TILE_W / 2) / (TILE_W / 2) + Math.abs(py - TILE_H / 2) / (TILE_H / 2) <= 0.85) {
          g.fillRect(px, py, 2, 1);
        }
      }
      g.generateTexture(d.key, TILE_W, TILE_H);
      g.destroy();
    }
  }

  /** 三職業角色貼圖（26×34 小人，主色區分） */
  private makePlayers(): void {
    for (const id of CLASS_ORDER) {
      const color = CLASS_STATS[id].color;
      const dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
      const g = this.g();
      // 腳
      g.fillStyle(0x333333, 1);
      g.fillRect(8, 26, 4, 8);
      g.fillRect(14, 26, 4, 8);
      // 身體（長袍，主色）
      g.fillStyle(color, 1);
      g.fillRect(6, 13, 14, 14);
      // 衣襬陰影
      g.fillStyle(dark, 1);
      g.fillRect(6, 23, 14, 4);
      // 手臂
      g.fillStyle(dark, 1);
      g.fillRect(4, 14, 3, 9);
      g.fillRect(19, 14, 3, 9);
      // 頭
      g.fillStyle(0xf0c8a0, 1);
      g.fillCircle(13, 8, 5);
      // 頭髮
      g.fillStyle(0x2a2018, 1);
      g.fillRect(8, 2, 10, 4);
      // 職業標記：戰士-灰劍 / 法師-木杖 / 道士-白符
      if (id === 'warrior') {
        g.fillStyle(0xcccccc, 1);
        g.fillRect(22, 8, 2, 14);
      } else if (id === 'mage') {
        g.fillStyle(0x8a5a2a, 1);
        g.fillRect(22, 6, 2, 18);
        g.fillStyle(0xffcc44, 1);
        g.fillCircle(23, 5, 3);
      } else {
        g.fillStyle(0xffffff, 1);
        g.fillRect(21, 12, 4, 8);
      }
      g.generateTexture(`player-${id}`, 26, 34);
      g.destroy();
    }
  }

  /** 道士跟寵：小灰狼 */
  private makePet(): void {
    const g = this.g();
    // 身體
    g.fillStyle(0x9aa4b0, 1);
    g.fillEllipse(9, 11, 14, 8);
    // 頭
    g.fillStyle(0xb0bac6, 1);
    g.fillCircle(14, 6, 5);
    // 耳朵
    g.fillStyle(0x7a848e, 1);
    g.fillTriangle(11, 3, 13, 0, 14, 4);
    g.fillTriangle(15, 3, 17, 0, 17, 4);
    // 眼睛
    g.fillStyle(0x223344, 1);
    g.fillRect(13, 5, 1, 2);
    g.fillRect(16, 5, 1, 2);
    // 尾巴
    g.fillStyle(0x7a848e, 1);
    g.fillEllipse(2, 8, 5, 4);
    g.generateTexture('pet', 20, 16);
    g.destroy();
  }

  /** 訓練假人：木樁 + 橫桿 + 草紮頭 */
  private makeDummy(): void {
    const g = this.g();
    // 底座
    g.fillStyle(0x5a4228, 1);
    g.fillEllipse(14, 41, 20, 6);
    // 木樁
    g.fillStyle(0x8a6236, 1);
    g.fillRect(11, 12, 6, 30);
    // 橫桿（手臂）
    g.fillStyle(0x9a7040, 1);
    g.fillRect(1, 17, 26, 5);
    // 草紮頭
    g.fillStyle(0xd8b860, 1);
    g.fillCircle(14, 8, 7);
    // 綁繩
    g.lineStyle(1, 0x8a6236, 1);
    g.strokeCircle(14, 8, 5);
    g.lineStyle(2, 0x6a4a26, 1);
    g.lineBetween(9, 24, 19, 24);
    g.lineBetween(9, 32, 19, 32);
    g.generateTexture('dummy', 28, 44);
    g.destroy();
  }

  /** 等角房屋：雙面牆 + 紅瓦屋頂 */
  private makeHouse(): void {
    const g = this.g();
    // 左牆（暗面）
    g.fillStyle(0x7a6048, 1);
    g.fillPoints(
      [
        { x: 8, y: 68 },
        { x: 48, y: 88 },
        { x: 48, y: 58 },
        { x: 8, y: 38 },
      ],
      true,
    );
    // 右牆（亮面）
    g.fillStyle(0x9a7c5a, 1);
    g.fillPoints(
      [
        { x: 48, y: 88 },
        { x: 88, y: 68 },
        { x: 88, y: 38 },
        { x: 48, y: 58 },
      ],
      true,
    );
    // 門（右牆）
    g.fillStyle(0x3a2a1a, 1);
    g.fillPoints(
      [
        { x: 58, y: 78 },
        { x: 70, y: 72 },
        { x: 70, y: 54 },
        { x: 58, y: 60 },
      ],
      true,
    );
    // 屋頂（左暗右亮兩片）
    g.fillStyle(0x8a3030, 1);
    g.fillPoints(
      [
        { x: 4, y: 40 },
        { x: 48, y: 62 },
        { x: 48, y: 34 },
        { x: 48, y: 10 },
      ],
      true,
    );
    g.fillStyle(0xa84040, 1);
    g.fillPoints(
      [
        { x: 48, y: 62 },
        { x: 92, y: 40 },
        { x: 48, y: 10 },
      ],
      true,
    );
    g.lineStyle(2, 0x5a2020, 1);
    g.lineBetween(4, 40, 48, 62);
    g.lineBetween(92, 40, 48, 62);
    g.generateTexture('house', 96, 90);
    g.destroy();
  }

  /** 樹木：樹幹 + 三球樹冠 */
  private makeTree(): void {
    const g = this.g();
    // 樹影
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(22, 57, 26, 8);
    // 樹幹
    g.fillStyle(0x6a4a2a, 1);
    g.fillRect(19, 36, 6, 22);
    // 樹冠
    g.fillStyle(0x2e6a28, 1);
    g.fillCircle(12, 28, 11);
    g.fillCircle(32, 28, 11);
    g.fillStyle(0x3c8434, 1);
    g.fillCircle(22, 18, 15);
    g.fillStyle(0x4f9c44, 1);
    g.fillCircle(18, 14, 8);
    g.generateTexture('tree', 44, 60);
    g.destroy();
  }

  /** 特效貼圖：粒子 / 斬擊 / 火球 / 符彈 / 升級光環 */
  private makeFx(): void {
    // 白色小方塊粒子（依用途染色）
    let g = this.g();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('fx-px', 4, 4);
    g.destroy();

    // 斬擊弧
    g = this.g();
    g.lineStyle(5, 0xffffff, 1);
    g.beginPath();
    g.arc(18, 18, 14, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70));
    g.strokePath();
    g.generateTexture('fx-slash', 36, 36);
    g.destroy();

    // 火球（法師）
    g = this.g();
    g.fillStyle(0xff5522, 0.5);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xff8833, 1);
    g.fillCircle(8, 8, 5);
    g.fillStyle(0xffdd66, 1);
    g.fillCircle(8, 8, 2.5);
    g.generateTexture('fx-fireball', 16, 16);
    g.destroy();

    // 符彈（道士/跟寵）
    g = this.g();
    g.fillStyle(0x66ffcc, 0.5);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xaaffee, 1);
    g.fillTriangle(6, 1, 11, 6, 6, 11);
    g.fillTriangle(6, 1, 1, 6, 6, 11);
    g.generateTexture('fx-bolt', 12, 12);
    g.destroy();

    // 升級光環
    g = this.g();
    g.lineStyle(4, 0xffdd44, 1);
    g.strokeCircle(32, 32, 28);
    g.lineStyle(2, 0xffffaa, 0.8);
    g.strokeCircle(32, 32, 22);
    g.generateTexture('fx-ring', 64, 64);
    g.destroy();
  }

  /** 史萊姆（§3）：22×16 綠色果凍半圓 + 高光 + 黑眼 */
  private makeSlime(): void {
    const g = this.g();
    // 主體
    g.fillStyle(0x55cc44, 1);
    g.fillEllipse(11, 9, 20, 14);
    // 底部陰影
    g.fillStyle(0x3daa33, 0.7);
    g.fillEllipse(11, 11, 18, 8);
    // 頂部高光
    g.fillStyle(0x99ee88, 0.65);
    g.fillEllipse(9, 6, 9, 4);
    // 眼睛
    g.fillStyle(0x112200, 1);
    g.fillCircle(7, 8, 1.8);
    g.fillCircle(15, 8, 1.8);
    // 輪廓
    g.lineStyle(1, 0x2a8822, 0.9);
    g.strokeEllipse(11, 9, 20, 14);
    g.generateTexture('slime', 22, 16);
    g.destroy();
  }
}
