import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { VillageScene } from './scenes/VillageScene';
import { Hud } from './ui/Hud';

/** Phaser 遊戲設定與場景註冊（§2）：800×600、#game-container */
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#14181f',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, ClassSelectScene, VillageScene, Hud],
});

// 開發模式下暴露 game 實例，供除錯與 E2E 驗證使用
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
