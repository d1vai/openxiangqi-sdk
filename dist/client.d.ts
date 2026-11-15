import { Coord, Emote, GameMode, MoveResult, Player, QuickPhrase, Room, RoomEventHandlers, TimeControl } from './types.js';
export interface OpenXiangqiClientOptions {
    baseUrl?: string;
    platformApiKey?: string;
    playerToken?: string;
}
export declare class OpenXiangqiClient {
    private baseUrl;
    private platformApiKey?;
    private playerToken?;
    constructor(options?: OpenXiangqiClientOptions);
    setPlatformApiKey(apiKey: string): void;
    setPlayerToken(token: string): void;
    private request;
    vendorSendOtp(email: string): Promise<{
        success: boolean;
        message: string;
        debugCode?: string;
    }>;
    vendorVerifyOtp(email: string, code: string, companyName?: string): Promise<{
        success: boolean;
        token: string;
        vendor: any;
    }>;
    vendorCreateApiKey(vendorToken: string, name?: string): Promise<{
        success: boolean;
        apiKey: string;
        keyId: string;
        prefix: string;
    }>;
    syncPlayer(params: {
        vendorUserId: string;
        nickname?: string;
        avatarUrl?: string;
        suiAddress?: string;
    }): Promise<{
        success: boolean;
        player: Player;
        playerToken: string;
    }>;
    getPlayerProfile(playerId: string): Promise<Player>;
    updatePlayerProfile(playerId: string, updates: {
        nickname?: string;
        avatarUrl?: string;
        suiAddress?: string;
    }): Promise<Player>;
    queueMatch(playerId: string, mode?: GameMode): Promise<{
        status: 'queued' | 'matched';
        room?: Room;
    }>;
    cancelQueue(playerId: string): Promise<{
        success: boolean;
    }>;
    checkMatchStatus(playerId: string): Promise<{
        status: 'queued' | 'matched' | 'not_in_queue';
        room?: Room;
    }>;
    waitForMatch(playerId: string, mode?: GameMode, timeoutMs?: number, pollIntervalMs?: number): Promise<Room>;
    createFriendRoom(playerId: string, timeControl?: TimeControl): Promise<{
        roomCode: string;
        room: Room;
    }>;
    joinFriendRoom(playerId: string, roomCode: string): Promise<{
        room: Room;
    }>;
    getRoomState(roomId: string): Promise<Room>;
    pickPiece(roomId: string, playerId: string, coord: Coord): Promise<{
        success: boolean;
        reason?: string;
    }>;
    dropPiece(roomId: string, playerId: string): Promise<{
        success: boolean;
    }>;
    makeMove(roomId: string, playerId: string, from: Coord, to: Coord, signature?: string): Promise<MoveResult>;
    sendAction(roomId: string, playerId: string, action: 'offer_draw' | 'accept_draw' | 'reject_draw' | 'resign'): Promise<{
        success: boolean;
        message: string;
    }>;
    sendChat(roomId: string, playerId: string, type: 'quick_phrase' | 'emote' | 'text', content: string): Promise<{
        success: boolean;
        payload?: any;
        reason?: string;
    }>;
    getQuickPhrases(): Promise<QuickPhrase[]>;
    getEmotes(): Promise<Emote[]>;
    subscribeRoomEvents(roomId: string, handlers: RoomEventHandlers): () => void;
}
//# sourceMappingURL=client.d.ts.map