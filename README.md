# @d1vai/openxiangqi-sdk

> Official TypeScript / JavaScript SDK for **OpenXiangqi (中国象棋开放云中台)**.
> 开箱即用的多厂商象棋中台客户端，兼容浏览器端、Node.js、Web Worker、小游戏与各大前端框架（React / Vue / Svelte / Three.js）。

---

## 📦 安装 (Installation)

```bash
npm install @d1vai/openxiangqi-sdk
# or
pnpm add @d1vai/openxiangqi-sdk
# or
yarn add @d1vai/openxiangqi-sdk
```

---

## 🚀 核心架构与快速接入指南

### 1. 厂商端：认证并同步游戏玩家 (Vendor Backend)

```typescript
import { OpenXiangqiClient } from '@d1vai/openxiangqi-sdk';

const client = new OpenXiangqiClient({
  baseUrl: 'https://backend-chinachess.d0v.xyz',
  platformApiKey: 'oxq_live_your_vendor_secret_key'
});

// 将你产品内的用户同步为 OpenXiangqi 全局棋手
const { player, playerToken } = await client.syncPlayer({
  vendorUserId: 'user_10086',
  nickname: '棋逢对手',
  avatarUrl: 'https://example.com/avatar.png'
});

console.log('玩家 ID:', player.id);
console.log('玩家当前段位:', player.tierLevel); // 1 (九品) ~ 9 (一品/特级大师)
console.log('玩家胜率:', player.winRate);       // e.g. "66.7%"
```

---

### 2. 玩家端：实时匹配与对弈 (Client Game Loop)

```typescript
import { OpenXiangqiClient } from '@d1vai/openxiangqi-sdk';

const client = new OpenXiangqiClient({
  baseUrl: 'https://backend-chinachess.d0v.xyz',
  playerToken: 'YOUR_PLAYER_TOKEN'
});

// 1. 快速匹配 / 天梯排位
const room = await client.waitForMatch('PLAYER_ID', 'ranked');
console.log('对局开始！房间 ID:', room.id, '执红执黑:', room.redPlayerId === 'PLAYER_ID' ? '红方' : '黑方');

// 2. 订阅房间实时事件流 (SSE / 双向通信)
const unsubscribe = client.subscribeRoomEvents(room.id, {
  onPiecePicked: ({ playerId, side, piece, coord }) => {
    console.log(`对手拿起棋子: ${piece} at [${coord[0]}, ${coord[1]}]`);
  },
  onPieceDropped: () => {
    console.log('对手放下棋子');
  },
  onMoveMade: ({ from, to, fen, isCheck, nature, clock }) => {
    console.log(`对手走子: [${from}] -> [${to}], 是否将军: ${isCheck}, 着法性质: ${nature}`);
  },
  onChatMessage: ({ fromPlayerId, type, text, emote }) => {
    if (type === 'quick_phrase') console.log('台词语音:', text);
    if (type === 'emote') console.log('动效表情:', emote?.name, emote?.icon);
  },
  onGameOver: ({ winnerId, reason, settlement }) => {
    console.log('对局结束！胜方:', winnerId, '原因:', reason);
    unsubscribe();
  }
});

// 3. 摸子（拿起棋子广播）
await client.pickPiece(room.id, 'PLAYER_ID', [1, 2]);

// 4. 落子行走（炮二平五）
const result = await client.makeMove(room.id, 'PLAYER_ID', [1, 2], [4, 2]);
if (!result.success) {
  console.error('非法着法或违规:', result.reason);
}

// 5. 发送经典语音台词与动效表情
await client.sendChat(room.id, 'PLAYER_ID', 'quick_phrase', 'QP01'); // "快点吧，我等的花都谢了！"
await client.sendChat(room.id, 'PLAYER_ID', 'emote', 'EM_THUMBS_UP'); // 点赞抱拳
```

---

### 3. 好友开房与密码对局 (Friend Room)

```typescript
// 房主建房
const { roomCode, room } = await client.createFriendRoom('PLAYER_ID', {
  baseTimeMs: 10 * 60 * 1000, // 10 分钟局时
  incrementMs: 3 * 1000       // 每步加 3 秒
});
console.log('6位房间密码:', roomCode);

// 好友进房
const joined = await client.joinFriendRoom('FRIEND_PLAYER_ID', roomCode);
```

---

### 4. 玩家个人信息修改与查询 (Profile API)

```typescript
// 查询个人战绩、胜率与历史对局
const profile = await client.getPlayerProfile('PLAYER_ID');
console.log(`胜率: ${profile.winRate}, 总局数: ${profile.totalGames}, 胜局: ${profile.wins}`);

// 修改网名与头像
const updated = await client.updatePlayerProfile('PLAYER_ID', {
  nickname: '独孤求败',
  avatarUrl: 'https://example.com/new_avatar.jpg'
});
```

---

## 📜 许可证 (License)

MIT License © 2026 d1vai
