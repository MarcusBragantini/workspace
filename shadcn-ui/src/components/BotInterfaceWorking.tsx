import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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

export default function BotInterfaceWorking() {
  const { toast } = useToast();
  
  // Estados principais
  const [isRunning, setIsRunning] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
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

  // Configurações
  const [config, setConfig] = useState({
    token: '',
    stake: 1,
    martingale: 2,
    duration: 2,
    symbol: 'R_10',
    stopWin: 3,
    stopLoss: -5,
    minConfidence: 20
  });

  // Dados de preços
  const [priceData, setPriceData] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // Função de log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-49), logMessage]);
  };

  // Auto-scroll dos logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // WebSocket endpoints
  const WEBSOCKET_ENDPOINTS = [
    "wss://ws.binaryws.com/websockets/v3",
    "wss://ws.derivws.com/websockets/v3"
  ];

  // Conectar WebSocket
  const connectWebSocket = (token: string): WebSocket | null => {
    try {
      const endpoint = WEBSOCKET_ENDPOINTS[0] + "?app_id=1089";
      const ws = new WebSocket(endpoint);
      
      ws.onopen = () => {
        addLog("✅ WebSocket conectado!");
        setStats(prev => ({ ...prev, status: "🔐 Autenticando..." }));
        ws.send(JSON.stringify({ authorize: token }));
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event, ws);
      };

      ws.onclose = () => {
        addLog("🔴 Conexão perdida");
        if (isRunning) {
          setTimeout(() => connectWebSocket(token), 2000);
        }
      };

      ws.onerror = () => {
        addLog("❌ Erro de conexão");
      };

      return ws;
    } catch (error) {
      addLog("❌ Erro ao criar WebSocket");
      return null;
    }
  };

  // Processar mensagens do WebSocket
  const handleWebSocketMessage = (event: MessageEvent, ws: WebSocket) => {
    try {
      const data = JSON.parse(event.data);

      if (data.error) {
        addLog(`❌ ERRO: ${data.error.message}`);
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
        const buyRequest = { buy: data.proposal.id, price: stats.currentStake };
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

  // Processar tick
  const processTick = (tick: any, ws: WebSocket) => {
    try {
      if (!tick || !tick.quote) {
        addLog("⚠️ Tick inválido");
        return;
      }
      
      const price = parseFloat(tick.quote);
      const timestamp = Math.floor(Date.now() / 1000);
      
      setPriceData(prevData => {
        const newData = [...prevData, { high: price, low: price, close: price, timestamp }];
        const trimmedData = newData.length > 40 ? newData.slice(-40) : newData;
        
        setStats(prev => ({ ...prev, dataCount: trimmedData.length }));
        
        // Análise simples quando temos dados suficientes
        if (trimmedData.length >= 14 && isRunning && !isTrading) {
          const analysis = analyzeSignals(trimmedData);
          
          if (analysis && analysis.finalSignal !== "NEUTRO" && analysis.confidence >= config.minConfidence) {
            addLog(`🎯 SINAL: ${analysis.finalSignal} (${analysis.confidence}%)`);
            setIsTrading(true);
            executeTrade(analysis.finalSignal, ws);
          }
        }
        
        return trimmedData;
      });
      
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro processando tick: ${err.message}`);
    }
  };

  // Análise de sinais simplificada
  const analyzeSignals = (prices: any[]) => {
    try {
      if (prices.length < 14) return null;
      
      // MHI simples
      const recentPrices = prices.slice(-14);
      const avgHigh = recentPrices.reduce((sum, p) => sum + p.high, 0) / 14;
      const avgLow = recentPrices.reduce((sum, p) => sum + p.low, 0) / 14;
      const currentPrice = recentPrices[recentPrices.length - 1].close;
      
      let mhiSignal = "NEUTRO";
      if (currentPrice > avgHigh) {
        mhiSignal = "CALL";
      } else if (currentPrice < avgLow) {
        mhiSignal = "PUT";
      }
      
      // EMA simples
      const emaFast = calculateEMA(prices, 9);
      const emaSlow = calculateEMA(prices, 21);
      
      let trendSignal = "NEUTRO";
      if (emaFast > emaSlow && currentPrice > emaFast) {
        trendSignal = "CALL";
      } else if (emaFast < emaSlow && currentPrice < emaFast) {
        trendSignal = "PUT";
      }
      
      // Sinal final
      let finalSignal = "NEUTRO";
      let confidence = 0;
      
      if (mhiSignal === "CALL" && trendSignal === "CALL") {
        finalSignal = "CALL";
        confidence = 80;
      } else if (mhiSignal === "PUT" && trendSignal === "PUT") {
        finalSignal = "PUT";
        confidence = 80;
      } else if (mhiSignal !== "NEUTRO" || trendSignal !== "NEUTRO") {
        finalSignal = mhiSignal !== "NEUTRO" ? mhiSignal : trendSignal;
        confidence = 60;
      }
      
      return {
        finalSignal,
        confidence
      };
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Erro na análise: ${err.message}`);
      return null;
    }
  };

  // Calcular EMA
  const calculateEMA = (prices: any[], period: number) => {
    if (prices.length < period) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, p) => sum + p.close, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i].close - ema) * multiplier + ema;
    }
    return ema;
  };

  // Executar trade
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

  // Processar resultado do trade
  const handleTradeResult = (contract: any) => {
    const tradeProfit = contract.profit;
    
    setStats(prev => ({
      ...prev,
      profit: prev.profit + tradeProfit,
      total: prev.total + 1,
      wins: tradeProfit >= 0 ? prev.wins + 1 : prev.wins,
      losses: tradeProfit < 0 ? prev.losses + 1 : prev.losses,
      accuracy: prev.total > 0 ? ((tradeProfit >= 0 ? prev.wins + 1 : prev.wins) / (prev.total + 1)) * 100 : 0
    }));

    addLog(`📊 Resultado: ${tradeProfit >= 0 ? 'WIN' : 'LOSS'} | Lucro: ${tradeProfit.toFixed(2)} USD`);
    
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

    setIsTrading(false);
    setStats(prev => ({ ...prev, status: "📊 Analisando..." }));
  };

  // Iniciar bot
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

    // Reset dados
    setPriceData([]);
    setIsTrading(false);
    setStats(prev => ({ 
      ...prev, 
      profit: 0,
      total: 0,
      wins: 0,
      losses: 0,
      accuracy: 0,
      dataCount: 0,
      currentStake: config.stake
    }));

    addLog(`🚀 Iniciando Bot - Par: ${config.symbol} | Entrada: $${config.stake}`);
    setStats(prev => ({ ...prev, status: "🔄 Conectando..." }));
    
    toast({
      title: "🚀 Bot iniciado!",
      description: `Monitorando ${config.symbol}`,
    });

    const ws = connectWebSocket(token);
    if (ws) {
      wsRef.current = ws;
    }
  };

  // Parar bot
  const handleStop = () => {
    setIsRunning(false);
    setIsTrading(false);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ forget_all: "ticks" }));
        wsRef.current.close();
      } catch (error) {
        wsRef.current.close();
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
      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minConfidence">Confiança Mínima (%)</Label>
              <Input
                id="minConfidence"
                type="number"
                min="10"
                max="95"
                value={config.minConfidence}
                onChange={(e) => setConfig(prev => ({ ...prev, minConfidence: Number(e.target.value) }))}
                disabled={isRunning}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleStart} 
              disabled={isRunning}
              className="flex-1"
            >
              ▶ Iniciar Bot
            </Button>
            <Button 
              onClick={handleStop} 
              disabled={!isRunning}
              variant="destructive"
              className="flex-1"
            >
              ⏹ Parar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-600">Status</div>
            <Badge variant={isRunning ? "default" : "secondary"}>
              {stats.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-600">Saldo</div>
            <div className="font-bold text-green-600">${stats.balance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-600">Lucro</div>
            <div className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.profit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-600">Dados</div>
            <div className="font-bold text-blue-600">{stats.dataCount}</div>
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
    </div>
  );
}
