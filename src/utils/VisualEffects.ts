import Phaser from 'phaser';
import type { ClassId } from '../data/ClassStats';
import { CLASS_STATS } from '../data/ClassStats';

/** 攻擊/擊殺/升級等視覺特效（§5、§6、§8），全部以程式生成的貼圖繪製 */

const FX_DEPTH = 4500;

/** 依職業播放攻擊特效：戰士斬擊、法師火球彈道、道士符咒彈 */
export function playAttackEffect(
  scene: Phaser.Scene,
  classId: ClassId,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  switch (classId) {
    case 'warrior':
      playSlash(scene, toX, toY);
      break;
    case 'mage':
      playProjectile(scene, 'fx-fireball', fromX, fromY, toX, toY, 0xff8833, 160);
      break;
    case 'taoist':
      playProjectile(scene, 'fx-bolt', fromX, fromY, toX, toY, 0x66ffcc, 140);
      break;
  }
}

/** 戰士：目標位置的白色弧形斬擊 */
function playSlash(scene: Phaser.Scene, x: number, y: number): void {
  const slash = scene.add
    .image(x, y - 10, 'fx-slash')
    .setDepth(FX_DEPTH)
    .setAlpha(0.9)
    .setScale(0.6)
    .setAngle(-30);
  scene.tweens.add({
    targets: slash,
    angle: 40,
    scale: 1.1,
    alpha: 0,
    duration: 180,
    ease: 'Cubic.easeOut',
    onComplete: () => slash.destroy(),
  });
}

/** 彈道特效：從攻擊者飛向目標，抵達後爆出火花 */
function playProjectile(
  scene: Phaser.Scene,
  texture: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  sparkTint: number,
  durationMs: number,
): void {
  const proj = scene.add.image(fromX, fromY - 12, texture).setDepth(FX_DEPTH);
  proj.setRotation(Phaser.Math.Angle.Between(fromX, fromY, toX, toY));
  scene.tweens.add({
    targets: proj,
    x: toX,
    y: toY - 12,
    duration: durationMs,
    ease: 'Linear',
    onComplete: () => {
      proj.destroy();
      burstParticles(scene, toX, toY - 12, sparkTint, 8, 40);
    },
  });
}

/** 受擊/爆炸火花：小方塊粒子向四周飛散 */
export function burstParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tint: number,
  count: number,
  speed: number,
): void {
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, 'fx-px').setDepth(FX_DEPTH).setTint(tint);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = speed * (0.6 + Math.random() * 0.8);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

/** 假人死亡：木屑碎片飛散（§6） */
export function playDeathShards(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 12; i++) {
    const p = scene.add
      .image(x, y - 14, 'fx-px')
      .setDepth(FX_DEPTH)
      .setTint(i % 2 === 0 ? 0xaa7744 : 0xddcc88)
      .setScale(1 + Math.random());
    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 40;
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y - 14 + Math.sin(angle) * dist * 0.6 + 20,
      angle: Math.random() * 360,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

/** 升級特效：金色光環擴散 + 粒子 + 提示文字（§8） */
export function playLevelUpEffect(scene: Phaser.Scene, x: number, y: number, newLevel: number): void {
  const ring = scene.add.image(x, y - 8, 'fx-ring').setDepth(FX_DEPTH).setScale(0.3).setAlpha(1);
  scene.tweens.add({
    targets: ring,
    scale: 1.6,
    alpha: 0,
    duration: 550,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  burstParticles(scene, x, y - 16, 0xffdd44, 14, 52);

  const text = scene.add
    .text(x, y - 44, `LEVEL UP!  Lv.${newLevel}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffee66',
      stroke: '#884400',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(5000);
  scene.tweens.add({
    targets: text,
    y: y - 84,
    alpha: 0,
    duration: 1100,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** 攻擊者彈跳：sprite 縮放 1.2、80ms（§5） */
export function playAttackBounce(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite): void {
  scene.tweens.add({
    targets: target,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 80,
    yoyo: true,
    ease: 'Quad.easeOut',
  });
}

/** 取得職業主色（特效共用） */
export function classColor(classId: ClassId): number {
  return CLASS_STATS[classId].color;
}
