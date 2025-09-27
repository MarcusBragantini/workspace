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
  Shield,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ===== SISTEMA DE LICENÇAS =====
const LICENSE_KEYS = {
  'STANDARD-MVB-2025': {
    type: 'standard',
    days: 30,
    features: ['all_features', 'premium_support'],
    maxDevices: 2
  },
  'BASIC-MVB-7': {
    type: 'basic', 
    days: 7,
    features: ['basic_features', 'email_support'],
    maxDevices: 1
  },
  'FREE-MVB-24': {
    type: 'free',
    days: 1,
    features: ['limited_features'],
    maxDevices: 1
  },
  'PRO-MVB-UNLIMITED': {
    type: 'pro',
    days: 365,
    features: ['all_features', 'premium_support', 'unlimited_trades'],
    maxDevices: 5
  }
};

interface LicenseInfo {
  type: string;
  days: number;
  features: string[];
  maxDevices: number;
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

export default function BotInterface() {
  const { toast } = useToast() || { toast: () => {} };
  
  // ===== ESTADOS DE LICENÇA =====
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [deviceCount, setDeviceCount] = useState(0);
  const [licenseStatus, setLicenseStatus] = useState('');
  
  // ===== ESTADOS DO BOT (LÓGICA ORIGINAL) =====
  const [isRunning, setIsRunning] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [currentStake, setCurrentStake] = useState(1);
  const [initialStake, setInitialStake] = useState(1);
  const [martingaleMultiplier, setMartingaleMultiplier] = useState(2);
  const [martingaleLevel, setMartingaleLevel] = useState(0);
  const [maxMartingale] = useState(3);
  const [profit, setProfit] = useState(0);
  const [lastTradeTime, setLastTradeTime] = useState(0);
  const [minTradeInterval] = useState(60000);
  
  // ===== CONFIGURAÇÕES =====
  const [config, setConfig] = useState({
    token: '',
    stake: 1,
    martingale: 2,
    duration: 2,
    symbol: 'R_10',
    stopWin: 3,
    stopLoss: -5,
    minConfidence: 20,
    mhiPeriods: 14,
    emaFast: 9,
    emaSlow: 21,
    rsiPeriods: 14
  });

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
  
  // ===== REFS =====
  const wsRef = useRef<WebSocket | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // ===== WEBSOCKET ENDPOINTS =====
  const WEBSOCKET_ENDPOINTS = [
    "wss://ws.binaryws.com/websockets/v3",
    "wss://ws.derivws.com/websockets/v3"
  ];

  // ===== FUNÇÕES DE LICENÇA =====
  const generateDeviceId = () => {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ];
    return btoa(fingerprint.join('|')).slice(0, 24);
  };

