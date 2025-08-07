import { Property } from './types';

export const INITIAL_MONEY = 1500;
export const MAX_PLAYERS = 6;
export const BANK_ID = 'bank';
export const PASS_GO_MONEY = 200;

export const BOARD_SQUARES: Property[] = [
    { id: 'go', name: 'Salida', type: 'go', position: { row: 11, col: 11 } },
    { id: 'mediterranean', name: 'Av. Mediterráneo', type: 'street', color: '#6A4F3B', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, position: { row: 11, col: 10 } },
    { id: 'community-chest-1', name: 'Arca Comunal', type: 'community-chest', position: { row: 11, col: 9 } },
    { id: 'baltic', name: 'Calle Báltica', type: 'street', color: '#6A4F3B', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, position: { row: 11, col: 8 } },
    { id: 'income-tax', name: 'Impuesto sobre Ingresos', type: 'tax', price: 200, position: { row: 11, col: 7 } },
    { id: 'reading-railroad', name: 'Ferrocarril Reading', type: 'railroad', price: 200, rent: [25, 50, 100, 200], position: { row: 11, col: 6 } },
    { id: 'oriental', name: 'Av. Oriental', type: 'street', color: '#AEE4FF', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, position: { row: 11, col: 5 } },
    { id: 'chance-1', name: 'Suerte', type: 'chance', position: { row: 11, col: 4 } },
    { id: 'vermont', name: 'Av. Vermont', type: 'street', color: '#AEE4FF', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, position: { row: 11, col: 3 } },
    { id: 'connecticut', name: 'Av. Connecticut', type: 'street', color: '#AEE4FF', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, position: { row: 11, col: 2 } },
    { id: 'jail', name: 'Cárcel / De Visita', type: 'jail', position: { row: 11, col: 1 } },
    { id: 'stcharles', name: 'Plaza San Carlos', type: 'street', color: '#D93A96', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, position: { row: 10, col: 1 } },
    { id: 'electric-company', name: 'Compañía de Electricidad', type: 'utility', price: 150, rent: [4, 10], position: { row: 9, col: 1 } },
    { id: 'states', name: 'Av. de los Estados', type: 'street', color: '#D93A96', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, position: { row: 8, col: 1 } },
    { id: 'virginia', name: 'Av. Virginia', type: 'street', color: '#D93A96', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, position: { row: 7, col: 1 } },
    { id: 'pennsylvania-railroad', name: 'Ferrocarril Pensilvania', type: 'railroad', price: 200, rent: [25, 50, 100, 200], position: { row: 6, col: 1 } },
    { id: 'stjames', name: 'Lugar de San Jaime', type: 'street', color: '#F7941D', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, position: { row: 5, col: 1 } },
    { id: 'community-chest-2', name: 'Arca Comunal', type: 'community-chest', position: { row: 4, col: 1 } },
    { id: 'tennessee', name: 'Av. Tennessee', type: 'street', color: '#F7941D', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, position: { row: 3, col: 1 } },
    { id: 'newyork', name: 'Av. Nueva York', type: 'street', color: '#F7941D', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, position: { row: 2, col: 1 } },
    { id: 'free-parking', name: 'Parking Gratuito', type: 'free-parking', position: { row: 1, col: 1 } },
    { id: 'kentucky', name: 'Av. Kentucky', type: 'street', color: '#ED1C24', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, position: { row: 1, col: 2 } },
    { id: 'chance-2', name: 'Suerte', type: 'chance', position: { row: 1, col: 3 } },
    { id: 'indiana', name: 'Av. Indiana', type: 'street', color: '#ED1C24', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, position: { row: 1, col: 4 } },
    { id: 'illinois', name: 'Av. Illinois', type: 'street', color: '#ED1C24', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, position: { row: 1, col: 5 } },
    { id: 'bo-railroad', name: 'Ferrocarril B. & O.', type: 'railroad', price: 200, rent: [25, 50, 100, 200], position: { row: 1, col: 6 } },
    { id: 'atlantic', name: 'Av. Atlántico', type: 'street', color: '#FFEB00', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, position: { row: 1, col: 7 } },
    { id: 'ventnor', name: 'Av. Ventnor', type: 'street', color: '#FFEB00', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, position: { row: 1, col: 8 } },
    { id: 'water-works', name: 'Compañía de Agua', type: 'utility', price: 150, rent: [4, 10], position: { row: 1, col: 9 } },
    { id: 'marvin', name: 'Jardines Marvin', type: 'street', color: '#FFEB00', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, position: { row: 1, col: 10 } },
    { id: 'go-to-jail', name: 'Vaya a la Cárcel', type: 'go-to-jail', position: { row: 1, col: 11 } },
    { id: 'pacific', name: 'Av. Pacífico', type: 'street', color: '#20B04D', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, position: { row: 2, col: 11 } },
    { id: 'northcarolina', name: 'Av. Carolina del Norte', type: 'street', color: '#20B04D', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, position: { row: 3, col: 11 } },
    { id: 'community-chest-3', name: 'Arca Comunal', type: 'community-chest', position: { row: 4, col: 11 } },
    { id: 'pennsylvania-ave', name: 'Av. Pensilvania', type: 'street', color: '#20B04D', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, position: { row: 5, col: 11 } },
    { id: 'short-line-railroad', name: 'Ferrocarril Vía Rápida', type: 'railroad', price: 200, rent: [25, 50, 100, 200], position: { row: 6, col: 11 } },
    { id: 'chance-3', name: 'Suerte', type: 'chance', position: { row: 7, col: 11 } },
    { id: 'park', name: 'Lugar del Parque', type: 'street', color: '#0072BB', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, position: { row: 8, col: 11 } },
    { id: 'luxury-tax', name: 'Impuesto de Lujo', type: 'tax', price: 100, position: { row: 9, col: 11 } },
    { id: 'boardwalk', name: 'Paseo Tablado', type: 'street', color: '#0072BB', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, position: { row: 10, col: 11 } },
];

export const PROPERTIES = BOARD_SQUARES.filter(s => ['street', 'railroad', 'utility'].includes(s.type));

export const PLAYER_COLORS = [
    '#ED1C24', // Red
    '#0072BB', // Blue
    '#20B04D', // Green
    '#FFEB00', // Yellow
    '#333333', // Black
    '#F7941D', // Orange
];