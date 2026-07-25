export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  isConfigured: boolean;
}

export interface InstanceConnectionState {
  state: 'open' | 'close' | 'connecting' | 'unknown';
  ownerJid?: string;
  profileName?: string;
  profilePictureUrl?: string;
  error?: string;
}

export interface QrCodeResponse {
  base64?: string;
  code?: string;
  pairingCode?: string;
  state?: string;
  error?: string;
}

export function getEvolutionConfig(): EvolutionConfig {
  const apiUrl = (import.meta.env.VITE_EVOLUTION_API_URL || '').replace(/\/$/, '');
  const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
  const instanceName = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || '';

  return {
    apiUrl,
    apiKey,
    instanceName,
    isConfigured: Boolean(apiUrl && apiKey && instanceName),
  };
}

export async function fetchInstanceStatus(): Promise<InstanceConnectionState> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return {
      state: 'unknown',
      error: 'Variáveis de ambiente VITE_EVOLUTION_* não configuradas na Vercel.',
    };
  }

  try {
    const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { state: 'close', error: 'Instância não encontrada na Evolution API.' };
      }
      return { state: 'unknown', error: `Erro HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    
    // Suporte para formatos Evolution API v1 e v2
    const instanceState = data.instance?.state || data.state || 'close';
    const ownerJid = data.instance?.ownerJid || data.ownerJid;
    const profileName = data.instance?.profileName || data.profileName;
    const profilePictureUrl = data.instance?.profilePictureUrl || data.profilePictureUrl;

    return {
      state: instanceState === 'open' ? 'open' : instanceState === 'connecting' ? 'connecting' : 'close',
      ownerJid,
      profileName,
      profilePictureUrl,
    };
  } catch (err: any) {
    return {
      state: 'unknown',
      error: err.message || 'Falha ao conectar com o servidor da Evolution API.',
    };
  }
}

export async function fetchQrCode(): Promise<QrCodeResponse> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { error: 'Variáveis da Evolution API não encontradas.' };
  }

  try {
    const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      return { error: `Erro HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();

    // Evolution API pode retornar base64 diretamente, dentro de qrcode.base64, ou em data.base64
    const base64 = data.base64 || data.qrcode?.base64 || data.code;
    const pairingCode = data.pairingCode || data.qrcode?.pairingCode;

    if (data.instance?.state === 'open' || data.state === 'open') {
      return { state: 'open' };
    }

    return {
      base64,
      pairingCode,
      code: data.code,
      state: data.state || 'close',
    };
  } catch (err: any) {
    return { error: err.message || 'Erro ao obter QR Code da Evolution API.' };
  }
}

export async function logoutInstance(): Promise<{ success: boolean; error?: string }> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { success: false, error: 'Variáveis da Evolution API não foram configuradas.' };
  }

  try {
    const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      return { success: false, error: `Erro ao desconectar (${response.status})` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede ao solicitar logout.' };
  }
}
