
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useGameEngine } from './hooks/useGameEngine';
import { View, Player, PeerMessage, Property, HistoryEntry, PendingAction, GameAction, GameState } from './types';
import { MAX_PLAYERS, PLAYER_COLORS, BOARD_SQUARES, BANK_ID, PASS_GO_MONEY, PROPERTIES } from './constants';
import Card from './components/Card';
import Modal from './components/Modal';
import { MoneyIcon, HouseIcon, HotelIcon, PlayersIcon, BankIcon, HistoryIcon, GiftIcon, TagIcon, CheckCircleIcon, XCircleIcon, HammerIcon, MapIcon, SpinnerIcon, QRIcon } from './components/Icons';


// --- Toast Notification System (in-file due to constraints) ---

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error';
}

const Toast: React.FC<{ toast: ToastData; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const bgColor = isSuccess ? 'bg-green-500/90' : 'bg-red-500/90';
  const borderColor = isSuccess ? 'border-green-400' : 'border-red-400';
  const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

  return (
    <div className={`flex items-center p-3 rounded-lg shadow-2xl border ${bgColor} ${borderColor} text-white animate-fade-in-right`}>
      <Icon className="w-6 h-6 mr-3 flex-shrink-0" />
      <p className="text-sm font-semibold">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="ml-4 text-lg font-bold opacity-70 hover:opacity-100">&times;</button>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: ToastData[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed top-5 right-5 z-50 space-y-2 w-full max-w-xs">
    {toasts.map(toast => (
      <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
    ))}
  </div>
);

// --- Helper Functions ---
const getTextColorForBg = (hexColor?: string): 'black' | 'white' => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length !== 7) {
        return 'white'; // Default for dark backgrounds or errors
    }
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
};

// --- CONFIGURACIÓN DEL SERVIDOR DE SEÑALIZACIÓN ---
// URL del servidor de señalización en Render.
// ¡IMPORTANTE! No incluyas "https://". Solo el dominio.
const PEER_SERVER_HOST = 'mi-servidor-de-senales-render.onrender.com';

type ServerStatus = 'checking' | 'online' | 'offline' | 'local';


// --- Helper Components (Extracted to fix Rules of Hooks violation) ---

const ServerStatusIndicator = ({ serverStatus, error, onRetry }: { serverStatus: ServerStatus, error: string | null, onRetry: () => void }) => {
    switch (serverStatus) {
        case 'checking':
            return (
                <div className="flex items-center justify-center gap-2 text-slate-400 p-3 rounded-md bg-slate-800/50">
                    <SpinnerIcon className="w-5 h-5" />
                    <span>Conectando al servidor...</span>
                </div>
            );
        case 'online':
             return (
                <div className="flex items-center justify-center gap-2 text-green-300 p-3 rounded-md bg-green-500/20">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Servidor en línea</span>
                </div>
            );
        case 'offline':
            return (
                <div className="text-center">
                     <div className="flex items-center justify-center gap-2 text-red-300 p-3 rounded-md bg-red-500/20 border border-red-400/50">
                        <XCircleIcon className="w-6 h-6 flex-shrink-0" />
                        <span className="text-left">{error || 'Error de conexión con el servidor'}</span>
                    </div>
                    <button onClick={onRetry} className="mt-2 text-sm text-teal-400 hover:text-teal-300 font-semibold">Reintentar</button>
                </div>
            );
        case 'local':
             return (
                <div className="flex items-center justify-center gap-2 text-sky-300 p-3 rounded-md bg-sky-500/20">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Modo desarrollador local</span>
                </div>
            );
        default:
            return null;
    }
};

const DevPlayerSwitcher = ({ players, devPlayerViewId, onSetDevPlayerViewId }: { players: Player[], devPlayerViewId: string | null, onSetDevPlayerViewId: (id: string) => void }) => (
    <div className="absolute top-2 right-2 bg-slate-700/80 backdrop-blur-sm p-1 rounded-md text-xs flex gap-1 z-10 border border-slate-600">
        {players.map((p: Player) => (
            <button 
                key={p.id}
                onClick={() => onSetDevPlayerViewId(p.id)}
                className={`px-2 py-1 rounded ${devPlayerViewId === p.id ? 'bg-teal-500 font-bold' : 'bg-slate-600 hover:bg-slate-500'}`}
            >
                {p.name.split(' ')[0]}
            </button>
        ))}
    </div>
);

const HistoryLog = ({ history }: { history: HistoryEntry[] }) => (
    <Card className="mt-4">
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><HistoryIcon className="w-6 h-6" /> Historial de Actividad</h3>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
            {history.slice().reverse().map(entry => (
                <div key={entry.id} className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded-md font-mono">
                   <span className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:</span> {entry.message}
                </div>
            ))}
        </div>
    </Card>
);

