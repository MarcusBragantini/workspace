import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Play, 
  Square, 
  HelpCircle,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Shield,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Sistema de Licenças (EXATO do HTML original)
const LICENSE_KEYS = {
  'STANDARD-MVB-2025': {
    type: 'standard',
    days: 30,
    features: ['all_features', 'premium_support']
  },
  'BASIC-MVB-7': {
    type: 'basic', 
    days: 7,
    features: ['basic_features', 'email_support']
  },
  'FREE-MVB-24': {
    type: 'free',
    days: 1,
    features: ['limited_features']
  }
};

// Interfaces
interface BotConfig {
  token: string;
  stake: number;
  martingale: number;
  duration: number;
  symbol: string;
  stopWin: number;
  stopLoss: number;
  minConfidence: number;
  mhiPeriods: number;
  emaFast: number;
  emaSlow: number;
  rsiPeriods: number;
}

interface BotStats {
  status: string;
  balance: number;
  profit: number;
  accuracy: number;
  dataCount: number;
  martingaleLevel: number;
  currentStake: number;
  total: number;
  wins: number;
  losses: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

interface TradeHistory {
  contractId: string;
  signal: string;
  confidence: string;
  stake: number;
  martingale: number;
  result: string;
  profit: number;
  time: string;
}

interface Signals {
  mhi: string;
  trend: string;
  ema: string;
  rsi: string;
  volume: string;
  final: string;
  confidence: string;
}

interface PriceData {
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

interface WebSocketMessage {
  msg_type?: string;
  error?: {
    message: string;
    code?: string;
  };
  balance?: {
    balance: number;
  };
  tick?: {
    quote: number;
    volume?: number;
  };
  proposal?: {
    id: string;
  };
  buy?: {
    contract_id?: string;
    error?: {
      message: string;
    };
  };
  proposal_open_contract?: {
    is_sold: boolean;
    profit: number;
    contract_id: string;
  };
}

interface SignalAnalysis {
  signals: Record<string, string>;
  confidence: number;
  finalSignal: string;
}

export default function BotInterface() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  
  // Estados de licença (RESTAURADOS do HTML original)
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [showLicenseScreen, setShowLicenseScreen] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Estados do bot
  const [isRunning, setIsRunning] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [lastTradeTime, setLastTradeTime] = useState(0);
  
  // Configuração padrão baseada no HTML
  const defaultConfig: BotConfig = {
    token: '',
    stake: 1,
    martingale: 2,
    duration: 2,
    symbol: 'frxEURUSD',
    stopWin: 3,
    stopLoss: -5,
    minConfidence: 75,
    mhiPeriods: 20,
    emaFast: 8,
    emaSlow: 18,
    rsiPeriods: 10
  };

  const [config, setConfig] = useState<BotConfig>(defaultConfig);

  const [stats, setStats] = useState<BotStats>({
    status: '⏳ Aguardando...',
    balance: 0,
    profit: 0,
    accuracy: 0,
    dataCount: 0,
    martingaleLevel: 0,
    currentStake: 1,
    total: 0,
    wins: 0,
    losses: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0
  });

  const [signals, setSignals] = useState<Signals>({
    mhi: '-',
    trend: '-',
    ema: '-',
    rsi: '-',
    volume: '-',
    final: '-',
    confidence: '-'
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [volumeData, setVolumeData] = useState<number[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);

  const WEBSOCKET_ENDPOINTS = [
    "wss://ws.binaryws.com/websockets/v3",
    "wss://ws.derivws.com/websockets/v3"
  ];

  // Constantes de controle
  const MIN_TRADE_INTERVAL = 60000; // 1 minuto entre trades
  const MAX_MARTINGALE_LEVEL = 3;

  // Gerar device fingerprint (EXATO do HTML original)
  const generateDeviceFingerprint = () => {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ];
    return btoa(fingerprint.join('|')).slice(0, 24);
  };

  // Sistema de notificações customizado (do HTML original)
  const showCustomToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const titles = {
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Atenção', 
      info: 'Informação'
    };
    
    toast({
      title: titles[type],
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    });
  };

