import {
  ChessRule,
  Coord,
  Emote,
  GameMode,
  MoveResult,
  Player,
  QuickPhrase,
  Room,
  RoomEventHandlers,
  TimeControl
} from './types.js';

export interface OpenXiangqiClientOptions {
  baseUrl?: string;
  platformApiKey?: string;
  playerToken?: string;
}

export class OpenXiangqiClient {
  private baseUrl: string;
  private platformApiKey?: string;
  private playerToken?: string;

  constructor(options: OpenXiangqiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://backend-chinachess.d0v.xyz').replace(/\/+$/, '');
    this.platformApiKey = options.platformApiKey;
    this.playerToken = options.playerToken;
  }

  public setPlatformApiKey(apiKey: string): void {
    this.platformApiKey = apiKey;
  }

  public setPlayerToken(token: string): void {
    this.playerToken = token;
  }

  private async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.platformApiKey && !headers['x-platform-key']) {
      headers['x-platform-key'] = this.platformApiKey;
    }
    if (this.playerToken && !headers['authorization']) {
      headers['authorization'] = `Bearer ${this.playerToken}`;
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return data as T;
  }

  // ==========================================
  // 1. Vendor & Auth APIs
  // ==========================================
  public async vendorSendOtp(email: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
    return this.request('/api/v1/vendor/auth/send-otp', {
      method: 'POST',
      body: { email }
    });
  }

  public async vendorVerifyOtp(
    email: string,
    code: string,
    companyName?: string
  ): Promise<{ success: boolean; token: string; vendor: any }> {
    return this.request('/api/v1/vendor/auth/verify-otp', {
      method: 'POST',
      body: { email, code, companyName }
    });
  }

  public async vendorCreateApiKey(
    vendorToken: string,
    name?: string
  ): Promise<{ success: boolean; apiKey: string; keyId: string; prefix: string }> {
    return this.request('/api/v1/vendor/api-keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { name }
    });
  }

  // ==========================================
  // 2. Player Provisioning & Profile APIs
  // ==========================================
  public async syncPlayer(params: {
    vendorUserId: string;
    nickname?: string;
    avatarUrl?: string;
    suiAddress?: string;
  }): Promise<{ success: boolean; player: Player; playerToken: string }> {
    const res = await this.request('/api/v1/players/sync', {
      method: 'POST',
      body: params
    });
    if (res.playerToken) {
      this.playerToken = res.playerToken;
    }
    return res;
  }

  public async getPlayerProfile(playerId: string): Promise<Player> {
    const res = await this.request(`/api/v1/players/${playerId}`);
    return res.player;
  }

  public async updatePlayerProfile(
    playerId: string,
    updates: { nickname?: string; avatarUrl?: string; suiAddress?: string }
  ): Promise<Player> {
    const res = await this.request(`/api/v1/players/${playerId}`, {
      method: 'PATCH',
      body: updates
    });
    return res.player;
  }

  // ==========================================
  // 3. Matchmaking & Room APIs
  // ==========================================
  public async queueMatch(
    playerId: string,
    mode: GameMode = 'casual',
    options?: { rule?: ChessRule; timeControl?: TimeControl }
  ): Promise<{ status: 'queued' | 'matched'; room?: Room }> {
    return this.request('/api/v1/match/queue', {
      method: 'POST',
      body: { playerId, mode, rule: options?.rule, timeControl: options?.timeControl }
    });
  }

  public async cancelQueue(playerId: string): Promise<{ success: boolean }> {
    return this.request('/api/v1/match/queue', {
      method: 'DELETE',
      body: { playerId }
    });
  }

  public async checkMatchStatus(
    playerId: string
  ): Promise<{ status: 'queued' | 'matched' | 'not_in_queue'; room?: Room }> {
    return this.request(`/api/v1/match/status/${playerId}`);
  }

  // Convenient helper: poll queue until matched or timeout
  public async waitForMatch(
    playerId: string,
    mode: GameMode = 'casual',
    timeoutMs: number = 20000,
    pollIntervalMs: number = 800,
    options?: { rule?: ChessRule; timeControl?: TimeControl }
  ): Promise<Room> {
    const initial = await this.queueMatch(playerId, mode, options);
    if (initial.status === 'matched' && initial.room) {
      return initial.room;
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const status = await this.checkMatchStatus(playerId);
      if (status.status === 'matched' && status.room) {
        return status.room;
      }
    }

    await this.cancelQueue(playerId).catch(() => {});
    throw new Error('Matchmaking timed out');
  }

  public async createFriendRoom(
    playerId: string,
    options?: TimeControl | { rule?: ChessRule; timeControl?: TimeControl }
  ): Promise<{ roomCode: string; room: Room }> {
    const timeControl = options && 'baseTimeMs' in options ? options : (options as any)?.timeControl;
    const rule = options && 'rule' in options ? (options as any).rule : undefined;
    return this.request('/api/v1/rooms/friend/create', {
      method: 'POST',
      body: { playerId, timeControl, rule }
    });
  }

  public async joinFriendRoom(playerId: string, roomCode: string): Promise<{ room: Room }> {
    return this.request('/api/v1/rooms/friend/join', {
      method: 'POST',
      body: { playerId, roomCode }
    });
  }

  public async getRoomState(roomId: string): Promise<Room> {
    const res = await this.request(`/api/v1/rooms/${roomId}`);
    return res.room;
  }

  // ==========================================
  // 4. In-Game Interactive Gameplay
  // ==========================================
  public async pickPiece(
    roomId: string,
    playerId: string,
    coord: Coord
  ): Promise<{ success: boolean; reason?: string }> {
    return this.request(`/api/v1/game/${roomId}/pick`, {
      method: 'POST',
      body: { playerId, coord }
    });
  }

  public async dropPiece(roomId: string, playerId: string): Promise<{ success: boolean }> {
    return this.request(`/api/v1/game/${roomId}/drop`, {
      method: 'POST',
      body: { playerId }
    });
  }

  public async makeMove(
    roomId: string,
    playerId: string,
    from: Coord,
    to: Coord,
    signature?: string
  ): Promise<MoveResult> {
    return this.request(`/api/v1/game/${roomId}/move`, {
      method: 'POST',
      body: { playerId, from, to, signature }
    });
  }

  public async sendAction(
    roomId: string,
    playerId: string,
    action: 'offer_draw' | 'accept_draw' | 'reject_draw' | 'resign'
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/v1/game/${roomId}/action`, {
      method: 'POST',
      body: { playerId, action }
    });
  }

  public async resign(roomId: string, playerId: string): Promise<{ success: boolean; message: string }> {
    return this.sendAction(roomId, playerId, 'resign');
  }

  public async offerDraw(roomId: string, playerId: string): Promise<{ success: boolean; message: string }> {
    return this.sendAction(roomId, playerId, 'offer_draw');
  }

  public async acceptDraw(roomId: string, playerId: string): Promise<{ success: boolean; message: string }> {
    return this.sendAction(roomId, playerId, 'accept_draw');
  }

  public async rejectDraw(roomId: string, playerId: string): Promise<{ success: boolean; message: string }> {
    return this.sendAction(roomId, playerId, 'reject_draw');
  }

  public async claimTimeout(
    roomId: string,
    playerId: string
  ): Promise<{ success: boolean; timedOut: boolean; message: string; winnerId?: string | null }> {
    return this.request(`/api/v1/game/${roomId}/claim-timeout`, {
      method: 'POST',
      body: { playerId }
    });
  }

  public async sendChat(
    roomId: string,
    playerId: string,
    type: 'quick_phrase' | 'emote' | 'text',
    content: string
  ): Promise<{ success: boolean; payload?: any; reason?: string }> {
    return this.request(`/api/v1/game/${roomId}/chat`, {
      method: 'POST',
      body: { playerId, type, content }
    });
  }

  public async getQuickPhrases(): Promise<QuickPhrase[]> {
    const res = await this.request('/api/v1/game/phrases');
    return res.phrases;
  }

  public async getEmotes(): Promise<Emote[]> {
    const res = await this.request('/api/v1/game/emotes');
    return res.emotes;
  }

  // ==========================================
  // 5. Real-Time Room Event Stream (SSE)
  // ==========================================
  public subscribeRoomEvents(roomId: string, handlers: RoomEventHandlers): () => void {
    const sseUrl = `${this.baseUrl}/api/v1/rooms/${roomId}/events`;

    // 1. Browser native EventSource
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource(sseUrl);

      es.addEventListener('connected', (e: any) => {
        try {
          handlers.onConnected?.(JSON.parse(e.data));
        } catch (_) {}
      });

      es.addEventListener('room_snapshot', (e: any) => {
        try {
          handlers.onRoomSnapshot?.(JSON.parse(e.data));
        } catch (_) {}
      });

      es.addEventListener('player_joined', (e: any) => {
        try {
          handlers.onPlayerJoined?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('game_started', (e: any) => {
        try {
          handlers.onGameStarted?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('piece_picked', (e: any) => {
        try {
          handlers.onPiecePicked?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('piece_dropped', (e: any) => {
        try {
          handlers.onPieceDropped?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('move_made', (e: any) => {
        try {
          handlers.onMoveMade?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('piece_revealed', (e: any) => {
        try {
          handlers.onPieceRevealed?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('chat_message', (e: any) => {
        try {
          handlers.onChatMessage?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('draw_offered', (e: any) => {
        try {
          handlers.onDrawOffered?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.addEventListener('game_over', (e: any) => {
        try {
          handlers.onGameOver?.(JSON.parse(e.data).payload);
        } catch (_) {}
      });

      es.onerror = (err) => {
        handlers.onError?.(err);
      };

      return () => {
        es.close();
      };
    }

    // 2. Fallback: Streaming fetch for Node.js / non-browser environments
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(sseUrl, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' }
        });
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            let eventType = 'message';
            let dataStr = '';

            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.slice(6).trim();
              }
            }

            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              const payload = parsed.payload || parsed;
              switch (eventType) {
                case 'connected':
                  handlers.onConnected?.(payload);
                  break;
                case 'room_snapshot':
                  handlers.onRoomSnapshot?.(payload);
                  break;
                case 'player_joined':
                  handlers.onPlayerJoined?.(payload);
                  break;
                case 'game_started':
                  handlers.onGameStarted?.(payload);
                  break;
                case 'piece_picked':
                  handlers.onPiecePicked?.(payload);
                  break;
                case 'piece_dropped':
                  handlers.onPieceDropped?.(payload);
                  break;
                case 'move_made':
                  handlers.onMoveMade?.(payload);
                  break;
                case 'piece_revealed':
                  handlers.onPieceRevealed?.(payload);
                  break;
                case 'chat_message':
                  handlers.onChatMessage?.(payload);
                  break;
                case 'draw_offered':
                  handlers.onDrawOffered?.(payload);
                  break;
                case 'game_over':
                  handlers.onGameOver?.(payload);
                  break;
              }
            } catch (_) {}
          }
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          handlers.onError?.(err);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }
}