  const validateLicense = () => {
    const key = licenseKey.trim();
    const license = LICENSE_KEYS[key as keyof typeof LICENSE_KEYS];
    
    if (!license) {
      setLicenseStatus('Licença inválida. Verifique sua chave de acesso.');
      toast({
        title: "Licença inválida",
        description: "Chave de licença não encontrada. Verifique se digitou corretamente.",
        variant: "destructive"
      });
      return;
    }
    
    const currentDeviceId = generateDeviceId();
    setDeviceId(currentDeviceId);
    
    // Verificar dispositivos registrados
    const deviceKey = `mvb_device_${key}`;
    const registeredDevice = localStorage.getItem(deviceKey);
    
    if (registeredDevice && registeredDevice !== currentDeviceId) {
      // Verificar se pode registrar novo dispositivo
      const devicesKey = `mvb_devices_${key}`;
      const devices = JSON.parse(localStorage.getItem(devicesKey) || '[]');
      
      if (devices.length >= license.maxDevices) {
        setLicenseStatus('Esta licença já está em uso no máximo de dispositivos permitidos.');
        toast({
          title: "Limite de dispositivos atingido",
          description: `Esta licença permite apenas ${license.maxDevices} dispositivo(s).`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Registrar dispositivo
    localStorage.setItem(deviceKey, currentDeviceId);
    const devicesKey = `mvb_devices_${key}`;
    const devices = JSON.parse(localStorage.getItem(devicesKey) || '[]');
    
    if (!devices.find((d: any) => d.id === currentDeviceId)) {
      devices.push({
        id: currentDeviceId,
        name: `Dispositivo ${devices.length + 1}`,
        registeredAt: Date.now(),
        userAgent: navigator.userAgent.slice(0, 50)
      });
      localStorage.setItem(devicesKey, JSON.stringify(devices));
    }
    
    setDeviceCount(devices.length);
    setLicenseInfo(license);
    setIsLicenseValid(true);
    setLicenseStatus('Acesso autorizado com sucesso!');
    
    // Salvar sessão
    const sessionData = {
      license,
      deviceId: currentDeviceId,
      expires: Date.now() + (license.days * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem('mvb_session_2025', btoa(JSON.stringify(sessionData)));
    
    toast({
      title: "✅ Acesso liberado!",
      description: `Tipo: ${license.type.toUpperCase()} | Dispositivos: ${devices.length}/${license.maxDevices}`,
    });
    
    addLog(`🔑 Licença ativada: ${license.type.toUpperCase()}`);
    addLog(`📱 Dispositivo ${devices.length}/${license.maxDevices} autorizado`);
  };

  // ===== VERIFICAR SESSÃO EXISTENTE =====
  useEffect(() => {
    const savedSession = localStorage.getItem('mvb_session_2025');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(atob(savedSession));
        if (sessionData.expires > Date.now()) {
          setLicenseInfo(sessionData.license);
          setDeviceId(sessionData.deviceId);
          setIsLicenseValid(true);
          setLicenseStatus('Sessão restaurada com sucesso!');
          
          // Contar dispositivos
          const devicesKey = `mvb_devices_${Object.keys(LICENSE_KEYS).find(key => LICENSE_KEYS[key as keyof typeof LICENSE_KEYS].type === sessionData.license.type)}`;
          const devices = JSON.parse(localStorage.getItem(devicesKey) || '[]');
          setDeviceCount(devices.length);
        } else {
          localStorage.removeItem('mvb_session_2025');
        }
      } catch (error) {
        localStorage.removeItem('mvb_session_2025');
      }
    }
  }, []);

  // ===== FUNÇÕES DO BOT (LÓGICA ORIGINAL) =====
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-49), logMessage]);
  };

  const debugLog = (message: string, data?: any) => {
    // Função de debug simplificada
    try {
      console.log(`[DEBUG] ${message}`, data || '');
    } catch (error) {
      // Ignorar erros de console
    }
  };

  const calculateNextStake = () => {
    const newStake = stats.currentStake * config.martingale;
    const balance = stats.balance || 100;
    
    const limits = {
      maxMartingale: config.stake * Math.pow(config.martingale, 3),
      maxBalancePercent: balance * 0.3,
      minStake: 1
    };
    
    let finalStake = Math.min(newStake, limits.maxMartingale, limits.maxBalancePercent);
    finalStake = Math.max(finalStake, limits.minStake);
    finalStake = Math.round(finalStake);
    
    return finalStake;
  };

  const validateMartingale = (newStake: number) => {
    const balance = stats.balance || 100;
    
    if (stats.martingaleLevel >= maxMartingale) {
      addLog("🚫 Máximo de 3 martingales atingido!");
      return false;
    }
    
    if (newStake > balance * 0.5) {
      addLog(`⚠️ Stake muito alto para o saldo!`);
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Monitorar mudanças no estado isRunning
  useEffect(() => {
    addLog(`🔄 Estado isRunning mudou para: ${isRunning}`);
  }, [isRunning]);

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
        addLog(`🔌 WebSocket fechado - wasClean: ${event.wasClean}, isRunning: ${isRunning}`);
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
      const data = JSON.parse(event.data);

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
              addLog(`🔄 Estado alterado: Bot agora está RODANDO`);
            }
      }

      if (data.msg_type === "tick") {
        addLog(`📈 Tick recebido: ${data.tick?.quote || 'N/A'}`);
        processTick(data.tick, ws);
      }

      if (data.msg_type === "proposal") {
        addLog(`📋 Proposta recebida`);
        const buyRequest = { buy: data.proposal.id, price: currentStake };
        ws.send(JSON.stringify(buyRequest));
      }

      if (data.msg_type === "buy") {
        if (data.buy.error) {
          addLog(`❌ Erro na compra: ${data.buy.error.message}`);
          setIsTrading(false);
          return;
        }
        
        addLog(`✅ Contrato ID: ${data.buy.contract_id}`);
        ws.send(JSON.stringify({ 
          proposal_open_contract: 1, 
          subscribe: 1, 
          contract_id: data.buy.contract_id 
        }));
      }

