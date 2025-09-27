import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, HelpCircle, Activity, Monitor } from 'lucide-react';
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
}

interface BotStats {
  status: string;
  balance: number;
  profit: number;
  accuracy: number;
  dataCount: number;
  martingaleLevel: number;
  currentStake: number;
}

interface TradeHistory {
  contractId: string;
  signal: string;
  confidence: string;
  stake: number;
  result: string;
  profit: number;
  time: string;
}

export default function BotInterface() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<BotConfig>({
    token: '',
    stake: 1,
    martingale: 2,
    duration: 2,
    symbol: 'R_10',
    stopWin: 10,
    stopLoss: -20,
    minConfidence: 75
  });

  const [stats, setStats] = useState<BotStats>({
    status: 'Aguardando...',
    balance: 0,
    profit: 0,
    accuracy: 0,
    dataCount: 0,
    martingaleLevel: 0,
    currentStake: 1
  });

  const [signals, setSignals] = useState({
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

  const handleStart = () => {
    if (!config.token.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Insira seu token da Deriv para conectar",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setStats(prev => ({ ...prev, status: 'Conectando...' }));
    addLog('🚀 Iniciando Bot MVB Pro');
    addLog(`📊 Configuração: ${config.symbol} | Entrada: $${config.stake} | Martingale: ${config.martingale}x`);
    
    toast({
      title: "Bot iniciado",
      description: `Monitorando ${config.symbol} com entrada de $${config.stake}`,
    });

    // Simular conexão e dados
    setTimeout(() => {
      setStats(prev => ({ ...prev, status: 'Analisando...', balance: 1000 }));
      addLog('✅ Conectado com sucesso!');
      addLog('📈 Coletando dados do mercado...');
    }, 2000);
  };

  const handleStop = () => {
    setIsRunning(false);
    setStats(prev => ({ ...prev, status: 'Parado' }));
    addLog('⏹ Bot parado pelo usuário');
    
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
            Estratégia MHI Avançada com IA
          </CardTitle>
          <CardDescription>
            Combina MHI tradicional com EMA, RSI, Volume e Análise de Tendência para máxima precisão
          </CardDescription>
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
                placeholder="Cole seu token aqui"
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
                <Label htmlFor="martingale">Martingale</Label>
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
              <Label htmlFor="symbol">Ativo</Label>
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
                <Label htmlFor="stopWin">Stop Win</Label>
                <Input
                  id="stopWin"
                  type="number"
                  value={config.stopWin}
                  onChange={(e) => setConfig({ ...config, stopWin: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss</Label>
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
              <Label htmlFor="duration">Duração (min)</Label>
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
                <div className="font-bold text-blue-600">{stats.accuracy}%</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleStart} 
                disabled={isRunning}
                className="flex-1"
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar
              </Button>
              <Button 
                onClick={handleStop} 
                disabled={!isRunning}
                variant="destructive"
                className="flex-1"
              >
                <Square className="mr-2 h-4 w-4" />
                Parar
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
          <CardTitle>Log de Atividades</CardTitle>
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
          <CardTitle>Histórico de Operações</CardTitle>
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