
import { useReducer } from 'react';
import { GameState, GameAction, Player, HistoryEntry } from '../types';
import { INITIAL_MONEY, PROPERTIES, BANK_ID, PASS_GO_MONEY } from '../constants';

const initialState: GameState = {
  players: [],
  properties: {},
  bankProperties: [],
  history: [],
};

const createHistoryEntry = (message: string): HistoryEntry => ({
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    message,
});

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      const { playerNames } = action.payload;
      const players: Player[] = playerNames.map((name, index) => ({
        id: `player-${index + 1}`,
        name,
        money: INITIAL_MONEY,
        properties: [],
        buildings: {}
      }));
      const properties = PROPERTIES.reduce((acc, prop) => {
        acc[prop.id] = { ownerId: null, mortgaged: false };
        return acc;
      }, {} as Record<string, { ownerId: string | null; mortgaged: boolean }>);

      return {
        players,
        properties,
        bankProperties: PROPERTIES.map(p => p.id),
        history: [createHistoryEntry('La partida ha comenzado.')],
      };
    }
    case 'SET_STATE':
        return action.payload;
    case 'TRANSFER_MONEY': {
        const { fromId, toId, amount } = action.payload;
        if (amount === 0) return state; // Only prevent zero-amount transfers

        const players = state.players.map(p => {
            if (p.id === fromId && fromId !== BANK_ID) {
                return { ...p, money: p.money - amount };
            }
            if (p.id === toId && toId !== BANK_ID) {
                return { ...p, money: p.money + amount };
            }
            return p;
        });

        const fromPlayer = state.players.find(p => p.id === fromId);
        const toPlayer = state.players.find(p => p.id === toId);
        const fromName = fromId === BANK_ID ? 'El Banco' : fromPlayer?.name || 'Jugador';
        const toName = toId === BANK_ID ? 'el Banco' : toPlayer?.name || 'Jugador';
        
        let message;
        const absAmount = Math.abs(amount).toLocaleString();
        if (amount > 0) {
            message = `${fromName} pagó $${absAmount} a ${toName}.`;
        } else {
            // If amount is negative, the direction is reversed (to -> from)
            message = `${toName} pagó $${absAmount} a ${fromName}.`;
        }

        return { 
            ...state,
            players,
            history: [...state.history, createHistoryEntry(message)] 
        };
    }
    case 'BUY_PROPERTY': {
        const { playerId, propertyId, price } = action.payload;
        const player = state.players.find(p => p.id === playerId);
        const property = PROPERTIES.find(p => p.id === propertyId);
        if (!player || !property) return state;
        
        const players = state.players.map(p => 
            p.id === playerId ? { ...p, money: p.money - price, properties: [...p.properties, propertyId] } : p
        );
        const properties = { ...state.properties, [propertyId]: { ownerId: playerId, mortgaged: false } };
        const bankProperties = state.bankProperties.filter(id => id !== propertyId);
        const message = `${player.name} compró ${property.name} por $${price.toLocaleString()}.`;

        return { 
            ...state, 
            players, 
            properties, 
            bankProperties, 
            history: [...state.history, createHistoryEntry(message)] 
        };
    }
    case 'BUILD_HOUSE': {
      const { playerId, propertyId, cost } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      const property = PROPERTIES.find(p => p.id === propertyId);
      if (!player || !property) return state;

      const currentBuildings = player.buildings[propertyId] || 0;
      
      const players = state.players.map(p => {
        if (p.id === playerId) {
          const newBuildings = { ...p.buildings };
          newBuildings[propertyId] = currentBuildings + 1;
          return { ...p, money: p.money - cost, buildings: newBuildings };
        }
        return p;
      });

      const buildingType = currentBuildings < 4 ? 'una casa' : 'un hotel';
      const message = `${player.name} construyó ${buildingType} en ${property.name}.`;

      return { ...state, players, history: [...state.history, createHistoryEntry(message)] };
    }
    case 'PASS_GO': {
        const { playerId } = action.payload;
        const player = state.players.find(p => p.id === playerId);
        if (!player) return state;

        const players = state.players.map(p =>
            p.id === playerId ? { ...p, money: p.money + PASS_GO_MONEY } : p
        );

        const message = `${player.name} cobró $${PASS_GO_MONEY.toLocaleString()} por pasar por la Salida.`;
        return { ...state, players, history: [...state.history, createHistoryEntry(message)] };
    }
    case 'MORTGAGE_PROPERTY': {
        const { playerId, propertyId } = action.payload;
        const player = state.players.find(p => p.id === playerId);
        const propertyInfo = state.properties[propertyId];
        const propertyData = PROPERTIES.find(p => p.id === propertyId);

        if (!player || !propertyData || typeof propertyData.price === 'undefined' || propertyInfo.ownerId !== playerId || propertyInfo.mortgaged) return state;

        const mortgageValue = propertyData.price / 2;
        const players = state.players.map(p => 
            p.id === playerId ? { ...p, money: p.money + mortgageValue } : p
        );
        const properties = { ...state.properties, [propertyId]: { ...propertyInfo, mortgaged: true }};
        const message = `${player.name} hipotecó ${propertyData.name} y recibió $${mortgageValue.toLocaleString()}.`;
        
        return { ...state, players, properties, history: [...state.history, createHistoryEntry(message)] };
    }
    case 'UNMORTGAGE_PROPERTY': {
        const { playerId, propertyId } = action.payload;
        const player = state.players.find(p => p.id === playerId);
        const propertyInfo = state.properties[propertyId];
        const propertyData = PROPERTIES.find(p => p.id === propertyId);

        if (!player || !propertyData || typeof propertyData.price === 'undefined' || propertyInfo.ownerId !== playerId || !propertyInfo.mortgaged) return state;

        const unmortgageCost = Math.ceil((propertyData.price / 2) * 1.1);
        if (player.money < unmortgageCost) return state; // Not enough money

        const players = state.players.map(p => 
            p.id === playerId ? { ...p, money: p.money - unmortgageCost } : p
        );
        const properties = { ...state.properties, [propertyId]: { ...propertyInfo, mortgaged: false }};
        const message = `${player.name} pagó la hipoteca de ${propertyData.name} por $${unmortgageCost.toLocaleString()}.`;

        return { ...state, players, properties, history: [...state.history, createHistoryEntry(message)] };
    }
    default:
      return state;
  }
}

export const useGameEngine = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return { gameState: state, dispatch };
};
