import Phaser from 'phaser';
import { GameState } from '../data/GameState';
import { SLIME_CONST } from '../data/MonsterStats';
import { LOOT_CONST } from '../data/LootStats';
import { GAME_CONST } from '../data/ClassStats';
import { Player, PLAYER_EVENT_STATS_CHANGED } from '../entities/Player';
import { Pet } from '../entities/Pet';
import { TrainingDummy } from '../entities/TrainingDummy';
import { Slime } from '../entities/Slime';
import { LootDrop } from '../entities/LootDrop';
import type { Attackable } from '../entities/Attackable';
import { Hud } from '../ui/Hud';
import { showPickupText } from '../utils/DamageText';
import { saveGame, loadGame } from '../systems/SaveSystem';
import {
  DUMMY_TILES,
  MAP_COLS,
  MAP_OBJECTS,
  MAP_ROWS,
  PLAYER_SPAWN_TILE,
  SLIME_TILES,
  TILE_H,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  terrainAt,
  tileToWorld,
} from '../utils/IsoMap';

/** 物件深度基準：一律高於地面 tile */
const OBJECT_DEPTH_BASE = 1000;

/** 主玩法場景（§2、§4、§10） */
export class VillageScene extends Phaser.Scene {
  static readonly KEY = 'Village';

  private player!: Player;
  private pet: Pet | null = null;
  private dummies: TrainingDummy[] = [];
  private slimes: Slime[] = [];
  /** 場上所有掉落物，命名必須為 loots（驗證腳本相依） */
  private loots: LootDrop[] = [];

  constructor() {
    super(VillageScene.KEY);
  }