const NetWorthIndicator = ({ gameState, propertiesData }: { gameState: GameState, propertiesData: Record<string, Property> }) => {
    const netWorths = useMemo(() => {
        return gameState.players.map(player => {
            const propertiesValue = player.properties.reduce((sum, propId) => {
                const propData = propertiesData[propId];
                if (!propData) return sum;
                const isMortgaged = gameState.properties[propId]?.mortgaged;
                let value = isMortgaged && propData.price ? propData.price / 2 : propData.price || 0;

                const buildings = player.buildings[propId] || 0;
                if (buildings > 0 && propData.houseCost) {
                    value += buildings * propData.houseCost;
                }
                return sum + value;
            }, 0);
            return { playerId: player.id, name: player.name, netWorth: player.money + propertiesValue };
        });
    }, [gameState, propertiesData]);

    const totalNetWorth = netWorths.reduce((sum, p) => sum + p.netWorth, 0);
    if (totalNetWorth === 0) return null;

    const formatNetWorth = (value: number) => {
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
        return `$${value}`;
    }
    
    return (
        <div className="w-full max-w-4xl mx-auto mt-4">
            <h3 className="text-xl font-bold text-center mb-3">Patrimonio Neto</h3>
            <div className="flex w-full h-16 bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                {netWorths.map((playerData, index) => (
                    <div
                        key={playerData.playerId}
                        style={{ width: `${(playerData.netWorth / totalNetWorth) * 100}%`, backgroundColor: PLAYER_COLORS[index] }}
                        className="flex items-center justify-center transition-all duration-500"
                    >
                       <span className="font-bold text-lg" style={{ color: getTextColorForBg(PLAYER_COLORS[index])}}>{formatNetWorth(playerData.netWorth)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- View Components ---

const HomeScreen = ({ playerName, onPlayerNameChange, hostId, onHostIdChange, onCreateGame, onJoinGame, onDevMode, error, serverStatus, onRetry, onOpenScanner }: any) => {
    
    const isInteractive = serverStatus === 'online' || serverStatus === 'local';
    
    return (
    <Card className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-teal-400 mb-2">Bancomatón</h1>
        <p className="text-slate-400 text-center mb-6">Tu banca digital para juegos de mesa</p>
        
        <div className="mb-4">
            <ServerStatusIndicator serverStatus={serverStatus} error={error} onRetry={onRetry} />
        </div>

        {error && serverStatus === 'online' && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4">{error}</div>}

        <div className="space-y-4">
            <input 
                type="text" 
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value)}
                placeholder="Tu nombre de jugador" 
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <button 
                onClick={onCreateGame} 
                disabled={!isInteractive}
                className="w-full bg-teal-600 hover:bg-teal-500 rounded-md py-3 font-bold transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
                Crear Partida
            </button>
            
            <div className="flex items-center space-x-2">
                <hr className="flex-grow border-slate-700"/>
                <span className="text-slate-500">O</span>
                <hr className="flex-grow border-slate-700"/>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={hostId}
                    onChange={(e) => onHostIdChange(e.target.value)}
                    placeholder="ID de la partida"
                    className="flex-grow w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                 <button 
                    onClick={onOpenScanner}
                    disabled={!isInteractive} 
                    className="bg-slate-700 hover:bg-slate-600 p-3 rounded-md font-bold transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
                    aria-label="Escanear código QR"
                >
                    <QRIcon className="w-6 h-6"/>
                </button>
            </div>
            <button 
                onClick={onJoinGame}
                disabled={!isInteractive} 
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-md py-3 font-bold transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
                Unirse a Partida
            </button>
            
            <div className="pt-4">
                 <button onClick={onDevMode} className="w-full text-sm text-slate-500 hover:text-teal-400 transition-colors">Entrar en Modo Desarrollador</button>
            </div>
        </div>
    </Card>
)};

const ShareModal = ({ isOpen, onClose, hostId }: { isOpen: boolean, onClose: () => void, hostId: string }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        if (!hostId) return;
        navigator.clipboard.writeText(hostId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invitar Jugadores">
            <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-slate-300">Otros jugadores pueden unirse con este ID o escaneando el código.</p>
                <div className="w-full bg-slate-900 p-3 rounded-lg flex items-center justify-between gap-2 border border-slate-700">
                     <span className="font-mono text-lg text-teal-300 truncate">{hostId}</span>
                     <button onClick={copyToClipboard} className="bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-md font-semibold text-sm transition-colors w-24 flex-shrink-0">
                        {copied ? '¡Copiado!' : 'Copiar'}
                     </button>
                </div>
                {hostId && (
                    <div className="bg-white p-4 rounded-lg mt-2">
                        <QRCodeSVG value={hostId} size={256} level="H" />
                    </div>
                )}
            </div>
        </Modal>
    );
};

const QRScannerModal: React.FC<{ isOpen: boolean; onClose: () => void; onScanSuccess: (result: string | null) => void; }> = ({ isOpen, onClose, onScanSuccess }) => {
    const onScanSuccessRef = useRef(onScanSuccess);
    onScanSuccessRef.current = onScanSuccess;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const scannerId = "qr-reader-container";
        const scanner = new Html5QrcodeScanner(
            scannerId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            },
            false
        );

        const handleSuccess = (decodedText: string) => {
            onScanSuccessRef.current(decodedText);
        };

        const handleError = (_errorMessage: string) => {
            // This callback fires every frame that a QR code is not found.
            // We can safely ignore it.
        };

        const qrReaderElement = document.getElementById(scannerId);
        if (qrReaderElement) {
            scanner.render(handleSuccess, handleError);
        }

        return () => {
            if (scanner && typeof scanner.clear === 'function') {
                scanner.clear().catch((_error: any) => {
                    // This can happen if the component unmounts before scanner is fully initialized
                    // or if it's already cleared. It's safe to ignore.
                });
            }
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Escanear Código QR">
            <div id="qr-reader-container" className="w-full bg-slate-900 rounded-lg overflow-hidden" />
            <p className="text-center text-slate-400 p-4">Apunta la cámara al código QR del anfitrión.</p>
        </Modal>
    );
};

const GameScreen = ({ gameState, myPlayer, isHost, onPlayerRequestAction, onHostDirectAction, pendingActions, onApprove, onDeny, devPlayerViewId, onSetDevPlayerViewId, onNavigateToBoard, setSelectedPropertyId, onOpenShareModal }: any) => {
    const [isPayModalOpen, setPayModalOpen] = useState(false);
    const [isHostPanelOpen, setHostPanelOpen] = useState(false);
    
    const [payTarget, setPayTarget] = useState(BANK_ID);
    const [payAmount, setPayAmount] = useState('');

    const propertiesData = useMemo(() => BOARD_SQUARES.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Property>), []);

    const isCurrentViewHost = devPlayerViewId ? devPlayerViewId === 'player-1' : isHost;

    if (!myPlayer) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-teal-400 animate-pulse">Conectando a la partida...</h2>
                <p className="text-slate-400 mt-2">Recibiendo estado del juego del anfitrión.</p>
            </div>
        );
    }

    const handleRequestPay = () => {
        const amount = parseInt(payAmount, 10);
        if (onPlayerRequestAction && !isNaN(amount) && amount !== 0) {
            onPlayerRequestAction({
                type: 'TRANSFER_MONEY',
                payload: { fromId: myPlayer.id, toId: payTarget, amount }
            });
            setPayModalOpen(false);
            setPayAmount('');
        }
    };
    
    const hasPendingActions = pendingActions.length > 0;
    const bankButtonClasses = hasPendingActions
      ? 'bg-yellow-600 hover:bg-yellow-500 animate-pulse'
      : 'bg-sky-600 hover:bg-sky-500';

    return (
        <div className="w-full max-w-4xl mx-auto relative">
             {devPlayerViewId && <DevPlayerSwitcher players={gameState.players} devPlayerViewId={devPlayerViewId} onSetDevPlayerViewId={onSetDevPlayerViewId} />}

            <Card className="mb-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <h2 className="text-2xl font-bold">{myPlayer.name}</h2>
                        <p className="text-3xl font-light text-teal-400 flex items-center gap-2"><MoneyIcon className="w-7 h-7" /> ${myPlayer.money.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {isHost && !devPlayerViewId && (
                            <button onClick={onOpenShareModal} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md font-semibold flex items-center gap-2">
                                <QRIcon className="w-5 h-5"/> Compartir / QR
                            </button>
                        )}
                        <button onClick={onNavigateToBoard} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-md font-semibold flex items-center gap-2">
                            <MapIcon className="w-5 h-5"/> Tablero
                        </button>
                        <button onClick={() => setPayModalOpen(true)} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-md font-semibold">Pagar / Cobrar</button>
                        
                        {isCurrentViewHost && (
                            <button onClick={() => setHostPanelOpen(true)} className={`${bankButtonClasses} px-4 py-2 rounded-md font-semibold flex items-center gap-2 relative transition-colors`}>
                                <BankIcon className="w-5 h-5"/> Banco
                                {hasPendingActions && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-slate-900">
                                        {pendingActions.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                    <Card>
                        <h3 className="text-xl font-bold mb-3">Mis Propiedades</h3>
                        {myPlayer.properties.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                                {myPlayer.properties.map((propId: string) => {
                                    const prop = propertiesData[propId];
                                    if (!prop) return null;
                                    const buildings = myPlayer.buildings[propId] || 0;
                                    const isMortgaged = gameState.properties[propId]?.mortgaged;
                                    const headerColor = prop.color || '#64748b'; // Fallback grey
                                    const textColor = getTextColorForBg(headerColor);
                                    
                                    return (
                                        <div key={prop.id} onClick={() => setSelectedPropertyId(propId)} className={`rounded-lg overflow-hidden shadow-lg cursor-pointer transition-all hover:shadow-teal-500/30 hover:scale-105 border border-slate-700 ${isMortgaged ? 'filter grayscale' : ''}`}>
                                            <div style={{ backgroundColor: headerColor, color: textColor }} className="px-2 py-3 text-center">
                                                <h4 className="font-bold text-sm truncate">{prop.name}</h4>
                                            </div>
                                            <div className="bg-slate-700/50 p-2 min-h-[48px] flex items-center justify-center gap-1.5">
                                                {isMortgaged ? (
                                                    <HammerIcon className="w-6 h-6 text-red-400" />
                                                ) : (
                                                    <>
                                                        {prop.type === 'street' && buildings > 0 && buildings < 5 && Array(buildings).fill(0).map((_, i) => <HouseIcon key={i} className="w-5 h-5 text-green-400" />)}
                                                        {prop.type === 'street' && buildings === 5 && <HotelIcon className="w-6 h-6 text-red-500" />}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-400">No tienes propiedades.</p>
                        )}
                    </Card>
                </div>
                
                <div className="space-y-4">
                     <Card>
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><PlayersIcon className="w-6 h-6" /> Jugadores</h3>
                        <ul className="space-y-2">
                            {gameState.players.map((p: Player, index: number) => (
                                <li key={p.id} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: PLAYER_COLORS[index]}}></div>
                                        <span className="font-semibold">{p.name}{p.id === myPlayer.id && " (Tú)"}</span>
                                    </div>
                                    <span className="text-slate-300">${p.money.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>

            <HistoryLog history={gameState.history || []} />

            {/* Modals */}
            <Modal isOpen={isPayModalOpen} onClose={() => setPayModalOpen(false)} title="Pagar o Cobrar">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Transacción con:</label>
                        <select value={payTarget} onChange={e => setPayTarget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2">
                            <option value={BANK_ID}>Banco</option>
                            {gameState.players.filter((p: Player) => p.id !== myPlayer.id).map((p: Player) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Monto (usa negativo para cobrar):</label>
                        <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Ej: 100 para pagar, -100 para cobrar" className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2" />
                    </div>
                    <button onClick={handleRequestPay} className="w-full bg-teal-600 hover:bg-teal-500 rounded-md py-2 font-bold">Enviar Solicitud</button>
                </div>
            </Modal>
            
            {isCurrentViewHost && <HostControlPanel isOpen={isHostPanelOpen} onClose={() => setHostPanelOpen(false)} pendingActions={pendingActions} onApprove={onApprove} onDeny={onDeny} players={gameState.players} bankProperties={gameState.bankProperties} propertiesData={propertiesData} onHostDirectAction={onHostDirectAction} />}
        </div>
    );
};

const BoardScreen = ({ gameState, onNavigateToGame, setSelectedPropertyId, propertiesData }: { gameState: GameState, onNavigateToGame: () => void, setSelectedPropertyId: (id: string) => void, propertiesData: Record<string, Property> }) => {
    
    const getOwner = (propertyId: string) => {
        const ownerId = gameState.properties[propertyId]?.ownerId;
        if (!ownerId) return null;
        const player = gameState.players.find(p => p.id === ownerId);
        if (!player) return null;
        const playerIndex = gameState.players.findIndex(p => p.id === ownerId);
        return { ...player, color: PLAYER_COLORS[playerIndex] };
    };

    return (
        <div className="w-full flex flex-col items-center">
             <div className="w-full max-w-4xl flex justify-end mb-2">
                <button onClick={onNavigateToGame} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-md font-semibold flex items-center gap-2">
                    <PlayersIcon className="w-5 h-5"/> Volver al Jugador
                </button>
            </div>
            <div className="w-[95vw] md:w-full aspect-square max-w-4xl mx-auto bg-slate-800 border-4 border-slate-900 p-2 grid grid-cols-11 grid-rows-11 gap-0.5">
                {BOARD_SQUARES.map(square => {
                    const isProperty = ['street', 'railroad', 'utility'].includes(square.type);
                    const owner = isProperty ? getOwner(square.id) : null;
                    const isClickable = isProperty;
                    
                    let bgColorClass = 'bg-slate-700'; // Default for tax
                    if (['utility', 'railroad'].includes(square.type)) {
                        bgColorClass = 'bg-slate-600';
                    }
                    if (square.type === 'chance') {
                        bgColorClass = 'bg-orange-500';
                    }
                    if (square.type === 'community-chest') {
                        bgColorClass = 'bg-blue-800';
                    }
                    if (square.type === 'go') {
                        bgColorClass = 'bg-slate-100';
                    }
                    if (['jail', 'free-parking', 'go-to-jail'].includes(square.type)) {
                        bgColorClass = 'bg-slate-900';
                    }

                    return (
                        <div 
                            key={square.id}
                            style={{ gridRow: square.position.row, gridColumn: square.position.col }}
                            className={`${bgColorClass} border border-slate-600/50 relative flex flex-col justify-start ${isClickable ? 'cursor-pointer hover:border-teal-400' : ''}`}
                            onClick={() => isClickable && setSelectedPropertyId(square.id)}
                        >
                            {square.type === 'street' && square.color && (
                                <div style={{ backgroundColor: square.color }} className="h-1/4 w-full"></div>
                            )}
                            
                            {owner && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white/50 shadow-lg" style={{ backgroundColor: owner.color }}></div>
                            )}
                        </div>
                    );
                })}
                <div style={{ gridRow: '2 / span 9', gridColumn: '2 / span 9' }} className="bg-slate-900 flex items-center justify-center">
                    <h1 className="text-5xl font-black text-teal-500 transform -rotate-45">Bancomatón</h1>
                </div>
            </div>
            <NetWorthIndicator gameState={gameState} propertiesData={propertiesData} />
        </div>
    );
};

const PropertyDetailModal = ({ isOpen, onClose, property, myPlayer, gameState, onPlayerRequestAction, propertiesData, addToast }: { isOpen: boolean, onClose: () => void, property: Property, myPlayer: Player, gameState: GameState, onPlayerRequestAction?: (action: GameAction) => void, propertiesData: Record<string, Property>, addToast: (message: string, type?: 'success' | 'error') => void }) => {
    const [isRentModalOpen, setRentModalOpen] = useState(false);
    const [rentTarget, setRentTarget] = useState('');
    const [diceRoll, setDiceRoll] = useState('');

    const propertyState = gameState.properties[property.id];
    const isOwner = propertyState?.ownerId === myPlayer.id;
    const buildings = isOwner ? (myPlayer.buildings[property.id] || 0) : (gameState.players.find(p => p.id === propertyState?.ownerId)?.buildings[property.id] || 0);

    const isMortgaged = propertyState?.mortgaged;
    const mortgageValue = property.price! / 2;
    const unmortgageCost = Math.ceil(mortgageValue * 1.1);
    
    const handleRequest = (action: GameAction) => {
        if(onPlayerRequestAction && isOwner) {
            onPlayerRequestAction(action);
        }
        setRentModalOpen(false);
        onClose();
    }
    
    const handleCollectRent = () => {
        if (!rentTarget || !isOwner) return;

        let rentAmount = 0;
        if(property.rent){
            const owner = gameState.players.find(p => p.id === propertyState.ownerId);
            if (!owner) return; // safety check
            
            switch (property.type) {
                case 'street':
                    rentAmount = property.rent[buildings];
                    break;
                case 'railroad':
                    const ownedRailroads = owner.properties.filter(pId => propertiesData[pId].type === 'railroad').length;
                    if (ownedRailroads > 0 && ownedRailroads <= property.rent.length) {
                       rentAmount = property.rent[ownedRailroads - 1];
                    }
                    break;
                case 'utility':
                    const parsedDiceRoll = parseInt(diceRoll, 10);
                    if (isNaN(parsedDiceRoll) || parsedDiceRoll < 2 || parsedDiceRoll > 12) {
                        addToast('Por favor, introduce una tirada de dados válida (2-12).', 'error');
                        return;
                    }
                    const ownedUtilities = owner.properties.filter(pId => propertiesData[pId].type === 'utility').length;
                    if (ownedUtilities > 0 && ownedUtilities <= property.rent.length) {
                        const multiplier = property.rent[ownedUtilities - 1];
                        rentAmount = multiplier * parsedDiceRoll;
                    }
                    break;
            }
        }
        
        handleRequest({
            type: 'TRANSFER_MONEY',
            payload: { fromId: rentTarget, toId: myPlayer.id, amount: rentAmount } // from pays to me
        });
        setDiceRoll('');
    }
    
    const RentRow = ({ label, value }: { label: React.ReactNode, value: string }) => (
        <div className="flex justify-between text-left text-sm">
            <span>{label}</span> 
            <span className="font-semibold">{value}</span>
        </div>
    );
    
    let rentToDisplay = '...';
    if (property.type === 'street' && property.rent) rentToDisplay = `$${property.rent[buildings].toLocaleString()}`;
    if (property.type === 'railroad' && property.rent) {
        const owner = gameState.players.find(p => p.id === propertyState.ownerId);
        if(owner) {
            const ownedRailroads = owner.properties.filter(pId => propertiesData[pId].type === 'railroad').length;
            rentToDisplay = `$${property.rent[ownedRailroads - 1].toLocaleString()}`;
        }
    }

    const renderCardContent = () => {
        const headerColor = property.color || '#64748b'; // Fallback grey
        const textColor = getTextColorForBg(headerColor);

        if (property.type === 'street') {
             return (
                <>
                  <div style={{ backgroundColor: headerColor }} className="text-center p-2 rounded-t-sm flex flex-col items-center">
                      <div className="text-xs font-bold uppercase" style={{color: textColor}}>TÍTULO DE PROPIEDAD</div>
                      <div className="text-xl font-bold uppercase" style={{color: textColor}}>{property.name}</div>
                      <div className="h-7 mt-1 flex items-center justify-center gap-1">
                        {buildings > 0 && buildings < 5 && Array(buildings).fill(0).map((_, i) => <HouseIcon key={i} className="w-6 h-6 text-green-600" />)}
                        {buildings === 5 && <HotelIcon className="w-7 h-7 text-red-600" />}
                      </div>
                  </div>
                  <div className="p-4 space-y-1 text-center text-black">
                      <div className="text-md font-bold">ALQUILER ${property.rent?.[0].toLocaleString()}</div>
                      <div className="px-2 pt-1 space-y-0.5">
                           <RentRow label="Con 1 Casa" value={`$${property.rent?.[1].toLocaleString()}`} />
                           <RentRow label="Con 2 Casas" value={`$${property.rent?.[2].toLocaleString()}`} />
                           <RentRow label="Con 3 Casas" value={`$${property.rent?.[3].toLocaleString()}`} />
                           <RentRow label="Con 4 Casas" value={`$${property.rent?.[4].toLocaleString()}`} />
                           <RentRow label="Con HOTEL" value={`$${property.rent?.[5].toLocaleString()}`} />
                      </div>
                      <div className="text-sm pt-3">Valor de la Hipoteca <span className="font-bold">${mortgageValue.toLocaleString()}</span></div>
                      <div className="text-sm">Cada Casa cuesta <span className="font-bold">${property.houseCost?.toLocaleString()}</span></div>
                      <div className="text-sm">Cada Hotel cuesta <span className="font-bold">${property.houseCost?.toLocaleString()}</span></div>
                      <div className="text-xs italic pt-4 px-2 text-center leading-tight">
                          Si un jugador posee todos los Solares de un grupo de color, el precio del alquiler se duplica en los Solares sin edificar de ese grupo.
                      </div>
                  </div>
                </>
             );
        }

        if (property.type === 'railroad') {
            return (
                <>
                    <div style={{ backgroundColor: headerColor }} className="p-4 rounded-t-sm text-center">
                        <div className="text-2xl font-black" style={{color: textColor}}>{property.name}</div>
                    </div>
                    <div className="p-4 space-y-2 text-center text-black">
                        <RentRow label="Alquiler" value={`$${property.rent?.[0]}`} />
                        <RentRow label="Si se poseen 2 F.C." value={`$${property.rent?.[1]}`} />
                        <RentRow label="Si se poseen 3 F.C." value={`$${property.rent?.[2]}`} />
                        <RentRow label="Si se poseen 4 F.C." value={`$${property.rent?.[3]}`} />
                        <div className="text-sm pt-3">Valor de la Hipoteca <span className="font-bold">${mortgageValue.toLocaleString()}</span></div>
                    </div>
                </>
            );
        }

        if (property.type === 'utility') {
             return (
                <>
                    <div style={{ backgroundColor: headerColor }} className="p-4 rounded-t-sm text-center">
                         <div className="text-2xl font-black" style={{color: textColor}}>{property.name}</div>
                    </div>
                    <div className="p-4 space-y-3 text-center text-black">
                       <p className="text-sm leading-tight">Si se posee una "Compañía", el alquiler es 4 veces el valor de los dados.</p>
                       <p className="text-sm leading-tight">Si se poseen las dos "Compañías", el alquiler es 10 veces el valor de los dados.</p>
                       <div className="text-sm pt-3">Valor de la Hipoteca <span className="font-bold">${mortgageValue.toLocaleString()}</span></div>
                    </div>
                </>
            );
        }
        return null;
    }


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
          <div className="font-sans max-h-[85vh] overflow-y-auto pr-2">
              <div className="bg-stone-200 text-black p-0.5 rounded-md shadow-lg border border-stone-400">
                {renderCardContent()}
              </div>
              
              {isOwner && onPlayerRequestAction && (
                <div className="pt-4 space-y-2">
                    {isRentModalOpen ? (
                       <div className="p-3 bg-slate-700 rounded-lg space-y-2">
                          <h4 className="text-sm font-bold text-teal-400">Cobrar Alquiler de:</h4>
                          <select value={rentTarget} onChange={e => setRentTarget(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2">
                               <option value="">Seleccionar jugador...</option>
                               {gameState.players.filter((p: Player) => p.id !== myPlayer.id).map((p: Player) => (
                                   <option key={p.id} value={p.id}>{p.name}</option>
                               ))}
                          </select>
                           {property.type === 'utility' && (
                               <input 
                                   type="number"
                                   value={diceRoll}
                                   onChange={e => setDiceRoll(e.target.value)}
                                   placeholder="Introduce la tirada de dados (2-12)"
                                   className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2"
                               />
                           )}
                          <div className="flex gap-2">
                              <button onClick={() => setRentModalOpen(false)} className="w-full bg-slate-600 hover:bg-slate-500 rounded-md py-2 text-xs font-bold">Cancelar</button>
                              <button onClick={handleCollectRent} disabled={!rentTarget} className="w-full bg-green-600 hover:bg-green-500 rounded-md py-2 font-bold disabled:bg-slate-600">
                                Cobrar {property.type !== 'utility' ? rentToDisplay : ''}
                              </button>
                          </div>
                       </div>
                    ) : (
                       <button onClick={() => setRentModalOpen(true)} disabled={isMortgaged} className="w-full bg-green-600 hover:bg-green-500 rounded-md py-2 font-bold disabled:bg-slate-600/50 disabled:cursor-not-allowed">Cobrar Alquiler</button>
                    )}
                 
                    {isMortgaged ? (
                        <button onClick={() => handleRequest({ type: 'UNMORTGAGE_PROPERTY', payload: { playerId: myPlayer.id, propertyId: property.id }})} disabled={myPlayer.money < unmortgageCost} className="w-full bg-yellow-600 hover:bg-yellow-500 rounded-md py-2 font-bold flex items-center justify-center gap-2 disabled:bg-slate-600/50">
                            <HammerIcon className="w-4 h-4"/> Pagar Hipoteca (${unmortgageCost.toLocaleString()})
                        </button>
                    ) : (
                        <button onClick={() => handleRequest({ type: 'MORTGAGE_PROPERTY', payload: { playerId: myPlayer.id, propertyId: property.id }})} disabled={property.type === 'street' && buildings > 0} className="w-full bg-yellow-800 hover:bg-yellow-700 rounded-md py-2 font-bold flex items-center justify-center gap-2 disabled:bg-slate-600/50 disabled:cursor-not-allowed">
                            <HammerIcon className="w-4 h-4"/> Hipotecar
                        </button>
                    )}

                    {property.type === 'street' && (
                        <button onClick={() => handleRequest({ type: 'BUILD_HOUSE', payload: { playerId: myPlayer.id, propertyId: property.id, cost: buildings < 4 ? property.houseCost! : property.houseCost! }})} disabled={isMortgaged || buildings >= 5 || myPlayer.money < property.houseCost!} className="w-full bg-sky-600 hover:bg-sky-500 rounded-md py-2 font-bold disabled:bg-slate-600/50 disabled:cursor-not-allowed">
                            Construir ({buildings < 4 ? `Casa $${property.houseCost}` : `Hotel $${property.houseCost}`})
                        </button>
                    )}
                </div>
              )}
            </div>
        </Modal>
    );
};

const HostControlPanel = ({ isOpen, onClose, pendingActions, onApprove, onDeny, players, bankProperties, propertiesData, onHostDirectAction }: any) => {
    const [panelView, setPanelView] = useState<'requests' | 'actions'>('requests');
    
    const [transferTarget, setTransferTarget] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [passGoTarget, setPassGoTarget] = useState('');
    const [sellPropTarget, setSellPropTarget] = useState('');
    const [sellPropId, setSellPropId] = useState('');

    const handlePassGo = () => {
        if (!passGoTarget) return;
        onHostDirectAction({ type: 'PASS_GO', payload: { playerId: passGoTarget }});
        setPassGoTarget('');
    };
    
    const handleSellProperty = () => {
        if (!sellPropTarget || !sellPropId) return;
        const property = propertiesData[sellPropId];
        onHostDirectAction({ 
            type: 'BUY_PROPERTY', 
            payload: { playerId: sellPropTarget, propertyId: sellPropId, price: property.price } 
        });
        setSellPropTarget('');
        setSellPropId('');
    };

    const handleTransfer = () => {
        const amount = parseInt(transferAmount, 10);
        if (!transferTarget || isNaN(amount) || amount === 0) return;
        onHostDirectAction({
            type: 'TRANSFER_MONEY',
            payload: { fromId: BANK_ID, toId: transferTarget, amount }
        });
        setTransferTarget('');
        setTransferAmount('');
    };

    const selectedPropForStyling = propertiesData[sellPropId];
    const headerColor = selectedPropForStyling?.color || '#64748b';
    const sellPropSelectStyle = selectedPropForStyling ? {
        backgroundColor: headerColor,
        color: getTextColorForBg(headerColor),
        fontWeight: 'bold',
    } : {};

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Panel de Control del Anfitrión">
             <div className="flex border-b border-slate-700 mb-4">
                 <button onClick={() => setPanelView('requests')} className={`flex-1 relative py-2 font-semibold transition-colors ${panelView === 'requests' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}>
                    Solicitudes
                    {pendingActions.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{pendingActions.length}</span>
                    )}
                 </button>
                 <button onClick={() => setPanelView('actions')} className={`flex-1 py-2 font-semibold transition-colors ${panelView === 'actions' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}>
                    Acciones del Banco
                 </button>
             </div>

             {panelView === 'requests' ? (
                <div className="space-y-3">
                    {pendingActions.length === 0 ? (
                        <p className="text-slate-400 text-center py-4">No hay solicitudes pendientes.</p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                            {pendingActions.map((req: PendingAction) => (
                                <div key={req.id} className="bg-slate-700/80 p-3 rounded-md">
                                    <p className="text-slate-200">{req.message}</p>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => onDeny(req.id)} className="px-3 py-1 text-xs font-semibold bg-red-800 hover:bg-red-700 rounded transition-colors">Rechazar</button>
                                        <button onClick={() => onApprove(req.id)} className="px-3 py-1 text-xs font-semibold bg-green-700 hover:bg-green-600 rounded transition-colors">Aprobar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             ) : (
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                         <h4 className="text-lg font-semibold text-slate-300 flex items-center gap-2 mb-2"><GiftIcon className="w-5 h-5 text-teal-400"/> Pagar Salida</h4>
                         <div className="flex gap-2">
                            <select value={passGoTarget} onChange={e => setPassGoTarget(e.target.value)} className="flex-grow w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
                                 <option value="">Seleccionar jugador...</option>
                                 {players.map((p: Player) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={handlePassGo} disabled={!passGoTarget} className="bg-teal-600 hover:bg-teal-500 rounded-md px-4 font-bold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">Pagar ${PASS_GO_MONEY}</button>
                         </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                         <h4 className="text-lg font-semibold text-slate-300 flex items-center gap-2 mb-2"><TagIcon className="w-5 h-5 text-teal-400"/> Vender Propiedad</h4>
                         <div className="space-y-2">
                             <select value={sellPropTarget} onChange={e => setSellPropTarget(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
                                 <option value="">Seleccionar jugador...</option>
                                 {players.map((p: Player) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select value={sellPropId} onChange={e => setSellPropId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2" style={sellPropSelectStyle}>
                                 <option value="">Seleccionar propiedad...</option>
                                 {bankProperties.map((propId: string) => { 
                                     const prop = propertiesData[propId]; 
                                     if (!prop || !prop.price) return null;
                                     const propColor = prop.color || '#64748b';
                                     const textColor = getTextColorForBg(propColor);
                                     return <option key={prop.id} value={prop.id} style={{backgroundColor: propColor, color: textColor, fontWeight: 'bold'}}>{prop.name} - ${prop.price}</option> 
                                 })}
                            </select>
                            <button onClick={handleSellProperty} disabled={!sellPropTarget || !sellPropId} className="w-full bg-teal-600 hover:bg-teal-500 rounded-md py-2 font-bold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">Vender Propiedad</button>
                         </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                         <h4 className="text-lg font-semibold text-slate-300 flex items-center gap-2 mb-2"><MoneyIcon className="w-5 h-5 text-teal-400"/> Transferir Dinero</h4>
                         <div className="space-y-2">
                             <select value={transferTarget} onChange={e => setTransferTarget(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
                                 <option value="">Seleccionar jugador...</option>
                                 {players.map((p: Player) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="Monto (negativo para cobrar del jugador)" className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2" />
                            <button onClick={handleTransfer} disabled={!transferTarget || !transferAmount} className="w-full bg-teal-600 hover:bg-teal-500 rounded-md py-2 font-bold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">Realizar Transferencia</button>
                         </div>
                    </div>
                </div>
             )}
        </Modal>
    );
};


// --- Main App Component ---
const App: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const [playerName, setPlayerName] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [hostId, setHostId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [devPlayerViewId, setDevPlayerViewId] = useState<string | null>(null);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [serverStatus, setServerStatus] = useState<ServerStatus>(!PEER_SERVER_HOST ? 'local' : 'checking');
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [isShareModalOpen, setShareModalOpen] = useState(false);


    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<Record<string, DataConnection>>({});
    const { gameState, dispatch } = useGameEngine();
    
    const myPlayerId = useMemo(() => {
        if (devPlayerViewId) return devPlayerViewId;
        // For real games (host or client) find the player by name.
        if (gameState.players && playerName) {
            const player = gameState.players.find(p => p.name === playerName);
            if (player) {
                return player.id;
            }
        }
        // Fallback for the host before the game state is initialized.
        if (isHost) return 'player-1';

        return null;
    }, [devPlayerViewId, isHost, gameState.players, playerName]);

    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const broadcastMessage = useCallback((message: PeerMessage) => {
        Object.values(connectionsRef.current).forEach(conn => {
            conn.send(message);
        });
    }, []);

    const checkServerStatus = useCallback(() => {
        if (!PEER_SERVER_HOST) {
            setServerStatus('local');
            return;
        }
    
        setServerStatus('checking');
        setError(null);
    
        let tempPeer: Peer | null = null;
        const timer = setTimeout(() => {
            if (tempPeer) {
                tempPeer.destroy();
            }
            setServerStatus('offline');
            setError('El servidor no responde. Revisa la URL o inténtalo más tarde.');
        }, 8000); // 8-second timeout
    
        try {
            const peerConfig = {
                host: PEER_SERVER_HOST,
                path: '/peerjs',
                secure: true,
                config: { 'iceServers': [] } // Skip STUN for a faster check
            };
            const randomId = `bancomaton-check-${Math.random().toString(36).substring(2, 9)}`;
            tempPeer = new Peer(randomId, peerConfig);
    
            tempPeer.on('open', () => {
                clearTimeout(timer);
                setServerStatus('online');
                tempPeer?.destroy();
            });
    
            tempPeer.on('error', (err) => {
                clearTimeout(timer);
                setServerStatus('offline');
                if (err.type === 'peer-unavailable') {
                    setError('El servidor de señalización no está disponible en la URL proporcionada.');
                } else {
                    setError(`Error de conexión: ${err.message}`);
                }
                tempPeer?.destroy();
            });
        } catch (e) {
            clearTimeout(timer);
            setServerStatus('offline');
            setError('No se pudo inicializar el cliente de conexión.');
        }
    }, []);

    useEffect(() => {
        if (PEER_SERVER_HOST) {
            checkServerStatus();
        }
    }, [checkServerStatus]);
    
    useEffect(() => {
        if(isHost && gameState.players.length > 0) {
            broadcastMessage({ type: 'STATE_UPDATE', payload: gameState });
        }
    }, [gameState, isHost, broadcastMessage]);

    const handleClientRequest = useCallback((request: {requesterId: string, action: GameAction}) => {
         const requester = gameState.players.find(p => p.id === request.requesterId);
         if (!requester) return;

         let message = '';
         const {type, payload} = request.action;
         const prop = 'propertyId' in payload ? PROPERTIES.find(p => p.id === payload.propertyId) : undefined;

         switch (type) {
            case 'TRANSFER_MONEY':
                const toPlayer = gameState.players.find(p => p.id === payload.toId);
                const toName = payload.toId === BANK_ID ? 'el Banco' : toPlayer?.name || 'Jugador';
                const amount = payload.amount;
                const absAmount = Math.abs(amount).toLocaleString();

                if (payload.fromId.startsWith('player-') && payload.toId.startsWith('player-')) { // Player to Player
                     message = `${requester.name} solicita pagar $${absAmount} a ${toName}.`;
                } else if (amount > 0) {
                    message = `${requester.name} solicita pagar $${absAmount} a ${toName}.`;
                } else {
                    message = `${requester.name} solicita cobrar $${absAmount} de ${toName}.`;
                }
                break;
            case 'BUILD_HOUSE':
                const buildingCount = requester.buildings[payload.propertyId] || 0;
                const buildingType = buildingCount < 4 ? 'una casa' : 'un hotel';
                message = `${requester.name} solicita construir ${buildingType} en ${prop?.name}.`;
                break;
            case 'MORTGAGE_PROPERTY':
                message = `${requester.name} solicita hipotecar ${prop?.name}.`;
                break;
            case 'UNMORTGAGE_PROPERTY':
                message = `${requester.name} solicita pagar la hipoteca de ${prop?.name}.`;
                break;
            default:
                return;
         }

         const newAction: PendingAction = {
            id: `${Date.now()}`,
            requesterId: request.requesterId,
            requesterName: requester.name,
            message,
            action: request.action,
         };
         setPendingActions(prev => [...prev, newAction]);
    }, [gameState.players]);

    const getPeerConfig = (id?: string) => {
      if (!PEER_SERVER_HOST) {
          console.warn('Usando PeerJS sin servidor de señalización (modo local). Para jugar online, configura la URL del servidor.');
          if (id) return new Peer(id);
          return new Peer();
      }

      const peerConfig = {
          host: PEER_SERVER_HOST,
          path: '/peerjs',
          secure: true,
          config: {
              'iceServers': [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
              ]
          }
      };
      
      if (id) return new Peer(id, peerConfig);
      return new Peer(peerConfig);
    };

    const initializePeer = () => {
        const peer = getPeerConfig();
        peerRef.current = peer;

        peer.on('open', (peerId) => {
            setHostId(peerId);
            setIsHost(true);
            dispatch({ type: 'INITIALIZE_GAME', payload: { playerNames: [playerName] } });
            setView('game');
        });

        peer.on('connection', (conn) => {
            connectionsRef.current[conn.peer] = conn;
            conn.on('data', (data: any) => {
                const message = data as PeerMessage;
                if (isHost) {
                    if (message.type === 'JOIN_REQUEST') {
                        if (gameState.players.length < MAX_PLAYERS) {
                            dispatch({ type: 'ADD_PLAYER', payload: { playerName: message.payload.name } });
                            addToast(`${message.payload.name} se ha unido.`, 'success');
                        } else {
                            console.log("Juego lleno, rechazando jugador.");
                        }
                    } else if (message.type === 'HOST_ACTION_REQUEST') {
                        handleClientRequest(message.payload);
                    }
                }
            });
             conn.on('close', () => {
                delete connectionsRef.current[conn.peer];
            });
        });

        peer.on('error', (err) => {
            setError(`Error de conexión: ${err.message}. Intenta de nuevo.`);
            setView('home');
        });
    };

    const createGame = () => {
        if (!playerName) {
            setError('Por favor, introduce tu nombre.');
            return;
        }
        setError(null);
        initializePeer();
    };

    const joinGame = (idToJoin?: string) => {
        if (!playerName) { setError('Por favor, introduce tu nombre.'); return; }
        const finalHostId = idToJoin || hostId;
        if (!finalHostId) { setError('Por favor, introduce o escanea el ID de la partida.'); return; }
        
        setError(null);
        const peer = getPeerConfig(); // Guests don't need a specific ID
        peerRef.current = peer;

        peer.on('open', () => {
            if (!finalHostId) {
                setError(`No se pudo conectar al ID. Verifica que sea correcto.`);
                setView('home');
                return;
            }
            const conn = peer.connect(finalHostId);
            if (!conn) {
                setError(`No se pudo conectar al ID: ${finalHostId}. Verifica que sea correcto.`);
                setView('home');
                return;
            }
            connectionsRef.current[finalHostId] = conn;
            conn.on('open', () => conn.send({ type: 'JOIN_REQUEST', payload: { name: playerName } }));
            conn.on('data', (data: any) => {
                const message = data as PeerMessage;
                if (message.type === 'STATE_UPDATE') {
                    dispatch({ type: 'SET_STATE', payload: message.payload });
                    if(!['game', 'board'].includes(view)) setView('game');
                } else if (message.type === 'ACTION_RESPONSE') {
                    if (message.payload.requesterId === myPlayerId) {
                        addToast(message.payload.message, message.payload.success ? 'success' : 'error');
                    }
                }
            });
        });
         peer.on('error', (err) => { setError(`Error al unirse: ${err.message}. Verifica el ID.`); setView('home'); });
    };

    const handleScanSuccess = (result: string | null) => {
        if (result) {
            setHostId(result); // Update the input field visually
            setScannerOpen(false); // Close scanner
            if (!playerName) {
                addToast("Por favor, introduce tu nombre primero.", "error");
                return;
            }
            // Use the scanned result directly to join
            joinGame(result);
        }
    };
    
    const enterDevMode = () => {
        const devPlayers = ['Anfitrión (Dev)', 'Invitado 1 (Dev)', 'Invitado 2 (Dev)'];
        dispatch({ type: 'INITIALIZE_GAME', payload: { playerNames: devPlayers } });
        setIsHost(true);
        setDevPlayerViewId('player-1');
        setView('game');
    };
    
    const sendRequestToHost = (action: GameAction) => {
        if (!myPlayerId) {
            addToast("Error: No se pudo identificar al jugador.", "error");
            return;
        }
        const conn = connectionsRef.current[hostId];
        if (conn) {
            conn.send({type: 'HOST_ACTION_REQUEST', payload: { requesterId: myPlayerId, action }});
        }
    };
    
    const simulateRequestInDevMode = (action: GameAction) => {
        handleClientRequest({ requesterId: devPlayerViewId!, action });
    }

    const handleApproveAction = (actionId: string) => {
        const pending = pendingActions.find(p => p.id === actionId);
        if (pending) {
            dispatch(pending.action);
            const payload = { requesterId: pending.requesterId, success: true, message: '¡Solicitud aprobada!' };
            broadcastMessage({ type: 'ACTION_RESPONSE', payload });

            if (devPlayerViewId && devPlayerViewId === pending.requesterId) {
                addToast(payload.message, 'success');
            }
            
            setPendingActions(prev => prev.filter(p => p.id !== actionId));
        }
    };

    const handleDenyAction = (actionId: string) => {
        const pending = pendingActions.find(p => p.id === actionId);
        if (pending) {
            const payload = { requesterId: pending.requesterId, success: false, message: 'Solicitud rechazada.' };
            broadcastMessage({ type: 'ACTION_RESPONSE', payload });

            if (devPlayerViewId && devPlayerViewId === pending.requesterId) {
                addToast(payload.message, 'error');
            }

            setPendingActions(prev => prev.filter(p => p.id !== actionId));
        }
    };

    const propertiesData = useMemo(() => BOARD_SQUARES.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Property>), []);
    const selectedProperty = useMemo(() => {
        if (!selectedPropertyId) return null;
        return propertiesData[selectedPropertyId];
    }, [selectedPropertyId, propertiesData]);


    const renderView = () => {
        const myPlayer = gameState.players.find(p => p.id === myPlayerId);
        
        let playerRequestAction;
        if(devPlayerViewId) {
            playerRequestAction = simulateRequestInDevMode;
        } else if (!isHost) {
            playerRequestAction = sendRequestToHost;
        }

        switch (view) {
            case 'game':
                return <GameScreen 
                    gameState={gameState} 
                    myPlayer={myPlayer} 
                    isHost={isHost}
                    onPlayerRequestAction={playerRequestAction}
                    onHostDirectAction={dispatch}
                    pendingActions={pendingActions}
                    onApprove={handleApproveAction}
                    onDeny={handleDenyAction}
                    devPlayerViewId={devPlayerViewId}
                    onSetDevPlayerViewId={setDevPlayerViewId}
                    onNavigateToBoard={() => setView('board')}
                    setSelectedPropertyId={setSelectedPropertyId}
                    onOpenShareModal={() => setShareModalOpen(true)}
                    />;
            case 'board':
                 return <BoardScreen 
                    gameState={gameState} 
                    onNavigateToGame={() => setView('game')} 
                    setSelectedPropertyId={setSelectedPropertyId}
                    propertiesData={propertiesData}
                />;
            case 'home':
            default:
                return <HomeScreen 
                    playerName={playerName} 
                    onPlayerNameChange={setPlayerName}
                    hostId={hostId}
                    onHostIdChange={setHostId}
                    onCreateGame={createGame}
                    onJoinGame={() => joinGame()}
                    onDevMode={enterDevMode}
                    error={error}
                    serverStatus={serverStatus}
                    onRetry={checkServerStatus}
                    onOpenScanner={() => setScannerOpen(true)}
                />;
        }
    };

    const myPlayerForModal = gameState.players.find(p => p.id === myPlayerId);
    let playerRequestActionForModal;
    if (devPlayerViewId) {
        playerRequestActionForModal = simulateRequestInDevMode;
    } else if (!isHost) {
        playerRequestActionForModal = sendRequestToHost;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white container mx-auto p-2 sm:p-4 flex flex-col items-center justify-center">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {renderView()}
            {selectedProperty && myPlayerForModal && (
                <PropertyDetailModal 
                    isOpen={!!selectedPropertyId} 
                    onClose={() => setSelectedPropertyId(null)} 
                    property={selectedProperty} 
                    myPlayer={myPlayerForModal} 
                    gameState={gameState} 
                    onPlayerRequestAction={playerRequestActionForModal}
                    propertiesData={propertiesData} 
                    addToast={addToast} 
                />
            )}
            <ShareModal isOpen={isShareModalOpen} onClose={() => setShareModalOpen(false)} hostId={hostId} />
            <QRScannerModal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} onScanSuccess={handleScanSuccess} />
        </div>
    );
};


export default App;