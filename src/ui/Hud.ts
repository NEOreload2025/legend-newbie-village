import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { PLAYER_EVENT_STATS_CHANGED } from '../entities/Player';
import { xpNeeded } from '../systems/LevelSystem';

const BAR_WIDTH = 140;
const BAR_HEIGHT = 10;

/**
 * HUD（§9）：以平行 overlay 場景實作，完全不受主相機捲動/縮放影響。
 * 由 VillageScene 啟動並傳入玩家參考。
 */
export class Hud extends Phaser.Scene {
  static readonly KEY = 'Hud';

  private player!: Player;
  private infoText!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;

  constructor() {
    super(Hud.KEY);
  }

  init(data: { player: Player }): void {
    this.player = data.player;
  }

  create(): void {
    const { classStats } = this.player;

    // 左上：職業名（中英）
    this.add.text(12, 10, `${classStats.nameZh} ${classStats.nameEn}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // 左上：Lv / HP / XP 數值
    this.infoText = this.add.text(12, 34, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffeeaa',
      stroke: '#000000',
      strokeThickness: 3,
    });

    this.bars = this.add.graphics();

    // 底部中央操作提示
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 12,
        'WASD / Arrows: Move  |  SPACE / J: Attack',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5, 1);

    this.refresh();
    this.player.on(PLAYER_EVENT_STATS_CHANGED, () => this.refresh());
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.player.off(PLAYER_EVENT_STATS_CHANGED);
    });
  }

  private refresh(): void {
    const s = this.player.stats;
    const need = xpNeeded(s.level);
    this.infoText.setText(`Lv.${s.level}  HP ${s.hp}/${s.maxHp}  XP ${s.xp}/${need}`);

    const barX = 12;
    const hpY = 58;
    const xpY = 74;
    this.bars.clear();
    // HP 條（綠 140×10）
    this.bars.fillStyle(0x222222, 0.8).fillRect(barX, hpY, BAR_WIDTH, BAR_HEIGHT);
    this.bars
      .fillStyle(0x33cc33, 1)
      .fillRect(barX, hpY, BAR_WIDTH * Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1), BAR_HEIGHT);
    this.bars.lineStyle(1, 0x000000, 1).strokeRect(barX, hpY, BAR_WIDTH, BAR_HEIGHT);
    // XP 條（藍 140×10）
    this.bars.fillStyle(0x222222, 0.8).fillRect(barX, xpY, BAR_WIDTH, BAR_HEIGHT);
    this.bars
      .fillStyle(0x3388ff, 1)
      .fillRect(barX, xpY, BAR_WIDTH * Phaser.Math.Clamp(s.xp / need, 0, 1), BAR_HEIGHT);
    this.bars.lineStyle(1, 0x000000, 1).strokeRect(barX, xpY, BAR_WIDTH, BAR_HEIGHT);
  }
}
