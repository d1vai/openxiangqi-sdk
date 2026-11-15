export type Side = 'red' | 'black';
export type PieceType = 'k' | 'a' | 'b' | 'n' | 'r' | 'c' | 'p';
export type Coord = [number, number];

export interface Piece {
  type: PieceType;
  side: Side;
}

export type MoveNature = 
  | 'CHECK'
  | 'THREATEN'
  | 'CHASE'
  | 'EXCHANGE'
  | 'PROTECT'
  | 'BLOCK'
  | 'IDLE';

export type GameTermination = 
  | 'CHECKMATE'
  | 'STALEMATE'
  | 'CONTINUOUS_CHECK_FOUL'
  | 'CONTINUOUS_CHASE_FOUL'
  | 'CONTINUOUS_THREAT_FOUL'
  | 'ONE_CHECK_ONE_CHASE'
  | 'NATURAL_LIMIT_DRAW'
  | 'CYCLE_DRAW'
  | 'MUTUAL_DRAW'
  | 'RESIGNATION'
  | 'TIMEOUT';

export type GameMode = 'ranked' | 'casual' | 'friend';
export type RoomStatus = 'waiting' | 'playing' | 'ended';

export interface TimeControl {
  baseTimeMs: number;
  incrementMs: number;
}

export interface ClockState {
  redTimeLeftMs: number;
  blackTimeLeftMs: number;
  lastTurnTimestamp: number;
}

export interface MatchRecord {
  matchId: string;
  opponentId: string;
  opponentNickname: string;
  side: Side;
  result: 'win' | 'loss' | 'draw';
  termination: string;
  deltaElo: number;
  timestamp: number;
}

export interface Player {
  id: string;
  vendorId: string;
  vendorUserId: string;
  nickname: string;
  avatarUrl: string;
  eloRating: number;
  tierLevel: number;
  totalGames: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: string;
  isBot: boolean;
  suiAddress?: string;
  recentMatches?: MatchRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface Room {
  id: string;
  roomCode?: string;
  mode: GameMode;
  status: RoomStatus;
  timeControl: TimeControl;
  clock: ClockState;
  turn: Side;
  fen: string;
  redPlayerId: string | null;
  blackPlayerId: string | null;
  pickedPiece?: { side: Side; coord: Coord; timestamp: number } | null;
  winnerId?: string | null;
  terminationReason?: GameTermination | null;
  vrfSeed?: string | null;
}

export interface QuickPhrase {
  id: string;
  text: string;
}

export interface Emote {
  id: string;
  name: string;
  code: string;
  icon: string;
}

export interface MoveDecision {
  valid: boolean;
  reason?: string;
  isCheck: boolean;
  moveNature: MoveNature;
  terminated: boolean;
  winner?: Side;
  terminationType?: GameTermination;
}

export interface MoveResult {
  success: boolean;
  reason?: string;
  decision?: MoveDecision;
  fen?: string;
}

export interface RoomEventHandlers {
  onConnected?: (data: { roomId: string; message: string }) => void;
  onRoomSnapshot?: (snapshot: {
    roomId: string;
    status: RoomStatus;
    turn: Side;
    fen: string;
    clock: ClockState;
    redPlayerId: string | null;
    blackPlayerId: string | null;
    winnerId: string | null;
    terminationReason: GameTermination | null;
    pickedPiece: any;
  }) => void;
  onPlayerJoined?: (data: { playerId: string; side: Side; roomCode?: string }) => void;
  onGameStarted?: (data: { roomId: string; fen: string; redPlayerId: string; blackPlayerId: string }) => void;
  onPiecePicked?: (data: { playerId: string; side: Side; piece: PieceType; coord: Coord }) => void;
  onPieceDropped?: (data: { playerId: string; side: Side }) => void;
  onMoveMade?: (data: {
    playerId: string;
    side: Side;
    from: Coord;
    to: Coord;
    fen: string;
    isCheck: boolean;
    nature: MoveNature;
    turn: Side;
    clock: ClockState;
    signature?: string;
  }) => void;
  onChatMessage?: (data: { fromPlayerId: string; type: string; text?: string; emote?: Emote }) => void;
  onDrawOffered?: (data: { fromPlayerId: string }) => void;
  onGameOver?: (data: { roomId: string; winnerId: string | null; reason: GameTermination; settlement: any }) => void;
  onError?: (error: any) => void;
}