  // Validar licença (EXATO do HTML original)
  const validateLicense = () => {
    const key = licenseKey.trim();
    const licenseData = LICENSE_KEYS[key as keyof typeof LICENSE_KEYS];
    
    if (!licenseData) {
      setStatusMessage('Licença inválida. Verifique sua chave de acesso.');
      showCustomToast('Chave de licença não encontrada. Verifique se digitou corretamente.', 'error');
      return;
    }
    
    const deviceId = generateDeviceFingerprint();
    const savedDevice = localStorage.getItem('mvb_device_' + key);
    
    if (savedDevice && savedDevice !== deviceId) {
      setStatusMessage('Esta licença já está em uso em outro dispositivo.');
      showCustomToast('Esta licença já está sendo utilizada em outro dispositivo.', 'warning');
      return;
    }
    
    localStorage.setItem('mvb_device_' + key, deviceId);
    
    setIsLicenseValid(true);
    setLicenseInfo(licenseData);
    setShowLicenseScreen(false);
    setStatusMessage('Acesso autorizado com sucesso!');
    
    addLog('Sistema iniciado com sucesso');
    addLog(`Tipo de licença: ${licenseData.type.toUpperCase()}`);
    showCustomToast(`Acesso liberado! Tipo: ${licenseData.type.toUpperCase()}`, 'success');
  };