  create(): void {
    this.dummies = [];
    this.slimes = [];
    this.loots = [];
    this.pet = null;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.buildGround();
    const obstacles = this.buildObstacles();
    this.buildPlayer();

    // 繼續遊戲：若旗標有效且有存檔，套用存檔數值（含 gold）並 emit 讓 HUD 刷新
    const saveData = loadGame();
    if (GameState.continueRun && saveData && saveData.classId === GameState.selectedClass) {
      this.player.stats = {
        level: saveData.level,
        xp: saveData.xp,
        maxHp: saveData.maxHp,
        hp: saveData.hp,
        atk: saveData.atk,
        def: saveData.def,
      };
      this.player.gold = saveData.gold;
      this.player.emit(PLAYER_EVENT_STATS_CHANGED, this.player.stats);
    }
    GameState.continueRun = false;

    // 每次 stats-changed（升級、受傷、拾金、擊殺等）即自動存檔
    const saveHandler = () => {
      saveGame({
        classId: this.player.classId,
        level: this.player.stats.level,
        xp: this.player.stats.xp,
        maxHp: this.player.stats.maxHp,
        hp: this.player.stats.hp,
        atk: this.player.stats.atk,
        def: this.player.stats.def,
        gold: this.player.gold,
      });
    };
    this.player.on(PLAYER_EVENT_STATS_CHANGED, saveHandler);

    this.buildDummies();
    this.buildSlimes();

    this.physics.add.collider(this.player, obstacles);
    this.slimes.forEach((slime) => this.physics.add.collider(slime, obstacles));

    if (this.player.classId === 'taoist') {
      const targets: readonly Attackable[] = [...this.dummies, ...this.slimes];
      this.pet = new Pet(this, this.player, targets);
    }

    this.buildSignpost();
    this.setupCamera();
    this.setupPointerMove();

    // HUD：平行 overlay 場景，固定於螢幕
    this.scene.launch(Hud.KEY, { player: this.player });
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop(Hud.KEY);
      this.player.off(PLAYER_EVENT_STATS_CHANGED, saveHandler);
    });
  }

  override update(time: number): void {
    const targets: readonly Attackable[] = [...this.dummies, ...this.slimes];
    this.player.update(time, targets);
    this.pet?.update(time);
    for (const slime of this.slimes) {
      slime.update(time);
    }
    this.updateLoots();
  }

  /** 鋪設等角地面：草地 / 泥土十字路 / 訓練區 */
  private buildGround(): void {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const { x, y } = tileToWorld(col, row);
        this.add
          .image(x, y, `tile-${terrainAt(col, row)}`)
          .setOrigin(0.5, 0)
          .setDepth(y);
      }
    }
  }

  /** 房屋與樹木：視覺 image + 底部靜態碰撞 zone（§10 障礙物） */
  private buildObstacles(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const obj of MAP_OBJECTS) {
      const { x, y } = tileToWorld(obj.col, obj.row);
      const groundY = y + TILE_H / 2;
      if (obj.kind === 'house') {
        this.add.image(x, groundY + 14, 'house').setOrigin(0.5, 1).setDepth(OBJECT_DEPTH_BASE + groundY);
        this.addStaticBody(group, x, groundY, 76, 34);
      } else {
        this.add.image(x, groundY + 6, 'tree').setOrigin(0.5, 1).setDepth(OBJECT_DEPTH_BASE + groundY);
        this.addStaticBody(group, x, groundY, 20, 14);
      }
    }
    return group;
  }

  private addStaticBody(
    group: Phaser.Physics.Arcade.StaticGroup,
    cx: number,
    cy: number,
    w: number,
    h: number,
  ): void {
    const zone = this.add.zone(cx, cy, w, h);
    this.physics.add.existing(zone, true);
    group.add(zone);
  }

  /** 訓練區放置複數訓練假人 */
  private buildDummies(): void {
    for (const tile of DUMMY_TILES) {
      const { x, y } = tileToWorld(tile.col, tile.row);
      const groundY = y + TILE_H / 2;
      const dummy = new TrainingDummy(this, x, groundY + 6, (source) => {
        // 寵物擊殺不給玩家經驗值（§7）
        if (source === 'player') this.player.gainKillXp(GAME_CONST.xpPerKill);
      });
      dummy.setDepth(OBJECT_DEPTH_BASE + dummy.y);
      this.dummies.push(dummy);
    }
  }

  /** 史萊姆放置於指定 tiles（§2、§8） */
  private buildSlimes(): void {
    for (const tile of SLIME_TILES) {
      const { x, y } = tileToWorld(tile.col, tile.row);
      const groundY = y + TILE_H / 2;
      const slime = new Slime(this, x, groundY + 6, this.player, (source) => {
        // 玩家親自擊殺給 40 XP
        if (source === 'player') this.player.gainKillXp(SLIME_CONST.xpReward);
        // 史萊姆死亡掉寶（金幣必掉 + 機率藥水），不論玩家或寵物擊殺
        this.spawnLoot(slime.x, slime.y);
      });
      slime.setDepth(OBJECT_DEPTH_BASE + slime.y);
      this.slimes.push(slime);
    }
  }

  private buildPlayer(): void {
    const { x, y } = tileToWorld(PLAYER_SPAWN_TILE.col, PLAYER_SPAWN_TILE.row);
    this.player = new Player(this, x, y + TILE_H / 2, GameState.selectedClass);
  }

  /** 出生點旁「訓練場 →」指路文字 */
  private buildSignpost(): void {
    this.add
      .text(this.player.x + 40, this.player.y - 36, '訓練場 →', {
        fontFamily: 'serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffee88',
        stroke: '#553300',
        strokeThickness: 4,
      })
      .setOrigin(0, 1)
      .setDepth(OBJECT_DEPTH_BASE + this.player.y);
  }

  /** 相機：跟隨玩家（lerp 0.1）、zoom 1.1、限制在地圖邊界內 */
  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setZoom(1.1);
    cam.startFollow(this.player, false, 0.1, 0.1);
    cam.setBackgroundColor(0x14181f);
  }

  /** 滑鼠左鍵點地面 → click-to-move（§4） */
  private setupPointerMove(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.player.setMoveTarget(pointer.worldX, pointer.worldY);
      }
    });
  }

  /** 生成掉落物：金幣（必）+ 藥水（機率），位置以死亡點為中心散落 */
  private spawnLoot(baseX: number, baseY: number): void {
    // 金幣：goldMin..goldMax 整數均勻
    const goldValue =
      Math.floor(Math.random() * (LOOT_CONST.goldMax - LOOT_CONST.goldMin + 1)) +
      LOOT_CONST.goldMin;
    const gold = new LootDrop(this, baseX, baseY, 'gold', goldValue);
    this.loots.push(gold);

    // 紅藥水
    if (Math.random() < LOOT_CONST.potionDropChance) {
      const potion = new LootDrop(this, baseX, baseY, 'potion');
      this.loots.push(potion);
    }
  }

  /** 每幀檢查玩家距離自動拾取（≤ pickupRange），並清理已消失者 */
  private updateLoots(): void {
    const p = this.player;
    const rangeSq = LOOT_CONST.pickupRange * LOOT_CONST.pickupRange;

    // 先過濾無效的
    this.loots = this.loots.filter((loot) => loot.active && loot.scene);

    this.loots = this.loots.filter((loot) => {
      const dx = loot.x - p.x;
      const dy = loot.y - p.y;
      if (dx * dx + dy * dy <= rangeSq) {
        this.pickupLoot(loot);
        return false;
      }
      return true;
    });
  }

  private pickupLoot(loot: LootDrop): void {
    if (loot.lootType === 'gold' && typeof loot.value === 'number') {
      const v = loot.value;
      this.player.addGold(v);
      // 金色浮動文字
      showPickupText(this, loot.x, loot.y, `+${v} G`, '#ffd766');
    } else if (loot.lootType === 'potion') {
      const actual = this.player.heal(LOOT_CONST.potionHeal);
      // 綠色浮動文字（實際回血量）
      showPickupText(this, loot.x, loot.y, `+${actual} HP`, '#33ff66');
    }
    loot.pickup();
  }
}
