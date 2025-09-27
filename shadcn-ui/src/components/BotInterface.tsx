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
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [lastTradeTime, setLastTradeTime] = useState(0);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(0);
  
  const [config, setConfig] = useState<BotConfig>({
    token: '',
    stake: 1,
    martingale: 2,
    duration: 2,
    symbol: 'R_50',
    stopWin: 10,
    stopLoss: -20,
    minConfidence: 75,
    mhiPeriods: 20,
    emaFast: 8,
    emaSlow: 18,
    rsiPeriods: 10
  });

  const [stats, setStats] = useState<BotStats>({
    status: 'Aguardando...',
    balance: 0,
    profit: 0,
    accuracy: 0,
    dataCount: 0,
    martingaleLevel: 0,
    currentStake: 1,
    total: 0,
    wins: 0,
    losses: 0
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
  const MIN_TRADE_INTERVAL = 120000; // 2 minutos entre trades
  const MIN_ANALYSIS_INTERVAL = 30000; // 30 segundos entre análises
  const MAX_ANALYSIS_PER_MINUTE = 2; // Máximo 2 análises por minuto

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

  // Reset analysis count every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysisCount(0);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
      if (!tick || !tick.quote || !isRunning) {
        return;
      }
      
      const price = parseFloat(tick.quote.toString());
      const timestamp = Math.floor(Date.now() / 1000);
      const volume = tick.volume || 1;
      const now = Date.now();
      
      // Controles de tempo rigorosos
      const timeSinceLastTrade = now - lastTradeTime;
      const timeSinceLastAnalysis = now - lastAnalysisTime;
      
      // Se está em trading, não analisar
      if (isTrading) {
        return;
      }
      
      // Se trade recente, aguardar
      if (timeSinceLastTrade < MIN_TRADE_INTERVAL && lastTradeTime > 0) {
        const remainingTime = Math.ceil((MIN_TRADE_INTERVAL - timeSinceLastTrade) / 1000);
        if (remainingTime % 30 === 0) { // Log a cada 30 segundos
          addLog(`⏳ Aguardando ${remainingTime}s para próxima análise...`);
        }
        return;
      }
      
      // Se análise muito recente, aguardar
      if (timeSinceLastAnalysis < MIN_ANALYSIS_INTERVAL) {
        return;
      }
      
      // Se muitas análises por minuto, aguardar
      if (analysisCount >= MAX_ANALYSIS_PER_MINUTE) {
        addLog(`⏳ Limite de análises por minuto atingido. Aguardando...`);
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
      
      setStats(prev => ({ ...prev, dataCount: newPriceData.length }));
      
      // Analisar sinais se temos dados suficientes
      if (newPriceData.length >= Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods)) {
        setLastAnalysisTime(now);
        setAnalysisCount(prev => prev + 1);
        
        const analysis = analyzeSignals(newPriceData, newVolumeData);
        
        if (analysis) {
          updateSignalsDisplay(analysis.signals, analysis.confidence);
          
          if (analysis.finalSignal !== "NEUTRO" && analysis.confidence >= config.minConfidence) {
            addLog(`🎯 SINAL: ${analysis.finalSignal} (${analysis.confidence}%)`);
            toast({
              title: "🎯 Sinal detectado!",
              description: `${analysis.finalSignal} com ${analysis.confidence}% de confiança`,
            });
            
            setIsTrading(true);
            executeTrade(analysis.finalSignal, ws);
          } else {
            addLog(`📊 Análise: ${analysis.finalSignal} (${analysis.confidence}%) - Aguardando sinal melhor...`);
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
      let highSum = 0, lowSum = 0, closeSum = 0;
      mhiData.forEach(candle => {
        highSum += candle.high;
        lowSum += candle.low;
        closeSum += candle.close;
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
      accuracy: prev.total > 0 ? ((profit >= 0 ? prev.wins + 1 : prev.wins) / (prev.total + 1)) * 100 : 0
    }));

    addTradeToHistory(contract.contract_id, finalSignal, confidence, stats.currentStake, stats.martingaleLevel, profit >= 0 ? "WIN" : "LOSS", profit);

    addLog(`📊 Resultado: ${profit >= 0 ? 'WIN' : 'LOSS'} | Entrada: ${stats.currentStake} | Lucro: ${profit.toFixed(2)} USD`);
    
    // Toast notification
    if (profit >= 0) {
      toast({
        title: "🎉 WIN!",
        description: `Lucro: +${profit.toFixed(2)}`,
      });
    } else {
      toast({
        title: "📉 Loss",
        description: `Prejuízo: ${profit.toFixed(2)}`,
        variant: "destructive"
      });
    }

    // Martingale logic
    if (profit < 0) {
      const newMartingaleLevel = stats.martingaleLevel + 1;
      addLog(`🔴 Perda ${newMartingaleLevel}/3`);
      
      const newStake = calculateMartingaleStake();
      
      if (validateMartingaleStake(newStake) && newMartingaleLevel < 3) {
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
      toast({
        title: "🎯 Stop Win atingido!",
        description: `Lucro total: ${(stats.profit + profit).toFixed(2)}`,
      });
      handleStop();
    } else if (stats.profit + profit <= config.stopLoss) {
      addLog("💀 STOP LOSS atingido! Parando bot.");
      toast({
        title: "⛔ Stop Loss atingido!",
        description: `Prejuízo: ${(stats.profit + profit).toFixed(2)}`,
        variant: "destructive"
      });
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
    if (stats.martingaleLevel >= 3) {
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
    if (isRunning) {
      toast({
        title: "Bot já está em execução!",
        variant: "destructive"
      });
      return;
    }

    const token = config.token.trim();
    if (!token) {
      toast({
        title: "Token da Deriv é obrigatório!",
        description: "Digite seu token para conectar",
        variant: "destructive"
      });
      return;
    }

    // Reset data
    setPriceData([]);
    setVolumeData([]);
    setIsTrading(false);
    setLastTradeTime(0);
    setLastAnalysisTime(0);
    setAnalysisCount(0);
    
    setStats(prev => ({ 
      ...prev, 
      martingaleLevel: 0,
      currentStake: config.stake,
      profit: 0,
      total: 0,
      wins: 0,
      losses: 0,
      accuracy: 0
    }));

    addLog(`🚀 Iniciando Bot - Par: ${config.symbol} | Entrada: ${config.stake} | Martingale: ${config.martingale}x`);
    addLog(`⚙️ Configurações: Min Confiança: ${config.minConfidence}% | Duração: ${config.duration}min`);
    setStats(prev => ({ ...prev, status: "🔄 Conectando..." }));
    
    toast({
      title: "Bot iniciado!",
      description: `Monitorando ${config.symbol}`,
    });

    const ws = connectWebSocket(token);
    if (ws) {
      wsRef.current = ws;
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsTrading(false);
    
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
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
    toast({
      title: "Bot parado",
      description: "Sistema interrompido com sucesso",
    });
  };

  const handleHelp = () => {
    toast({
      title: "Ajuda - Bot MVB Pro",
      description: "Sistema de trading automatizado com estratégias avançadas. Configure seu token da Deriv e ajuste os parâmetros conforme sua estratégia.",
    });
  };

  return (
    <div className="space-y-6">
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
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração Principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token API Deriv</Label>
              <Input
                id="token"
                type="password"
                placeholder="Cole seu token da Deriv"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                disabled={isRunning}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stake">Entrada (USD)</Label>
                <Input
                  id="stake"
                  type="number"
                  min="1"
                  max="1000"
                  value={config.stake}
                  onChange={(e) => setConfig({ ...config, stake: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="martingale">Multiplicador Martingale</Label>
                <Input
                  id="martingale"
                  type="number"
                  min="2"
                  max="5"
                  value={config.martingale}
                  onChange={(e) => setConfig({ ...config, martingale: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Símbolo</Label>
              <Select value={config.symbol} onValueChange={(value) => setConfig({ ...config, symbol: value })} disabled={isRunning}>
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controles de Risco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stopWin">Stop Win (lucro)</Label>
                <Input
                  id="stopWin"
                  type="number"
                  value={config.stopWin}
                  onChange={(e) => setConfig({ ...config, stopWin: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss (prejuízo)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  value={config.stopLoss}
                  onChange={(e) => setConfig({ ...config, stopLoss: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minConfidence">Confiança Mínima (%)</Label>
              <Input
                id="minConfidence"
                type="number"
                min="50"
                max="95"
                value={config.minConfidence}
                onChange={(e) => setConfig({ ...config, minConfidence: Number(e.target.value) })}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="5"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) })}
                disabled={isRunning}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Status</div>
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {stats.status}
                </Badge>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Saldo</div>
                <div className="font-bold text-green-600">${stats.balance}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Lucro</div>
                <div className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${stats.profit.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Assertividade</div>
                <div className="font-bold text-blue-600">{stats.accuracy.toFixed(1)}%</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Dados Coletados</div>
                <div className="font-bold text-purple-600">{stats.dataCount}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Martingale</div>
                <div className="font-bold text-orange-600">{stats.martingaleLevel}/3</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Entrada Atual</div>
                <div className="font-bold text-indigo-600">${stats.currentStake}</div>
              </div>
            </div>
            
            {/* Alert para controles de tempo */}
            {isRunning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bot configurado com análise controlada: máximo {MAX_ANALYSIS_PER_MINUTE} análises/min, 
                  intervalo mínimo de {MIN_TRADE_INTERVAL/60000} min entre trades.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleStart} 
                disabled={isRunning}
                className="flex-1"
              >
                <Play className="mr-2 h-4 w-4" />
                ▶ Iniciar Bot
              </Button>
              <Button 
                onClick={handleStop} 
                disabled={!isRunning}
                variant="destructive"
                className="flex-1"
              >
                <Square className="mr-2 h-4 w-4" />
                ⏹ Parar
              </Button>
              <Button 
                onClick={handleHelp}
                variant="outline"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
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

      {/* Trading History */}
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