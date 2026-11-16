export class OpenXiangqiClient {
    baseUrl;
    platformApiKey;
    playerToken;
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl || 'https://backend-chinachess.d0v.xyz').replace(/\/+$/, '');
        this.platformApiKey = options.platformApiKey;
        this.playerToken = options.playerToken;
    }
    setPlatformApiKey(apiKey) {
        this.platformApiKey = apiKey;
    }
    setPlayerToken(token) {
        this.playerToken = token;
    }
    async request(path, options = {}) {
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const headers = {
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
        return data;
    }
    // ==========================================
    // 1. Vendor & Auth APIs
    // ==========================================
    async vendorSendOtp(email) {
        return this.request('/api/v1/vendor/auth/send-otp', {
            method: 'POST',
            body: { email }
        });
    }
    async vendorVerifyOtp(email, code, companyName) {
        return this.request('/api/v1/vendor/auth/verify-otp', {
            method: 'POST',
            body: { email, code, companyName }
        });
    }
    async vendorCreateApiKey(vendorToken, name) {
        return this.request('/api/v1/vendor/api-keys', {
            method: 'POST',
            headers: { Authorization: `Bearer ${vendorToken}` },
            body: { name }
        });
    }
    // ==========================================
    // 2. Player Provisioning & Profile APIs
    // ==========================================
    async syncPlayer(params) {
        const res = await this.request('/api/v1/players/sync', {
            method: 'POST',
            body: params
        });
        if (res.playerToken) {
            this.playerToken = res.playerToken;
        }
        return res;
    }
    async getPlayerProfile(playerId) {
        const res = await this.request(`/api/v1/players/${playerId}`);
        return res.player;
    }
    async updatePlayerProfile(playerId, updates) {
        const res = await this.request(`/api/v1/players/${playerId}`, {
            method: 'PATCH',
            body: updates
        });
        return res.player;
    }
    // ==========================================
    // 3. Matchmaking & Room APIs
    // ==========================================
    async queueMatch(playerId, mode = 'casual', options) {
        return this.request('/api/v1/match/queue', {
            method: 'POST',
            body: { playerId, mode, rule: options?.rule, timeControl: options?.timeControl }
        });
    }
    async cancelQueue(playerId) {
        return this.request('/api/v1/match/queue', {
            method: 'DELETE',
            body: { playerId }
        });
    }
    async checkMatchStatus(playerId) {
        return this.request(`/api/v1/match/status/${playerId}`);
    }
    // Convenient helper: poll queue until matched or timeout
    async waitForMatch(playerId, mode = 'casual', timeoutMs = 20000, pollIntervalMs = 800, options) {
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
        await this.cancelQueue(playerId).catch(() => { });
        throw new Error('Matchmaking timed out');
    }
    async createFriendRoom(playerId, options) {
        const timeControl = options && 'baseTimeMs' in options ? options : options?.timeControl;
        const rule = options && 'rule' in options ? options.rule : undefined;
        return this.request('/api/v1/rooms/friend/create', {
            method: 'POST',
            body: { playerId, timeControl, rule }
        });
    }
    async joinFriendRoom(playerId, roomCode) {
        return this.request('/api/v1/rooms/friend/join', {
            method: 'POST',
            body: { playerId, roomCode }
        });
    }
    async getRoomState(roomId) {
        const res = await this.request(`/api/v1/rooms/${roomId}`);
        return res.room;
    }
    // ==========================================
    // 4. In-Game Interactive Gameplay
    // ==========================================
    async pickPiece(roomId, playerId, coord) {
        return this.request(`/api/v1/game/${roomId}/pick`, {
            method: 'POST',
            body: { playerId, coord }
        });
    }
    async dropPiece(roomId, playerId) {
        return this.request(`/api/v1/game/${roomId}/drop`, {
            method: 'POST',
            body: { playerId }
        });
    }
    async makeMove(roomId, playerId, from, to, signature) {
        return this.request(`/api/v1/game/${roomId}/move`, {
            method: 'POST',
            body: { playerId, from, to, signature }
        });
    }
    async sendAction(roomId, playerId, action) {
        return this.request(`/api/v1/game/${roomId}/action`, {
            method: 'POST',
            body: { playerId, action }
        });
    }
    async resign(roomId, playerId) {
        return this.sendAction(roomId, playerId, 'resign');
    }
    async offerDraw(roomId, playerId) {
        return this.sendAction(roomId, playerId, 'offer_draw');
    }
    async acceptDraw(roomId, playerId) {
        return this.sendAction(roomId, playerId, 'accept_draw');
    }
    async rejectDraw(roomId, playerId) {
        return this.sendAction(roomId, playerId, 'reject_draw');
    }
    async claimTimeout(roomId, playerId) {
        return this.request(`/api/v1/game/${roomId}/claim-timeout`, {
            method: 'POST',
            body: { playerId }
        });
    }
    async sendChat(roomId, playerId, type, content) {
        return this.request(`/api/v1/game/${roomId}/chat`, {
            method: 'POST',
            body: { playerId, type, content }
        });
    }
    async getQuickPhrases() {
        const res = await this.request('/api/v1/game/phrases');
        return res.phrases;
    }
    async getEmotes() {
        const res = await this.request('/api/v1/game/emotes');
        return res.emotes;
    }
    // ==========================================
    // 5. Real-Time Room Event Stream (SSE)
    // ==========================================
    subscribeRoomEvents(roomId, handlers) {
        const sseUrl = `${this.baseUrl}/api/v1/rooms/${roomId}/events`;
        // 1. Browser native EventSource
        if (typeof EventSource !== 'undefined') {
            const es = new EventSource(sseUrl);
            es.addEventListener('connected', (e) => {
                try {
                    handlers.onConnected?.(JSON.parse(e.data));
                }
                catch (_) { }
            });
            es.addEventListener('room_snapshot', (e) => {
                try {
                    handlers.onRoomSnapshot?.(JSON.parse(e.data));
                }
                catch (_) { }
            });
            es.addEventListener('player_joined', (e) => {
                try {
                    handlers.onPlayerJoined?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('game_started', (e) => {
                try {
                    handlers.onGameStarted?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('piece_picked', (e) => {
                try {
                    handlers.onPiecePicked?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('piece_dropped', (e) => {
                try {
                    handlers.onPieceDropped?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('move_made', (e) => {
                try {
                    handlers.onMoveMade?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('piece_revealed', (e) => {
                try {
                    handlers.onPieceRevealed?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('chat_message', (e) => {
                try {
                    handlers.onChatMessage?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('draw_offered', (e) => {
                try {
                    handlers.onDrawOffered?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
            });
            es.addEventListener('game_over', (e) => {
                try {
                    handlers.onGameOver?.(JSON.parse(e.data).payload);
                }
                catch (_) { }
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
                if (!response.body)
                    return;
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';
                    for (const block of lines) {
                        let eventType = 'message';
                        let dataStr = '';
                        for (const line of block.split('\n')) {
                            if (line.startsWith('event: ')) {
                                eventType = line.slice(7).trim();
                            }
                            else if (line.startsWith('data: ')) {
                                dataStr = line.slice(6).trim();
                            }
                        }
                        if (!dataStr)
                            continue;
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
                        }
                        catch (_) { }
                    }
                }
            }
            catch (err) {
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
//# sourceMappingURL=client.js.map