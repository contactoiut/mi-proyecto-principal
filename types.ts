export interface Property {
  id: string;
  name: string;
  type: 'street' | 'railroad' | 'utility' | 'chance' | 'community-chest' | 'tax' | 'go' | 'jail' | 'free-parking' | 'go-to-jail';
  color?: string;
  price?: number;
  rent?: number[];
  houseCost?: number;
  hotelCost?: number;
  position: { row: number, col: number };
}

export interface Player {
  id: string;
  name: string;
  money: number;
  properties: string[]; // Array of property IDs
  buildings: Record<string, number>; // propertyId: houseCount (5 = hotel)
  status: 'connected' | 'disconnected';
}

export interface HistoryEntry {
  id:string;
  timestamp: number;
  message: string;
}

export interface GameState {
  players: Player[];
  properties: Record<string, { ownerId: string | null; mortgaged: boolean }>; // propertyId: { ownerId, mortgaged }
  bankProperties: string[]; // Array of unsold property IDs
  history: HistoryEntry[];
}

export type GameAction =
  | { type: 'INITIALIZE_GAME'; payload: { playerNames: string[] } }
  | { type: 'ADD_PLAYER'; payload: { playerName: string } }
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'TRANSFER_MONEY'; payload: { fromId: string; toId: string; amount: number } }
  | { type: 'BUY_PROPERTY'; payload: { playerId: string; propertyId: string; price: number } }
  | { type: 'BUILD_HOUSE'; payload: { playerId: string; propertyId: string; cost: number } }
  | { type: 'PASS_GO'; payload: { playerId: string } }
  | { type: 'MORTGAGE_PROPERTY'; payload: { playerId: string; propertyId: string } }
  | { type: 'UNMORTGAGE_PROPERTY'; payload: { playerId: string; propertyId: string } }
  | { type: 'PLAYER_DISCONNECTED'; payload: { playerId: string } }
  | { type: 'RECONNECT_PLAYER'; payload: { playerId: string } };

export interface PendingAction {
    id: string;
    requesterId: string;
    requesterName: string;
    message: string;
    action: GameAction;
}

export type View = 'home' | 'game' | 'board';

export interface PeerMessage {
    type: 'JOIN_REQUEST' | 'STATE_UPDATE' | 'HOST_ACTION_REQUEST' | 'ACTION_RESPONSE' | 'PLAYER_DISCONNECTED';
    payload: any;
}