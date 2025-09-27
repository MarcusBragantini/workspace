import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BotInterface from '@/components/BotInterface';
import { 
  Bot, 
  Key, 
  Calendar, 
  Monitor, 
  LogOut, 
  Shield, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface License {
  id: number;
  license_key: string;
  license_type: string;
  expires_at: string;
  days_remaining: number;
  active_devices: number;
  max_devices: number;
  created_at: string;
}

export default function Dashboard() {
  const { user, licenses, logout, validateLicense } = useAuth();
  const { toast } = useToast();
  const [licenseKey, setLicenseKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedLicense, setValidatedLicense] = useState<string | null>(null);

  const handleValidateLicense = async () => {
    if (!licenseKey.trim()) {
      toast({
        title: "Licença obrigatória",
        description: "Digite uma chave de licença para validar",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateLicense(licenseKey);
      if (isValid) {
        setValidatedLicense(licenseKey);
        toast({
          title: "Licença válida!",
          description: "Acesso liberado ao sistema de trading",
        });
      } else {
        toast({
          title: "Licença inválida",
          description: "Verifique a chave e tente novamente",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar a licença",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getLicenseStatusColor = (license: License) => {
    if (license.days_remaining <= 0) return 'destructive';
    if (license.days_remaining <= 7) return 'secondary';
    return 'default';
  };

  const getLicenseStatusIcon = (license: License) => {
    if (license.days_remaining <= 0) return <XCircle className="h-4 w-4" />;
    if (license.days_remaining <= 7) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (!validatedLicense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Bot MVB Pro</h1>
                  <p className="text-sm text-gray-500">Sistema SaaS de Trading</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-8">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Validação de Licença</h2>
            <p className="text-gray-600">Digite sua chave de licença para acessar o sistema de trading</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* License Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Inserir Licença
                </CardTitle>
                <CardDescription>
                  Digite sua chave de licença para liberar o acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="license">Chave de Licença</Label>
                  <Input
                    id="license"
                    placeholder="Ex: STANDARD-MVB-XXXXXXXXXXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                </div>
                <Button 
                  onClick={handleValidateLicense} 
                  className="w-full"
                  disabled={isValidating}
                >
                  {isValidating ? 'Validando...' : 'Validar Licença'}
                </Button>
              </CardContent>
            </Card>

            {/* User Licenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Suas Licenças
                </CardTitle>
                <CardDescription>
                  Licenças ativas em sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {licenses.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma licença encontrada</p>
                    <p className="text-sm">Entre em contato para adquirir uma licença</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {licenses.map((license) => (
                      <div key={license.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={getLicenseStatusColor(license)} className="flex items-center gap-1">
                            {getLicenseStatusIcon(license)}
                            {license.license_type.toUpperCase()}
                          </Badge>
                          <div className="text-sm text-gray-500">
                            {license.days_remaining > 0 ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {license.days_remaining} dias
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">Expirada</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-mono text-gray-600 mb-2">
                          {license.license_key}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            {license.active_devices}/{license.max_devices} dispositivos
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Help Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Como usar o sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Key className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Validar Licença</h3>
                  <p className="text-sm text-gray-600">Digite sua chave de licença para liberar o acesso ao sistema</p>
                </div>
                <div className="text-center">
                  <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Configurar Bot</h3>
                  <p className="text-sm text-gray-600">Configure seu token da Deriv e parâmetros de trading</p>
                </div>
                <div className="text-center">
                  <div className="p-3 bg-purple-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Iniciar Trading</h3>
                  <p className="text-sm text-gray-600">Inicie o bot e acompanhe os resultados em tempo real</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bot MVB Pro</h1>
                <p className="text-sm text-gray-500">Sistema Ativo</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Licença Válida
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Licença <strong>{validatedLicense}</strong> validada com sucesso. Sistema liberado para uso.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs defaultValue="bot" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bot">Bot Trading</TabsTrigger>
            <TabsTrigger value="licenses">Minhas Licenças</TabsTrigger>
          </TabsList>

          <TabsContent value="bot">
            <BotInterface />
          </TabsContent>

          <TabsContent value="licenses">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Licenças</CardTitle>
                  <CardDescription>
                    Visualize e gerencie suas licenças ativas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {licenses.map((license) => (
                      <div key={license.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={getLicenseStatusColor(license)} className="flex items-center gap-1">
                              {getLicenseStatusIcon(license)}
                              {license.license_type.toUpperCase()}
                            </Badge>
                            <span className="font-mono text-sm text-gray-600">
                              {license.license_key}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {license.days_remaining > 0 ? (
                                <span className="text-green-600">
                                  {license.days_remaining} dias restantes
                                </span>
                              ) : (
                                <span className="text-red-600">Expirada</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Expira em {new Date(license.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Monitor className="h-4 w-4" />
                            {license.active_devices}/{license.max_devices} dispositivos ativos
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Criada em {new Date(license.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}