      if (data.msg_type === "proposal_open_contract") {
        const contract = data.proposal_open_contract;
        if (contract.is_sold) {
          handleTradeResult(contract);
        }
      }

    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro processando mensagem: ${err.message}`);
    }
  };

  const processTick = (tick: any, ws: WebSocket) => {
    try {
      if (!tick || !tick.quote) {
        addLog("⚠️ Tick inválido recebido");
        return;
      }
      
      const price = parseFloat(tick.quote);
      const timestamp = Math.floor(Date.now() / 1000);
      const volume = tick.volume || 1;
      
      const timeSinceLastTrade = Date.now() - lastTradeTime;
      if (timeSinceLastTrade < minTradeInterval && lastTradeTime > 0) return;
      
      setPriceData(prevData => {
        const newData = [...prevData, { high: price, low: price, close: price, timestamp }];
        const maxDataPoints = Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods) * 2;
        const trimmedData = newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
        
        setStats(prev => ({ ...prev, dataCount: trimmedData.length }));
        
        // Log da condição de análise
        const requiredData = Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods);
        const canAnalyze = trimmedData.length >= requiredData && isRunning && !isTrading;
        
        addLog(`🔍 Condição análise: dados=${trimmedData.length}/${requiredData}, isRunning=${isRunning}, isTrading=${isTrading}, podeAnalisar=${canAnalyze}`);
        
        if (canAnalyze) {
          addLog("🎯 INICIANDO ANÁLISE DE SINAIS");
          try {
            const analysis = analyzeSignals(trimmedData, volumeData);
          
          // Log sempre que há análise
          if (analysis) {
            addLog(`📊 Análise: ${analysis.finalSignal} | Confiança: ${analysis.confidence}% | Mín: ${config.minConfidence}%`);
            updateSignalsDisplay(analysis.signals, analysis.confidence);
            
            if (analysis.finalSignal !== "NEUTRO" && analysis.confidence >= config.minConfidence) {
              addLog(`🎯 SINAL EXECUTÁVEL: ${analysis.finalSignal} (${analysis.confidence}%)`);
              toast({
                title: "🎯 Sinal detectado!",
                description: `${analysis.finalSignal} com ${analysis.confidence}% de confiança`,
              });
              
              setIsTrading(true);
              executeTrade(analysis.finalSignal, ws);
            } else {
              // Log detalhado do porquê não executou
              if (analysis.finalSignal === "NEUTRO") {
                addLog(`⚠️ Sinal NEUTRO - não executando`);
              } else {
                addLog(`⚠️ Confiança baixa: ${analysis.confidence}% < ${config.minConfidence}%`);
              }
            }
          } else {
            addLog(`❌ Análise falhou - dados insuficientes`);
          }
          } catch (error) {
            const err = error as Error;
            addLog(`❌ ERRO na análise: ${err.message}`);
            console.error('Erro na análise:', err);
          }
        } else {
          // Log das condições que impedem análise
          if (trimmedData.length < Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods)) {
            addLog(`⏳ Aguardando dados: ${trimmedData.length}/${Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods)}`);
          } else if (!isRunning) {
            addLog(`⏹ Bot não está rodando`);
          } else if (isTrading) {
            addLog(`🔄 Já executando trade`);
          }
        }
        
        return trimmedData;
      });

      setVolumeData(prevVolume => {
        const newVolume = [...prevVolume, volume];
        const maxDataPoints = Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods) * 2;
        return newVolume.length > maxDataPoints ? newVolume.slice(-maxDataPoints) : newVolume;
      });
      
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro processando tick: ${err.message}`);
    }
  };

  const analyzeSignals = (prices: PriceData[], volumes: number[]) => {
    try {
      if (!prices || prices.length < Math.max(config.mhiPeriods, config.emaSlow, config.rsiPeriods)) {
        return null;
      }
      
      // MHI Calculation (lógica exata do HTML)
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
      
      // EMA Calculation (lógica exata do HTML)
      const emaFast = calculateEMA(prices, config.emaFast);
      const emaSlow = calculateEMA(prices, config.emaSlow);
      
      let trendSignal = "NEUTRO";
      if (emaFast > emaSlow && currentPrice > emaFast) {
        trendSignal = "CALL";
      } else if (emaFast < emaSlow && currentPrice < emaFast) {
        trendSignal = "PUT";
      }
      
      // RSI Calculation (lógica exata do HTML)
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
      
      // Log detalhado dos cálculos
      addLog(`🔍 Cálculos: MHI=${mhiSignal}, Trend=${trendSignal}, EMA=${signals.ema}, RSI=${rsiSignal} (${rsi.toFixed(1)})`);
      addLog(`🎯 Resultado: ${finalSignal} | Confiança: ${confidence}%`);
      
      return {
        signals: { ...signals, final: finalSignal },
        confidence,
        finalSignal
      };
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro no cálculo MHI: ${err.message}`);
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

    // debugLog("Enviando proposta:", proposal);
    ws.send(JSON.stringify(proposal));
    setStats(prev => ({ ...prev, status: `🚀 ${signal} - $${stats.currentStake}` }));
  };

  const handleTradeResult = (contract: any) => {
    const tradeProfit = contract.profit;
    const finalSignal = signals.final;
    const confidence = signals.confidence.replace('%', '') || "0";

    setProfit(prev => prev + tradeProfit);
    setStats(prev => ({
      ...prev,
      profit: prev.profit + tradeProfit,
      total: prev.total + 1,
      wins: tradeProfit >= 0 ? prev.wins + 1 : prev.wins,
      losses: tradeProfit < 0 ? prev.losses + 1 : prev.losses,
      accuracy: prev.total > 0 ? ((tradeProfit >= 0 ? prev.wins + 1 : prev.wins) / (prev.total + 1)) * 100 : 0
    }));

    addTradeToHistory(contract.contract_id, finalSignal, confidence, stats.currentStake, stats.martingaleLevel, tradeProfit >= 0 ? "WIN" : "LOSS", tradeProfit);

    addLog(`📊 Resultado: ${tradeProfit >= 0 ? 'WIN' : 'LOSS'} | Entrada: ${stats.currentStake} | Lucro: ${tradeProfit.toFixed(2)} USD`);
    
    if (tradeProfit >= 0) {
      toast({
        title: "🎉 WIN!",
        description: `Lucro: +${tradeProfit.toFixed(2)}`,
      });
    } else {
      toast({
        title: "📉 Loss",
        description: `Prejuízo: ${tradeProfit.toFixed(2)}`,
        variant: "destructive"
      });
    }

    // Martingale logic melhorada
    if (tradeProfit < 0) {
      const newMartingaleLevel = stats.martingaleLevel + 1;
      addLog(`🔴 Perda ${newMartingaleLevel}/${maxMartingale}`);
      
      const newStake = calculateNextStake();
      
      if (validateMartingale(newStake)) {
        setCurrentStake(newStake);
        setMartingaleLevel(newMartingaleLevel);
        setStats(prev => ({ ...prev, martingaleLevel: newMartingaleLevel, currentStake: newStake }));
        addLog(`📈 Nova entrada: $${newStake} ($${newStake/config.martingale} × ${config.martingale})`);
      } else {
        setMartingaleLevel(0);
        setCurrentStake(config.stake);
        setStats(prev => ({ ...prev, martingaleLevel: 0, currentStake: config.stake }));
        addLog("🔄 Martingale resetado (limite máximo atingido)");
      }
    } else {
      setMartingaleLevel(0);
      setCurrentStake(config.stake);
      setStats(prev => ({ ...prev, martingaleLevel: 0, currentStake: config.stake }));
      addLog(`✅ WIN! Reset para entrada inicial: $${config.stake}`);
    }

    // Check stop conditions
    const newProfit = stats.profit + tradeProfit;
    if (newProfit >= config.stopWin) {
      addLog("🎯 STOP WIN atingido! Parando bot.");
      toast({
        title: "🎯 Stop Win atingido!",
        description: `Lucro total: ${newProfit.toFixed(2)}`,
      });
      addLog("🛑 STOP WIN - Parando bot");
      handleStop();
    } else if (newProfit <= config.stopLoss) {
      addLog("💀 STOP LOSS atingido! Parando bot.");
      toast({
        title: "⛔ Stop Loss atingido!",
        description: `Prejuízo: ${newProfit.toFixed(2)}`,
        variant: "destructive"
      });
      addLog("🛑 STOP LOSS - Parando bot");
      handleStop();
    } else {
      addLog("🔄 Aguardando próximo sinal...");
      setStats(prev => ({ ...prev, status: "📊 Analisando..." }));
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
    addLog("🚀 INICIANDO BOT - Verificando estado atual");
    
    if (isRunning) {
      addLog("⚠️ Bot já está em execução!");
      toast({
        title: "Bot já está em execução!",
        variant: "destructive"
      });
      return;
    }

    const token = config.token.trim();
    if (!token) {
      addLog("❌ Token não fornecido");
      toast({
        title: "Token da Deriv é obrigatório!",
        description: "Digite seu token para conectar",
        variant: "destructive"
      });
      return;
    }
    
    addLog(`🔑 Token fornecido: ${token.slice(0, 10)}...`);

    // Reset data
    setPriceData([]);
    setVolumeData([]);
    setIsTrading(false);
    setLastTradeTime(0);
    setMartingaleLevel(0);
    setCurrentStake(config.stake);
    setInitialStake(config.stake);
    
    setStats(prev => ({ 
      ...prev, 
      profit: 0,
      total: 0,
      wins: 0,
      losses: 0,
      accuracy: 0,
      dataCount: 0,
      martingaleLevel: 0,
      currentStake: config.stake
    }));

    addLog(`🚀 Iniciando Bot - Par: ${config.symbol} | Entrada: $${config.stake} | Martingale: ${config.martingale}x`);
    addLog(`⚙️ Configurações: Min Confiança: ${config.minConfidence}% | Duração: ${config.duration}min`);
    setStats(prev => ({ ...prev, status: "🔄 Conectando..." }));
    
    toast({
      title: "🚀 Bot iniciado!",
      description: `Monitorando ${config.symbol}`,
    });

    const ws = connectWebSocket(token);
    if (ws) {
      wsRef.current = ws;
      addLog("🌐 WebSocket conectado - Aguardando autenticação...");
    } else {
      addLog("❌ Falha ao conectar WebSocket");
    }
  };

  const handleStop = () => {
    addLog("🛑 PARANDO BOT - Estado mudando para false");
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
    toast({
      title: "Bot parado",
      description: "Sistema interrompido com sucesso",
    });
  };

  const handleTest = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Conecte o bot primeiro!",
        description: "Conecte o bot antes de fazer testes.",
        variant: "destructive"
      });
      return;
    }
    addLog("🧪 TESTE FORÇADO - CALL");
    toast({
      title: "Executando teste de sinal CALL...",
      description: "Teste de execução manual",
    });
    setIsTrading(true);
    executeTrade("CALL", wsRef.current);
  };

  const handleResetMartingale = () => {
    setMartingaleLevel(0);
    setCurrentStake(config.stake);
    setStats(prev => ({ ...prev, martingaleLevel: 0, currentStake: config.stake }));
    addLog("🔄 Martingale resetado manualmente");
    toast({
      title: "Martingale resetado",
      description: "Reset para entrada inicial",
    });
  };

  const handleAnalysis = () => {
    if (priceData.length < 10) {
      addLog("📊 Coletando dados...");
      toast({
        title: "Coletando dados...",
        description: "Aguardando mais dados para análise",
        variant: "destructive"
      });
      return;
    }
    
    const analysis = analyzeSignals(priceData, volumeData);
    if (analysis) {
      addLog("📈 ANÁLISE COMPLETA DISPONÍVEL");
      addLog(`🎯 Sinal: ${analysis.finalSignal} | Confiança: ${analysis.confidence}%`);
      toast({
        title: "Análise completa disponível",
        description: `Sinal: ${analysis.finalSignal} | Confiança: ${analysis.confidence}%`,
      });
    }
  };

  const handleHelp = () => {
    toast({
      title: "Ajuda - Bot MVB Pro",
      description: "Sistema de trading automatizado com estratégias avançadas. Configure seu token da Deriv e ajuste os parâmetros conforme sua estratégia.",
    });
  };

  // ===== RENDER =====
  if (!isLicenseValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Bot MVB
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Sistema de Trading Automatizado
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="licenseKey" className="text-base font-semibold">
                Insira sua Licença:
              </Label>
              <Input
                id="licenseKey"
                type="text"
                placeholder="Digite sua chave de licença"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                maxLength={20}
                className="h-12 text-center font-mono text-lg"
              />
            </div>
            
            <Button 
              onClick={validateLicense}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={!licenseKey.trim()}
            >
              <Key className="mr-2 h-5 w-5" />
              Acessar Sistema
            </Button>
            
            {licenseStatus && (
              <Alert className={licenseStatus.includes('sucesso') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {licenseStatus.includes('sucesso') ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={licenseStatus.includes('sucesso') ? 'text-green-800' : 'text-red-800'}>
                  {licenseStatus}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Licenças de exemplo */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Licenças Disponíveis:
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">STANDARD-MVB-2025</span>
                  <span className="text-green-600 font-semibold">30 dias | 2 dispositivos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">PRO-MVB-UNLIMITED</span>
                  <span className="text-purple-600 font-semibold">365 dias | 5 dispositivos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">FREE-MVB-24</span>
                  <span className="text-blue-600 font-semibold">1 dia | 1 dispositivo</span>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da Licença */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Shield className="h-5 w-5" />
            Status da Licença - {licenseInfo?.type.toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Status</div>
              <Badge variant="default" className="bg-green-600">
                ✅ Ativa
              </Badge>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Dispositivos</div>
              <div className="text-lg font-bold text-blue-600">{deviceCount}/{licenseInfo?.maxDevices}</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Device ID</div>
              <div className="text-xs font-mono text-gray-500">{deviceId.slice(0, 8)}...</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-600">Validade</div>
              <div className="text-sm font-medium text-purple-600">{licenseInfo?.days} dias</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
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
                  onChange={(e) => setConfig(prev => ({ ...prev, stake: Number(e.target.value) }))}
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
                  onChange={(e) => setConfig(prev => ({ ...prev, martingale: Number(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Símbolo</Label>
              <Select 
                value={config.symbol} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, symbol: value }))} 
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
                  onChange={(e) => setConfig(prev => ({ ...prev, stopWin: Number(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss (prejuízo)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  value={config.stopLoss}
                  onChange={(e) => setConfig(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
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
                onChange={(e) => setConfig(prev => ({ ...prev, minConfidence: Number(e.target.value) }))}
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
                onChange={(e) => setConfig(prev => ({ ...prev, duration: Number(e.target.value) }))}
                disabled={isRunning}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações Avançadas de Trading</CardTitle>
            <CardDescription>Parâmetros técnicos para análise de sinais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mhiPeriods">Períodos MHI</Label>
                <Input
                  id="mhiPeriods"
                  type="number"
                  min="5"
                  max="50"
                  value={config.mhiPeriods}
                  onChange={(e) => setConfig(prev => ({ ...prev, mhiPeriods: Number(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emaFast">EMA Rápida</Label>
                <Input
                  id="emaFast"
                  type="number"
                  min="5"
                  max="20"
                  value={config.emaFast}
                  onChange={(e) => setConfig(prev => ({ ...prev, emaFast: Number(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emaSlow">EMA Lenta (Tendência)</Label>
                <Input
                  id="emaSlow"
                  type="number"
                  min="15"
                  max="50"
                  value={config.emaSlow}
                  onChange={(e) => setConfig(prev => ({ ...prev, emaSlow: Number(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rsiPeriods">RSI Períodos</Label>
                <Input
                  id="rsiPeriods"
                  type="number"
                  min="7"
                  max="21"
                  value={config.rsiPeriods}
                  onChange={(e) => setConfig(prev => ({ ...prev, rsiPeriods: Number(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>
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
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleStart} 
                disabled={isRunning}
                className="flex-1 min-w-[120px]"
              >
                <Play className="mr-2 h-4 w-4" />
                ▶ Iniciar Bot
              </Button>
              <Button 
                onClick={handleStop} 
                disabled={!isRunning}
                variant="destructive"
                className="flex-1 min-w-[120px]"
              >
                <Square className="mr-2 h-4 w-4" />
                ⏹ Parar
              </Button>
              <Button 
                onClick={handleTest}
                disabled={!isRunning}
                variant="outline"
                className="min-w-[120px]"
              >
                🧪 Teste
              </Button>
              <Button 
                onClick={handleResetMartingale}
                variant="outline"
                className="min-w-[120px]"
              >
                🔄 Reset
              </Button>
              <Button 
                onClick={handleAnalysis}
                disabled={!isRunning}
                variant="outline"
                className="min-w-[120px]"
              >
                📈 Análise
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