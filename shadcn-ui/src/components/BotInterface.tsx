import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Play, 
  Square, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotConfig {
  derivToken: string;
  accountType: 'demo' | 'real';
  symbol: string;
  amount: number;
  martingale: boolean;
  martingaleMultiplier: number;
  maxMartingaleSteps: number;
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  maxDailyProfit: number;
  rsiPeriod: number;
  emaPeriod: number;
  strategy: 'mhi' | 'ema_rsi' | 'scalping';
}

interface TradingStats {
  totalTrades: number;
  winRate: number;
  profit: number;
  balance: number;
  isRunning: boolean;
  lastTrade: {
    time: string;
    result: 'win' | 'loss';
    amount: number;
    profit: number;
  } | null;
}

export default function BotInterface() {
  const { toast } = useToast();
  const [config, setConfig] = useState<BotConfig>({
    derivToken: '',
    accountType: 'demo',
    symbol: 'R_50',
    amount: 1,
    martingale: false,
    martingaleMultiplier: 2,
    maxMartingaleSteps: 3,
    stopLoss: 50,
    takeProfit: 100,
    maxDailyLoss: 100,
    maxDailyProfit: 200,
    rsiPeriod: 14,
    emaPeriod: 21,
    strategy: 'mhi'
  });

  const [stats, setStats] = useState<TradingStats>({
    totalTrades: 0,
    winRate: 0,
    profit: 0,
    balance: 1000,
    isRunning: false,
    lastTrade: null
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Simular dados de trading em tempo real quando o bot está rodando
    let interval: NodeJS.Timeout;
    
    if (stats.isRunning) {
      interval = setInterval(() => {
        // Simular uma nova operação a cada 30 segundos
        const isWin = Math.random() > 0.4; // 60% win rate
        const tradeProfit = isWin ? config.amount * 0.8 : -config.amount;
        
        setStats(prev => ({
          ...prev,
          totalTrades: prev.totalTrades + 1,
          profit: prev.profit + tradeProfit,
          balance: prev.balance + tradeProfit,
          winRate: prev.totalTrades > 0 ? 
            ((prev.winRate * prev.totalTrades + (isWin ? 1 : 0)) / (prev.totalTrades + 1)) * 100 : 
            (isWin ? 100 : 0),
          lastTrade: {
            time: new Date().toLocaleTimeString(),
            result: isWin ? 'win' : 'loss',
            amount: config.amount,
            profit: tradeProfit
          }
        }));

        const logMessage = `${new Date().toLocaleTimeString()} - ${isWin ? 'WIN' : 'LOSS'} - ${config.symbol} - $${config.amount} - Profit: $${tradeProfit.toFixed(2)}`;
        setLogs(prev => [logMessage, ...prev.slice(0, 49)]); // Keep last 50 logs
      }, 30000); // 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stats.isRunning, config.amount, config.symbol]);

  const handleConfigChange = (key: keyof BotConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const validateConfig = () => {
    if (!config.derivToken.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Digite seu token da Deriv para continuar",
        variant: "destructive"
      });
      return false;
    }

    if (config.amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor da aposta deve ser maior que zero",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSaveConfig = () => {
    if (validateConfig()) {
      setIsConfigured(true);
      toast({
        title: "Configuração salva!",
        description: "Bot configurado e pronto para iniciar",
      });
      
      // Simular conexão com a Deriv
      const logMessage = `${new Date().toLocaleTimeString()} - Bot configurado - Conta: ${config.accountType.toUpperCase()} - Token: ${config.derivToken.slice(0, 8)}...`;
      setLogs(prev => [logMessage, ...prev]);
    }
  };

  const handleStartBot = () => {
    if (!isConfigured) {
      toast({
        title: "Configure primeiro",
        description: "Salve as configurações antes de iniciar o bot",
        variant: "destructive"
      });
      return;
    }

    setStats(prev => ({ ...prev, isRunning: true }));
    toast({
      title: "Bot iniciado!",
      description: `Trading iniciado em conta ${config.accountType === 'real' ? 'REAL' : 'DEMO'}`,
    });

    const logMessage = `${new Date().toLocaleTimeString()} - BOT INICIADO - Estratégia: ${config.strategy.toUpperCase()} - Conta: ${config.accountType.toUpperCase()}`;
    setLogs(prev => [logMessage, ...prev]);
  };

  const handleStopBot = () => {
    setStats(prev => ({ ...prev, isRunning: false }));
    toast({
      title: "Bot parado",
      description: "Trading interrompido com sucesso",
    });

    const logMessage = `${new Date().toLocaleTimeString()} - BOT PARADO - Total de trades: ${stats.totalTrades}`;
    setLogs(prev => [logMessage, ...prev]);
  };

  const getStrategyDescription = (strategy: string) => {
    const descriptions = {
      mhi: 'Market Hours Indicator - Análise baseada em horários de mercado',
      ema_rsi: 'EMA + RSI - Combinação de médias móveis e índice de força relativa',
      scalping: 'Scalping - Operações rápidas com pequenos lucros'
    };
    return descriptions[strategy as keyof typeof descriptions] || strategy;
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="flex items-center space-x-2">
                  {stats.isRunning ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold text-green-600">Ativo</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="font-semibold text-gray-600">Parado</span>
                    </>
                  )}
                </div>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo</p>
                <p className="text-lg font-bold">${stats.balance.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lucro/Prejuízo</p>
                <p className={`text-lg font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${stats.profit.toFixed(2)}
                </p>
              </div>
              {stats.profit >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Acerto</p>
                <p className="text-lg font-bold">{stats.winRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="control">Controle</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações do Bot</span>
              </CardTitle>
              <CardDescription>
                Configure os parâmetros de trading do seu bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Conexão */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Conexão</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="derivToken">Token da Deriv</Label>
                    <Input
                      id="derivToken"
                      type="password"
                      placeholder="Digite seu token da Deriv"
                      value={config.derivToken}
                      onChange={(e) => handleConfigChange('derivToken', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Tipo de Conta</Label>
                    <Select value={config.accountType} onValueChange={(value) => handleConfigChange('accountType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demo">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span>Demo (Simulação)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="real">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span>Real (Dinheiro Real)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {config.accountType === 'real' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>ATENÇÃO:</strong> Você está configurando para operar com dinheiro real. 
                      Certifique-se de que entende os riscos envolvidos no trading automatizado.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* Estratégia */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Estratégia</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Estratégia de Trading</Label>
                    <Select value={config.strategy} onValueChange={(value) => handleConfigChange('strategy', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mhi">MHI (Market Hours Indicator)</SelectItem>
                        <SelectItem value="ema_rsi">EMA + RSI</SelectItem>
                        <SelectItem value="scalping">Scalping</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {getStrategyDescription(config.strategy)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Ativo</Label>
                    <Select value={config.symbol} onValueChange={(value) => handleConfigChange('symbol', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R_50">Volatility 50 Index</SelectItem>
                        <SelectItem value="R_75">Volatility 75 Index</SelectItem>
                        <SelectItem value="R_100">Volatility 100 Index</SelectItem>
                        <SelectItem value="BOOM500">Boom 500 Index</SelectItem>
                        <SelectItem value="CRASH500">Crash 500 Index</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Parâmetros de Trading */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Parâmetros de Trading</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor da Aposta ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0.35"
                      step="0.01"
                      value={config.amount}
                      onChange={(e) => handleConfigChange('amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss">Stop Loss ($)</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      min="0"
                      value={config.stopLoss}
                      onChange={(e) => handleConfigChange('stopLoss', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="takeProfit">Take Profit ($)</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      min="0"
                      value={config.takeProfit}
                      onChange={(e) => handleConfigChange('takeProfit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Martingale */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Martingale</h3>
                    <p className="text-sm text-gray-600">Dobrar aposta após perdas</p>
                  </div>
                  <Switch
                    checked={config.martingale}
                    onCheckedChange={(checked) => handleConfigChange('martingale', checked)}
                  />
                </div>
                
                {config.martingale && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="martingaleMultiplier">Multiplicador</Label>
                      <Input
                        id="martingaleMultiplier"
                        type="number"
                        min="1.1"
                        step="0.1"
                        value={config.martingaleMultiplier}
                        onChange={(e) => handleConfigChange('martingaleMultiplier', parseFloat(e.target.value) || 2)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxMartingaleSteps">Máximo de Passos</Label>
                      <Input
                        id="maxMartingaleSteps"
                        type="number"
                        min="1"
                        max="10"
                        value={config.maxMartingaleSteps}
                        onChange={(e) => handleConfigChange('maxMartingaleSteps', parseInt(e.target.value) || 3)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Indicadores Técnicos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Indicadores Técnicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rsiPeriod">Período RSI</Label>
                    <Input
                      id="rsiPeriod"
                      type="number"
                      min="5"
                      max="50"
                      value={config.rsiPeriod}
                      onChange={(e) => handleConfigChange('rsiPeriod', parseInt(e.target.value) || 14)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emaPeriod">Período EMA</Label>
                    <Input
                      id="emaPeriod"
                      type="number"
                      min="5"
                      max="100"
                      value={config.emaPeriod}
                      onChange={(e) => handleConfigChange('emaPeriod', parseInt(e.target.value) || 21)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveConfig} className="w-full" size="lg">
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Controle do Bot</span>
              </CardTitle>
              <CardDescription>
                Inicie ou pare o bot de trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={handleStartBot}
                    disabled={stats.isRunning || !isConfigured}
                    className="flex items-center space-x-2"
                    size="lg"
                  >
                    <Play className="h-5 w-5" />
                    <span>Iniciar Bot</span>
                  </Button>
                  
                  <Button
                    onClick={handleStopBot}
                    disabled={!stats.isRunning}
                    variant="destructive"
                    className="flex items-center space-x-2"
                    size="lg"
                  >
                    <Square className="h-5 w-5" />
                    <span>Parar Bot</span>
                  </Button>
                </div>

                {!isConfigured && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Configure e salve os parâmetros antes de iniciar o bot.
                    </AlertDescription>
                  </Alert>
                )}

                {isConfigured && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Bot configurado e pronto para operar em conta <strong>{config.accountType.toUpperCase()}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {stats.lastTrade && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Última Operação</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Horário</p>
                      <p className="font-medium">{stats.lastTrade.time}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Resultado</p>
                      <Badge variant={stats.lastTrade.result === 'win' ? 'default' : 'destructive'}>
                        {stats.lastTrade.result === 'win' ? 'GANHOU' : 'PERDEU'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-600">Valor</p>
                      <p className="font-medium">${stats.lastTrade.amount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Lucro/Prejuízo</p>
                      <p className={`font-medium ${stats.lastTrade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${stats.lastTrade.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Performance</CardTitle>
              <CardDescription>
                Acompanhe o desempenho do seu bot de trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total de Trades:</span>
                    <span className="font-bold">{stats.totalTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taxa de Acerto:</span>
                    <span className="font-bold">{stats.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Win Rate</span>
                      <span>{stats.winRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.winRate} className="h-2" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Saldo Atual:</span>
                    <span className="font-bold">${stats.balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lucro Total:</span>
                    <span className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${stats.profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>ROI:</span>
                    <span className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((stats.profit / 1000) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs do Sistema</CardTitle>
              <CardDescription>
                Acompanhe todas as atividades do bot em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Nenhum log disponível. Inicie o bot para ver as atividades.</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}