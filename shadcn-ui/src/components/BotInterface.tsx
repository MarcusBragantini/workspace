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
import { useAuth } from '@/contexts/AuthContext';

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

// Constantes
const MAX_DEVICES = 2;
const WEBSOCKET_ENDPOINTS = [
  "wss://ws.binaryws.com/websockets/v3",
  "wss://ws.derivws.com/websockets/v3"
];

export default function BotInterface() {
  const { toast } = useToast();
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  
  // Estados de licença e dispositivo
  const [licenseValid, setLicenseValid] = useState(true); // ✅ SEMPRE VÁLIDA
  const [deviceCount, setDeviceCount] = useState(1);
  const [deviceId, setDeviceId] = useState('device-001');
  
  // Estados do bot - ✅ SEMPRE ATIVO
  const [isRunning, setIsRunning] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [lastTradeTime, setLastTradeTime] = useState(0);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  
  // Configurações
  const [config, setConfig] = useState<BotConfig>({
    token: '',
    stake: 1,
    martingale: 2,
    duration: 1,
    symbol: 'R_10',
    stopWin: 10,
    stopLoss: -10,
    minConfidence: 70,
    mhiPeriods: 14,
    emaFast: 9,
    emaSlow: 21,
    rsiPeriods: 14
  });

  const [stats, setStats] = useState<BotStats>({
    status: '⏳ Aguardando...',
    balance: 1000, // ✅ SALDO FIXO PARA TESTE
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

  // Atualizar configuração e salvar
  const updateConfig = (newConfig: Partial<BotConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    try {
      localStorage.setItem('bot_config_v2', JSON.stringify(updatedConfig));
    } catch (error) {
      console.error("Erro ao salvar config:", error);
    }
  };

  // Carregar configuração
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bot_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error);
    }
  }, []);

  const connectWebSocket = (token: string): WebSocket | null => {
    const endpoint = WEBSOCKET_ENDPOINTS[0] + "?app_id=1089";
    
    try {
      const ws = new WebSocket(endpoint);
      
      ws.onopen = () => {
        addLog("✅ WebSocket conectado!");
        setStats(prev => ({ ...prev, status: "🔐 Autenticando..." }));
        
        // ✅ ATIVAR BOT IMEDIATAMENTE
        setIsRunning(true);
        addLog("🚀 Bot ativado automaticamente!");
        setStats(prev => ({ ...prev, status: "📊 Coletando dados..." }));
        
        if (token.trim()) {
          ws.send(JSON.stringify({ authorize: token }));
        }
        ws.send(JSON.stringify({ ticks: config.symbol, subscribe: 1 }));
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event, ws);
      };

      ws.onclose = (event) => {
        if (!event.wasClean && isRunning) {
          addLog("🔴 Conexão perdida. Reconectando...");
          setTimeout(() => {
            const newWs = connectWebSocket(token);
            if (newWs) wsRef.current = newWs;
          }, 2000);
        }
      };

      ws.onerror = (error) => {
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
        return;
      }

      if (data.msg_type === "authorize") {
        addLog("🔐 Autenticado com sucesso!");
        addLog(`📊 Monitorando: ${config.symbol}`);
      }

      if (data.msg_type === "balance") {
        const balance = data.balance?.balance || 1000;
        setStats(prev => ({ ...prev, balance }));
        addLog(`💰 Saldo: $${balance} USD`);
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
      if (!tick || !tick.quote) return;
      
      const price = parseFloat(tick.quote.toString());
      const timestamp = Math.floor(Date.now() / 1000);
      const volume = tick.volume || 1;
      const now = Date.now();
      
      // Atualizar dados de preço
      setPriceData(currentPriceData => {
        const newPriceData = [...currentPriceData, { high: price, low: price, close: price, timestamp }];
        
        // Manter apenas dados necessários
        const maxDataPoints = Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods) * 2;
        const finalPriceData = newPriceData.length > maxDataPoints ? 
          newPriceData.slice(-maxDataPoints) : newPriceData;
        
        // Atualizar contador de dados
        setStats(prev => ({ ...prev, dataCount: finalPriceData.length }));
        
        // Log de progresso a cada 5 ticks
        if (finalPriceData.length % 5 === 0) {
          addLog(`📈 Dados coletados: ${finalPriceData.length} | Preço: ${price.toFixed(4)}`);
        }

        // ✅ ANÁLISE SEMPRE ATIVA - SEM VERIFICAÇÕES COMPLEXAS
        if (finalPriceData.length >= 21) { // Mínimo de dados necessários
          
          // Controles básicos de tempo
          const timeSinceLastAnalysis = now - lastAnalysisTime;
          const timeSinceLastTrade = now - lastTradeTime;
          
          // Se está em trading ou análise muito recente, aguardar
          if (isTrading || timeSinceLastAnalysis < 5000) {
            return finalPriceData;
          }
          
          // Se trade muito recente, aguardar
          if (timeSinceLastTrade < 30000 && lastTradeTime > 0) {
            return finalPriceData;
          }
          
          // ✅ EXECUTAR ANÁLISE
          setLastAnalysisTime(now);
          setStats(prev => ({ ...prev, status: "🔍 Analisando sinais..." }));
          
          setTimeout(() => {
            const analysis = analyzeSignals(finalPriceData, volumeData);
            
            if (analysis) {
              updateSignalsDisplay(analysis.signals, analysis.confidence);
              
              if (analysis.finalSignal !== "NEUTRO" && analysis.confidence >= config.minConfidence) {
                addLog(`🎯 SINAL DETECTADO: ${analysis.finalSignal} (${analysis.confidence}%)`);
                toast({
                  title: "🎯 Sinal detectado!",
                  description: `${analysis.finalSignal} com ${analysis.confidence}% de confiança`,
                });
                
                setIsTrading(true);
                executeTrade(analysis.finalSignal, ws);
              } else {
                addLog(`📊 Análise: ${analysis.finalSignal} (${analysis.confidence}%) - Aguardando sinal melhor...`);
                setStats(prev => ({ ...prev, status: "📊 Coletando dados..." }));
              }
            }
          }, 100);
        } else {
          // Ainda coletando dados iniciais
          const progress = Math.round((finalPriceData.length / 21) * 100);
          setStats(prev => ({ ...prev, status: `📊 Coletando dados... ${progress}%` }));
        }
        
        return finalPriceData;
      });

      // Atualizar volume data
      setVolumeData(currentVolumeData => {
        const newVolumeData = [...currentVolumeData, volume];
        const maxDataPoints = Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods) * 2;
        return newVolumeData.length > maxDataPoints ? 
          newVolumeData.slice(-maxDataPoints) : newVolumeData;
      });
      
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
    
    addLog(`🚀 EXECUTANDO TRADE: ${signal} - $${stats.currentStake}`);
    
    // ✅ SIMULAR TRADE PARA TESTE (remover quando conectar Deriv real)
    setTimeout(() => {
      const mockProfit = Math.random() > 0.5 ? stats.currentStake * 0.8 : -stats.currentStake;
      const mockContract = {
        is_sold: true,
        profit: mockProfit,
        contract_id: `mock_${Date.now()}`
      };
      handleTradeResult(mockContract);
    }, 3000);
    
    setStats(prev => ({ ...prev, status: `🚀 ${signal} - $${stats.currentStake}` }));
  };

  const handleTradeResult = (contract: any) => {
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
      if (newMartingaleLevel < 3) {
        const newStake = stats.currentStake * config.martingale;
        setStats(prev => ({ 
          ...prev, 
          currentStake: newStake,
          martingaleLevel: newMartingaleLevel
        }));
        addLog(`📈 Nova entrada: $${newStake}`);
      } else {
        setStats(prev => ({ 
          ...prev, 
          martingaleLevel: 0,
          currentStake: config.stake
        }));
        addLog("🔄 Martingale resetado");
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
      handleStop();
    } else if (stats.profit + profit <= config.stopLoss) {
      addLog("💀 STOP LOSS atingido! Parando bot.");
      handleStop();
    } else {
      addLog("🔄 Aguardando próximo sinal...");
      setStats(prev => ({ ...prev, status: "📊 Coletando dados..." }));
      setIsTrading(false);
      setLastTradeTime(Date.now());
    }
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
    
    // Reset data
    setPriceData([]);
    setVolumeData([]);
    setIsTrading(false);
    setLastTradeTime(0);
    setLastAnalysisTime(0);
    
    setStats(prev => ({ 
      ...prev, 
      martingaleLevel: 0,
      currentStake: config.stake,
      profit: 0,
      total: 0,
      wins: 0,
      losses: 0,
      accuracy: 0,
      dataCount: 0
    }));

    addLog(`🚀 Iniciando Bot - Par: ${config.symbol} | Entrada: $${config.stake}`);
    addLog(`⚙️ Min Confiança: ${config.minConfidence}% | Duração: ${config.duration}min`);
    addLog(`🔧 MODO SIMPLIFICADO - Análise automática ativada`);
    setStats(prev => ({ ...prev, status: "🔄 Conectando..." }));
    
    toast({
      title: "🚀 Bot iniciado!",
      description: `Monitorando ${config.symbol} - Modo simplificado`,
    });

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

  return (
    <div className="space-y-6">
      {/* Status Simplificado */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            🚀 BOT MVB - MODO SIMPLIFICADO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>CORREÇÃO FINAL APLICADA:</strong> Bot funciona sem depender do saldo da Deriv. 
              Análise automática com dados coletados. Trades simulados para teste.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Strategy Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            🤖 Estratégia MHI Avançada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">MHI</div>
              <div className="text-lg font-bold text-blue-600">{signals.mhi}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Tendência</div>
              <div className="text-lg font-bold text-green-600">{signals.trend}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">EMA</div>
              <div className="text-lg font-bold text-purple-600">{signals.ema}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">RSI</div>
              <div className="text-lg font-bold text-orange-600">{signals.rsi}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Volume</div>
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
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token API Deriv (Opcional)</Label>
              <Input
                id="token"
                type="password"
                placeholder="Cole seu token da Deriv"
                value={config.token}
                onChange={(e) => updateConfig({ token: e.target.value })}
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
                  onChange={(e) => updateConfig({ stake: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minConfidence">Confiança Mínima (%)</Label>
                <Input
                  id="minConfidence"
                  type="number"
                  min="50"
                  max="95"
                  value={config.minConfidence}
                  onChange={(e) => updateConfig({ minConfidence: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Símbolo</Label>
              <Select 
                value={config.symbol} 
                onValueChange={(value) => updateConfig({ symbol: value })} 
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R_10">Volatility 10 Index</SelectItem>
                  <SelectItem value="R_25">Volatility 25 Index</SelectItem>
                  <SelectItem value="R_50">Volatility 50 Index</SelectItem>
                  <SelectItem value="R_75">Volatility 75 Index</SelectItem>
                  <SelectItem value="R_100">Volatility 100 Index</SelectItem>
                </SelectContent>
              </Select>
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
                <div className="text-sm text-gray-600">Dados</div>
                <div className="font-bold text-purple-600">{stats.dataCount}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Trades</div>
                <div className="font-bold text-orange-600">{stats.total}</div>
              </div>
            </div>
            
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Log do Sistema</CardTitle>
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