  // Verificar sessão salva (do HTML original)
  useEffect(() => {
    const savedSession = localStorage.getItem('mvb_session_2025');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(atob(savedSession));
        if (sessionData.expires > Date.now()) {
          setIsLicenseValid(true);
          setLicenseInfo(sessionData.license);
          setShowLicenseScreen(false);
          addLog('Sessão restaurada automaticamente');
        }
      } catch (error) {
        localStorage.removeItem('mvb_session_2025');
      }
    }
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-49), logMessage]);
  };

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Carregar configurações do localStorage
  useEffect(() => {
    if (!showLicenseScreen) {
      try {
        const savedConfig = localStorage.getItem('botmvb_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          const loadedConfig = { ...defaultConfig, ...parsed };
          setConfig(loadedConfig);
          addLog("✅ Configurações carregadas");
        }
      } catch (error) {
        addLog("⚠️ Erro ao carregar configurações");
      }
    }
  }, [showLicenseScreen]);

  // Salvar configurações
  const saveConfig = (newConfig: BotConfig) => {
    try {
      localStorage.setItem('botmvb_config', JSON.stringify(newConfig));
    } catch (error) {
      addLog("⚠️ Erro ao salvar configurações");
    }
  };

  // Atualizar configuração
  const updateConfig = (newConfig: Partial<BotConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
  };

  const connectWebSocket = (token: string, endpointIndex = 0): WebSocket | null => {
    if (endpointIndex >= WEBSOCKET_ENDPOINTS.length) {
      addLog("❌ Todos os endpoints falharam.");
      return null;
    }

    const endpoint = WEBSOCKET_ENDPOINTS[endpointIndex] + "?app_id=1089";
    
    try {
      const ws = new WebSocket(endpoint);
      
      ws.onopen = () => {
        addLog("✅ WebSocket conectado!");
        setStats(prev => ({ ...prev, status: "🔐 Autenticando..." }));
        ws.send(JSON.stringify({ authorize: token }));
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event, ws);
      };

      ws.onclose = (event) => {
        if (!event.wasClean && isRunning) {
          addLog("🔴 Conexão perdida. Reconectando...");
          setTimeout(() => {
            const newWs = connectWebSocket(token, endpointIndex + 1);
            if (newWs) wsRef.current = newWs;
          }, 2000);
        }
      };

      ws.onerror = () => {
        addLog(`❌ Erro de conexão.`);
      };

      return ws;
    } catch (error) {
      addLog(`❌ Erro ao criar WebSocket`);
      return null;
    }
  };

  const handleWebSocketMessage = (event: MessageEvent, ws: WebSocket) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);

      if (data.error) {
        addLog(`❌ ERRO: ${data.error.message}`);
        if (data.error.code === 'InvalidToken') {
          setStats(prev => ({ ...prev, status: "❌ Token Inválido" }));
          handleStop();
        }
        return;
      }

      if (data.msg_type === "authorize") {
        addLog("🔐 Autenticado com sucesso!");
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ ticks: config.symbol, subscribe: 1 }));
        addLog(`📊 Monitorando: ${config.symbol}`);
      }

      if (data.msg_type === "balance") {
        const balance = data.balance?.balance || 0;
        setStats(prev => ({ ...prev, balance }));
        addLog(`💰 Saldo: $${balance} USD`);
        
        if (!isRunning) {
          setIsRunning(true);
          addLog("✅ Bot ativo e analisando!");
          setStats(prev => ({ ...prev, status: "📊 Analisando..." }));
        }
      }

      if (data.msg_type === "tick") {
        processTick(data.tick, ws);
      }

      if (data.msg_type === "proposal") {
        addLog(`📋 Proposta recebida`);
        const buyRequest = { buy: data.proposal?.id, price: stats.currentStake };
        ws.send(JSON.stringify(buyRequest));
      }

      if (data.msg_type === "buy") {
        if (data.buy?.error) {
          addLog(`❌ Erro na compra: ${data.buy.error.message}`);
          setIsTrading(false);
          return;
        }
        
        addLog(`✅ Contrato ID: ${data.buy?.contract_id}`);
        ws.send(JSON.stringify({ 
          proposal_open_contract: 1, 
          subscribe: 1, 
          contract_id: data.buy?.contract_id 
        }));
      }

      if (data.msg_type === "proposal_open_contract") {
        const contract = data.proposal_open_contract;
        if (contract?.is_sold) {
          handleTradeResult(contract);
        }
      }

    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro processando mensagem: ${err.message}`);
    }
  };

  const processTick = (tick: WebSocketMessage['tick'], ws: WebSocket) => {
    try {
      if (!tick || !tick.quote) {
        return;
      }
      
      const price = parseFloat(tick.quote.toString());
      const timestamp = Math.floor(Date.now() / 1000);
      const volume = tick.volume || 1;
      const now = Date.now();
      
      // Verificar intervalo mínimo entre trades
      const timeSinceLastTrade = now - lastTradeTime;
      if (timeSinceLastTrade < MIN_TRADE_INTERVAL && lastTradeTime > 0) {
        return;
      }
      
      // Adicionar dados de preço
      const newPriceData = [...priceData, { high: price, low: price, close: price, timestamp }];
      const newVolumeData = [...volumeData, volume];
      
      // Manter apenas dados necessários
      const maxDataPoints = Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods) * 2;
      if (newPriceData.length > maxDataPoints) {
        setPriceData(newPriceData.slice(-maxDataPoints));
        setVolumeData(newVolumeData.slice(-maxDataPoints));
      } else {
        setPriceData(newPriceData);
        setVolumeData(newVolumeData);
      }
      
      // Atualizar contador de dados
      setStats(prev => ({ ...prev, dataCount: newPriceData.length }));
      
      // Analisar sinais se temos dados suficientes e não estamos em trading
      if (newPriceData.length >= Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods) && !isTrading) {
        const analysis = analyzeSignals(newPriceData, newVolumeData);
        
        if (analysis) {
          updateSignalsDisplay(analysis.signals, analysis.confidence);
          
          if (analysis.finalSignal !== "NEUTRO" && analysis.confidence >= config.minConfidence) {
            addLog(`🎯 SINAL: ${analysis.finalSignal} (${analysis.confidence}%)`);
            showCustomToast(`🎯 Sinal detectado: ${analysis.finalSignal} com ${analysis.confidence}% de confiança`, 'info');
            
            setIsTrading(true);
            executeTrade(analysis.finalSignal, ws);
          }
        }
      }
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro processando tick: ${err.message}`);
    }
  };

  const analyzeSignals = (prices: PriceData[], volumes: number[]): SignalAnalysis | null => {
    try {
      if (!prices || prices.length < Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods)) {
        return null;
      }
      
      // MHI Calculation
      const mhiData = prices.slice(-config.mhiPeriods);
      let highSum = 0, lowSum = 0;
      mhiData.forEach(candle => {
        highSum += candle.high;
        lowSum += candle.low;
      });
      
      const avgHigh = highSum / config.mhiPeriods;
      const avgLow = lowSum / config.mhiPeriods;
      const currentPrice = mhiData[mhiData.length - 1].close;
      
      let mhiSignal = "NEUTRO";
      if (currentPrice > avgHigh) {
        mhiSignal = "CALL";
      } else if (currentPrice < avgLow) {
        mhiSignal = "PUT";
      }
      
      // EMA Calculation
      const emaFast = calculateEMA(prices, config.emaFast);
      const emaSlow = calculateEMA(prices, config.emaSlow);
      
      let trendSignal = "NEUTRO";
      if (emaFast > emaSlow && currentPrice > emaFast) {
        trendSignal = "CALL";
      } else if (emaFast < emaSlow && currentPrice < emaFast) {
        trendSignal = "PUT";
      }
      
      // RSI Calculation
      const rsi = calculateRSI(prices, config.rsiPeriods);
      let rsiSignal = "NEUTRO";
      if (rsi < 30) {
        rsiSignal = "CALL";
      } else if (rsi > 70) {
        rsiSignal = "PUT";
      }
      
      const signals = {
        mhi: mhiSignal,
        trend: trendSignal,
        ema: currentPrice > emaFast ? "CALL" : "PUT",
        rsi: rsiSignal,
        volume: "NEUTRO"
      };
      
      const finalSignal = calculateFinalSignal(signals);
      const confidence = calculateConfidence(signals, rsi);
      
      return {
        signals: { ...signals, final: finalSignal },
        confidence,
        finalSignal
      };
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro no cálculo de sinais: ${err.message}`);
      return null;
    }
  };

  const calculateEMA = (prices: PriceData[], period: number) => {
    if (prices.length < period) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i].close - ema) * multiplier + ema;
    }
    return ema;
  };

  const calculateRSI = (prices: PriceData[], period: number) => {
    if (prices.length <= period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i].close - prices[prices.length - i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateFinalSignal = (signals: Record<string, string>) => {
    const weights: Record<string, number> = { mhi: 0.3, trend: 0.3, ema: 0.2, rsi: 0.2, volume: 0.0 };
    let callScore = 0, putScore = 0;
    
    Object.keys(signals).forEach(key => {
      if (signals[key] === "CALL") callScore += weights[key] || 0;
      else if (signals[key] === "PUT") putScore += weights[key] || 0;
    });
    
    if (callScore > putScore && callScore > 0.4) return "CALL";
    if (putScore > callScore && putScore > 0.4) return "PUT";
    return "NEUTRO";
  };

  const calculateConfidence = (signals: Record<string, string>, rsi: number) => {
    let confidence = 0;
    Object.values(signals).forEach(signal => {
      if (signal !== "NEUTRO") confidence += 20;
    });
    if (rsi < 20 || rsi > 80) confidence += 10;
    else if (rsi < 30 || rsi > 70) confidence += 5;
    return Math.min(95, confidence);
  };

  const updateSignalsDisplay = (signals: Record<string, string>, confidence: number) => {
    setSignals({
      mhi: signals.mhi || "-",
      trend: signals.trend || "-",
      ema: signals.ema || "-",
      rsi: signals.rsi || "-",
      volume: signals.volume || "-",
      final: signals.final || "-",
      confidence: confidence ? `${confidence}%` : "-"
    });
  };

  const executeTrade = (signal: string, ws: WebSocket) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog("❌ WebSocket não conectado!");
      setIsTrading(false);
      return;
    }
    
    addLog(`🚀 EXECUTANDO: ${signal} - $${stats.currentStake}`);
    
    const proposal = {
      proposal: 1,
      amount: stats.currentStake,
      basis: "stake",
      contract_type: signal,
      currency: "USD",
      duration: config.duration,
      duration_unit: "m",
      symbol: config.symbol
    };

    ws.send(JSON.stringify(proposal));
    setStats(prev => ({ ...prev, status: `🚀 ${signal} - $${stats.currentStake}` }));
  };

  const handleTradeResult = (contract: WebSocketMessage['proposal_open_contract']) => {
    if (!contract) return;
    
    const profit = contract.profit;
    const finalSignal = signals.final;
    const confidence = signals.confidence.replace('%', '') || "0";

    setStats(prev => ({
      ...prev,
      profit: prev.profit + profit,
      total: prev.total + 1,
      wins: profit >= 0 ? prev.wins + 1 : prev.wins,
      losses: profit < 0 ? prev.losses + 1 : prev.losses,
      consecutiveWins: profit >= 0 ? prev.consecutiveWins + 1 : 0,
      consecutiveLosses: profit < 0 ? prev.consecutiveLosses + 1 : 0,
      accuracy: prev.total > 0 ? ((profit >= 0 ? prev.wins + 1 : prev.wins) / (prev.total + 1)) * 100 : 0
    }));

    addTradeToHistory(contract.contract_id, finalSignal, confidence, stats.currentStake, stats.martingaleLevel, profit >= 0 ? "WIN" : "LOSS", profit);

    addLog(`📊 Resultado: ${profit >= 0 ? 'WIN' : 'LOSS'} | Entrada: ${stats.currentStake} | Lucro: ${profit.toFixed(2)} USD`);
    
    // Toast notification
    if (profit >= 0) {
      showCustomToast(`🎉 WIN! Lucro: +${profit.toFixed(2)}`, 'success');
    } else {
      showCustomToast(`📉 Loss: ${profit.toFixed(2)}`, 'error');
    }

    // Martingale logic
    if (profit < 0) {
      const newMartingaleLevel = stats.martingaleLevel + 1;
      addLog(`🔴 Perda ${newMartingaleLevel}/3`);
      
      const newStake = calculateMartingaleStake();
      
      if (validateMartingaleStake(newStake) && newMartingaleLevel < MAX_MARTINGALE_LEVEL) {
        setStats(prev => ({ 
          ...prev, 
          currentStake: newStake,
          martingaleLevel: newMartingaleLevel
        }));
        addLog(`📈 Nova entrada: $${newStake} ($${newStake/config.martingale} × ${config.martingale})`);
      } else {
        setStats(prev => ({ 
          ...prev, 
          martingaleLevel: 0,
          currentStake: config.stake
        }));
        addLog("🔄 Martingale resetado (limite máximo)");
      }
    } else {
      setStats(prev => ({ 
        ...prev, 
        martingaleLevel: 0,
        currentStake: config.stake
      }));
      addLog(`✅ WIN! Reset para entrada inicial: $${config.stake}`);
    }

    // Check stop conditions
    if (stats.profit + profit >= config.stopWin) {
      addLog("🎯 STOP WIN atingido! Parando bot.");
      showCustomToast(`🎯 Stop Win atingido! Lucro total: ${(stats.profit + profit).toFixed(2)}`, 'success');
      handleStop();
    } else if (stats.profit + profit <= config.stopLoss) {
      addLog("💀 STOP LOSS atingido! Parando bot.");
      showCustomToast(`⛔ Stop Loss atingido! Prejuízo: ${(stats.profit + profit).toFixed(2)}`, 'error');
      handleStop();
    } else {
      addLog("🔄 Aguardando próximo sinal...");
      setStats(prev => ({ ...prev, status: "📊 Analisando..." }));
      setIsTrading(false);
      setLastTradeTime(Date.now());
    }
  };

  const calculateMartingaleStake = () => {
    const newStake = stats.currentStake * config.martingale;
    const maxMartingale = config.stake * Math.pow(config.martingale, 3);
    const maxBalancePercent = stats.balance * 0.3;
    
    let finalStake = Math.min(newStake, maxMartingale, maxBalancePercent);
    finalStake = Math.max(finalStake, 1);
    return Math.round(finalStake);
  };

  const validateMartingaleStake = (stake: number) => {
    if (stats.martingaleLevel >= MAX_MARTINGALE_LEVEL) {
      addLog("🚫 Máximo de 3 martingales atingido!");
      return false;
    }
    
    if (stake > stats.balance * 0.5) {
      addLog(`⚠️ Stake muito alto para o saldo!`);
      return false;
    }
    
    return true;
  };

  const addTradeToHistory = (contractId: string, signal: string, confidence: string, stake: number, martingale: number, result: string, profit: number) => {
    const trade: TradeHistory = {
      contractId,
      signal,
      confidence,
      stake,
      martingale,
      result,
      profit,
      time: new Date().toLocaleTimeString()
    };
    setHistory(prev => [trade, ...prev.slice(0, 49)]);
  };

  const handleStart = () => {
    // Verificar licença (do HTML original)
    if (!isLicenseValid) {
      showCustomToast('Acesso não autorizado. Insira uma licença válida.', 'warning');
      return;
    }

    if (isRunning) {
      showCustomToast("Bot já está em execução!", 'warning');
      return;
    }

    const token = config.token.trim();
    if (!token) {
      showCustomToast("Token da Deriv é obrigatório para conectar!", 'error');
      return;
    }

    // Reset data
    setPriceData([]);
    setVolumeData([]);
    setIsTrading(false);
    setLastTradeTime(0);
    
    setStats(prev => ({ 
      ...prev, 
      martingaleLevel: 0,
      currentStake: config.stake,
      profit: 0,
      total: 0,
      wins: 0,
      losses: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      accuracy: 0,
      dataCount: 0
    }));

    addLog(`🚀 Iniciando Bot - Par: ${config.symbol} | Entrada: $${config.stake} | Martingale: ${config.martingale}x`);
    setStats(prev => ({ ...prev, status: "🔄 Conectando..." }));
    showCustomToast(`Bot iniciado! Monitorando ${config.symbol}`, 'success');

    const ws = connectWebSocket(token);
    if (ws) {
      wsRef.current = ws;
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsTrading(false);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ forget_all: "ticks" }));
        wsRef.current.send(JSON.stringify({ forget_all: "proposal_open_contract" }));
        
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current.close();
          }
        }, 500);
      } catch (error) {
        if (wsRef.current) {
          wsRef.current.close();
        }
      }
    }
    
    addLog("⏹ Bot parado com sucesso!");
    setStats(prev => ({ ...prev, status: "⏹ Parado" }));
    showCustomToast("Bot parado com sucesso", 'info');
  };

  const handleHelp = () => {
    const helpMessage = `
📊 Estratégia MHI Avançada
• Combina MHI tradicional com EMA, RSI e análise de tendência
• Requer dados suficientes para análise (mín. 14 períodos)
• Confiança mínima configurável para filtrar sinais

⚙️ Configurações Principais
Token: Obtenha em app.deriv.com → API Token
Entrada: Valor inicial do trade em USD
Martingale: Multiplicador aplicado após loss
Stops: Limites automáticos de lucro/prejuízo

🎯 Tipos de Sinal
CALL: Previsão de alta do preço
PUT: Previsão de baixa do preço
Confiança: Percentual de certeza do sinal

⚠️ Importante: Use apenas em conta DEMO para testes e aprendizado!
    `;
    
    showCustomToast(helpMessage, 'info');
  };

  // TELA DE LICENÇA (EXATA do HTML original)
  if (showLicenseScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="text-6xl mb-6">🤖</div>
            <CardTitle className="text-4xl mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-light">
              Bot MVB
            </CardTitle>
            <CardDescription className="text-xl text-gray-600">
              Sistema de Trading Automatizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="licenseKey" className="text-base font-semibold text-gray-700">
                Insira sua Licença:
              </Label>
              <Input
                id="licenseKey"
                type="text"
                placeholder="Digite sua chave de licença"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                maxLength={20}
                className="text-center text-lg py-4 border-2 focus:border-blue-500"
              />
            </div>
            
            <Button 
              onClick={validateLicense}
              className="w-full py-4 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Acessar Sistema
            </Button>

            {statusMessage && (
              <Alert className={statusMessage.includes('sucesso') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={statusMessage.includes('sucesso') ? 'text-green-800' : 'text-red-800'}>
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // INTERFACE PRINCIPAL DO BOT (após validação da licença)
  return (
    <div className="space-y-6 p-4">
      {/* Strategy Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            🤖 Bot MVB - Estratégia MHI Avançada com Tendência
          </CardTitle>
          <CardDescription>
            Combina MHI tradicional com EMA, RSI, Volume e Análise de Tendência para máxima precisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">MHI Básico</div>
              <div className="text-lg font-bold text-blue-600">{signals.mhi}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Tendência</div>
              <div className="text-lg font-bold text-green-600">{signals.trend}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">EMA Rápida</div>
              <div className="text-lg font-bold text-purple-600">{signals.ema}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">RSI</div>
              <div className="text-lg font-bold text-orange-600">{signals.rsi}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Volume Relativo</div>
              <div className="text-lg font-bold text-indigo-600">{signals.volume}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Confiança</div>
              <div className="text-lg font-bold text-cyan-600">{signals.confidence}</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg">
              <div className="text-sm font-medium">Sinal Final</div>
              <div className="text-lg font-bold">{signals.final}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Token API:</Label>
          <Input
            type="text"
            placeholder="Cole seu token da Deriv"
            value={config.token}
            onChange={(e) => updateConfig({ token: e.target.value })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Entrada (USD):</Label>
          <Input
            type="number"
            min="1"
            max="1000"
            value={config.stake}
            onChange={(e) => updateConfig({ stake: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Multiplicador Martingale:</Label>
          <Input
            type="number"
            min="2"
            max="5"
            value={config.martingale}
            onChange={(e) => updateConfig({ martingale: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Duração (minutos):</Label>
          <Input
            type="number"
            min="1"
            max="5"
            value={config.duration}
            onChange={(e) => updateConfig({ duration: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Períodos MHI:</Label>
          <Input
            type="number"
            min="5"
            max="50"
            value={config.mhiPeriods}
            onChange={(e) => updateConfig({ mhiPeriods: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>EMA Rápida:</Label>
          <Input
            type="number"
            min="5"
            max="20"
            value={config.emaFast}
            onChange={(e) => updateConfig({ emaFast: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>EMA Lenta (Tendência):</Label>
          <Input
            type="number"
            min="15"
            max="50"
            value={config.emaSlow}
            onChange={(e) => updateConfig({ emaSlow: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>RSI Períodos:</Label>
          <Input
            type="number"
            min="7"
            max="21"
            value={config.rsiPeriods}
            onChange={(e) => updateConfig({ rsiPeriods: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Stop Win (lucro):</Label>
          <Input
            type="number"
            min="1"
            max="1000"
            value={config.stopWin}
            onChange={(e) => updateConfig({ stopWin: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Stop Loss (prejuízo):</Label>
          <Input
            type="number"
            min="-1000"
            max="-1"
            value={config.stopLoss}
            onChange={(e) => updateConfig({ stopLoss: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Mín. Confiança (%):</Label>
          <Input
            type="number"
            min="50"
            max="90"
            value={config.minConfidence}
            onChange={(e) => updateConfig({ minConfidence: Number(e.target.value) })}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label>Símbolo:</Label>
          <Select value={config.symbol} onValueChange={(value) => updateConfig({ symbol: value })} disabled={isRunning}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="R_10">Volatility 10 Index</SelectItem>
              <SelectItem value="R_25">Volatility 25 Index</SelectItem>
              <SelectItem value="R_50">Volatility 50 Index</SelectItem>
              <SelectItem value="R_75">Volatility 75 Index</SelectItem>
              <SelectItem value="R_100">Volatility 100 Index</SelectItem>
              <SelectItem value="frxEURUSD">EUR/USD</SelectItem>
              <SelectItem value="frxGBPUSD">GBP/USD</SelectItem>
              <SelectItem value="frxUSDJPY">USD/JPY</SelectItem>
              <SelectItem value="frxUSDCHF">USD/CHF</SelectItem>
              <SelectItem value="frxAUDUSD">AUD/USD</SelectItem>
              <SelectItem value="frxUSDCAD">USD/CAD</SelectItem>
              <SelectItem value="frxNZDUSD">NZD/USD</SelectItem>
              <SelectItem value="frxEURGBP">EUR/GBP</SelectItem>
              <SelectItem value="frxEURJPY">EUR/JPY</SelectItem>
              <SelectItem value="frxEURCAD">EUR/CAD</SelectItem>
              <SelectItem value="frxEURAUD">EUR/AUD</SelectItem>
              <SelectItem value="frxGBPJPY">GBP/JPY</SelectItem>
              <SelectItem value="frxGBPCHF">GBP/CHF</SelectItem>
              <SelectItem value="frxAUDJPY">AUD/JPY</SelectItem>
              <SelectItem value="frxCADJPY">CAD/JPY</SelectItem>
              <SelectItem value="BTCUSD">BTC/USD</SelectItem>
              <SelectItem value="ETHUSD">ETH/USD</SelectItem>
              <SelectItem value="LTCUSD">LTC/USD</SelectItem>
              <SelectItem value="XRPUSD">XRP/USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botões de controle */}
      <div className="flex gap-4 justify-center flex-wrap">
        <Button 
          onClick={handleStart} 
          disabled={isRunning}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          <Play className="mr-2 h-4 w-4" />
          ▶ Iniciar Bot
        </Button>
        <Button 
          onClick={handleStop} 
          disabled={!isRunning}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
        >
          <Square className="mr-2 h-4 w-4" />
          ⏹ Parar
        </Button>
        <Button 
          onClick={handleHelp}
          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          ❓ Ajuda
        </Button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Status</div>
            <div className="font-bold">{stats.status}</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Saldo</div>
            <div className="font-bold text-green-600">💰 ${stats.balance}</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Lucro Acumulado</div>
            <div className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.profit.toFixed(2)} USD
            </div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Assertividade</div>
            <div className="font-bold text-blue-600">{stats.accuracy.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Dados Coletados</div>
            <div className="font-bold text-purple-600">{stats.dataCount}</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Martingale</div>
            <div className="font-bold text-orange-600">{stats.martingaleLevel}/3</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-2">Entrada Atual</div>
            <div className="font-bold text-indigo-600">${stats.currentStake}</div>
          </CardContent>
        </Card>
      </div>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Log Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={logsRef}
            className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm"
          >
            {logs.length === 0 ? (
              <div className="text-gray-500">Aguardando início do bot...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Histórico de Operações</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma operação realizada ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Contrato</th>
                    <th className="text-left p-2">Sinal</th>
                    <th className="text-left p-2">Confiança</th>
                    <th className="text-left p-2">Entrada</th>
                    <th className="text-left p-2">Martingale</th>
                    <th className="text-left p-2">Resultado</th>
                    <th className="text-left p-2">Lucro</th>
                    <th className="text-left p-2">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((trade, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{trade.contractId}</td>
                      <td className="p-2">
                        <Badge variant={trade.signal === 'CALL' ? 'default' : 'destructive'}>
                          {trade.signal}
                        </Badge>
                      </td>
                      <td className="p-2">{trade.confidence}%</td>
                      <td className="p-2">${trade.stake}</td>
                      <td className="p-2">{trade.martingale}/3</td>
                      <td className="p-2">
                        <Badge variant={trade.result === 'WIN' ? 'default' : 'destructive'}>
                          {trade.result}
                        </Badge>
                      </td>
                      <td className={`p-2 font-bold ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trade.profit.toFixed(2)}
                      </td>
                      <td className="p-2">{trade.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}