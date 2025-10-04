// Sigma IPTV API Integration
export interface SigmaConfig {
  url: string;
  username: string;
  token: string;
}

export interface SigmaUser {
  id: string;
  username: string;
  name?: string;
}

export interface SigmaPackage {
  id: string;
  name: string;
  duration: number;
  price?: number;
}

export interface SigmaCustomer {
  id?: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  note?: string;
  status: 'ACTIVE' | 'INACTIVE';
  expiryDate?: string;
}

export class SigmaAPI {
  private config: SigmaConfig;

  constructor(config: SigmaConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Try different URL formats
    const possibleUrls = [
      `${this.config.url}/api/webhook/${endpoint}`,
      `${this.config.url}/webhook/${endpoint}`,
    ];
    
    let lastError: Error | null = null;
    
    for (const url of possibleUrls) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
          },
        });

        const contentType = response.headers.get('content-type');

        if (!response.ok) {
          const errorText = await response.text();
          
          // If we get HTML, it might be the wrong endpoint
          if (contentType && contentType.includes('text/html')) {
            lastError = new Error(`Endpoint não encontrado: ${url}. Verifique se a URL do painel está correta.`);
            continue; // Try next URL
          }
          
          // Check for specific error messages
          if (errorText.includes('Invalid Token')) {
            throw new Error('Invalid Token');
          }
          
          throw new Error(`Sigma API Error: ${response.status} - ${response.statusText}`);
        }

        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          
          // If we get HTML on a successful response, wrong endpoint
          if (contentType && contentType.includes('text/html')) {
            lastError = new Error(`Endpoint não encontrado: ${url}. Verifique se a URL do painel está correta.`);
            continue; // Try next URL
          }
          
          throw new Error(`Resposta inválida do servidor. Esperado JSON, recebido: ${contentType}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse;
        
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new Error(`Erro de conexão: Não foi possível conectar ao servidor. Verifique se a URL está correta.`);
          continue;
        }
        
        lastError = error as Error;
        
        // If it's not a connection error, don't try other URLs
        if (!(error as Error).message.includes('Endpoint não encontrado')) {
          throw error;
        }
      }
    }
    
    // If we tried all URLs and failed
    throw lastError || new Error('Não foi possível conectar ao servidor Sigma');
  }

  // Test connection and get user list
  async testConnection(): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Validate URL format
      if (!this.config.url.startsWith('http://') && !this.config.url.startsWith('https://')) {
        return {
          success: false,
          error: 'URL deve começar com http:// ou https://'
        };
      }

      const users = await this.makeRequest('user');
      
      if (users && users.data && Array.isArray(users.data) && users.data.length > 0) {
        // Find user by username or get first user
        const user = users.data.find((u: any) => u.username === this.config.username) || users.data[0];
        return {
          success: true,
          userId: user.id
        };
      }
      
      return {
        success: false,
        error: 'Nenhum usuário encontrado no painel'
      };
    } catch (error) {
      let errorMessage = 'Erro desconhecido';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more user-friendly error messages
        if (errorMessage.includes('fetch') || errorMessage.includes('Erro de conexão')) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique se a URL está correta e acessível.';
        } else if (errorMessage.includes('Endpoint não encontrado')) {
          errorMessage = 'API não encontrada. Verifique se a URL do painel está correta. Exemplo: https://seupainel.top';
        } else if (errorMessage.includes('401') || errorMessage.includes('Invalid Token')) {
          errorMessage = 'Token inválido ou expirado. Verifique se o token está correto e ainda é válido.';
        } else if (errorMessage.includes('403')) {
          errorMessage = 'Acesso negado. Verifique se o token tem as permissões necessárias para acessar a API.';
        } else if (errorMessage.includes('404')) {
          errorMessage = 'Endpoint não encontrado. Verifique se a URL do painel está correta.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Erro interno do servidor Sigma. Tente novamente mais tarde.';
        } else if (errorMessage.includes('Resposta inválida')) {
          errorMessage = 'Servidor retornou resposta inválida. Verifique se a URL do painel está correta.';
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get user list
  async getUsers(): Promise<SigmaUser[]> {
    const response = await this.makeRequest('user');
    return response.data || [];
  }

  // Get packages list
  async getPackages(): Promise<SigmaPackage[]> {
    const response = await this.makeRequest('package');
    return response.data || [];
  }

  // Create customer
  async createCustomer(userId: string, packageId: string, customerData: Partial<SigmaCustomer>): Promise<SigmaCustomer> {
    const payload = {
      userId,
      packageId,
      username: customerData.username || '',
      password: customerData.password || '',
      name: customerData.name || '',
      email: customerData.email || '',
      whatsapp: customerData.whatsapp || '',
      note: customerData.note || ''
    };

    return this.makeRequest('customer/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Get customer by username
  async getCustomer(username: string): Promise<SigmaCustomer | null> {
    try {
      const response = await this.makeRequest(`customer?username=${encodeURIComponent(username)}`);
      return response || null;
    } catch (error) {
      return null;
    }
  }

  // Get customer details with expiration date
  async getCustomerDetails(username: string): Promise<any> {
    console.log('=== getCustomerDetails called ===');
    console.log('Username:', username);
    
    try {
      // Try the same endpoint structure as in the Postman collection
      const response = await this.makeRequest(`customer?username=${encodeURIComponent(username)}`);
      console.log('Customer details response:', response);
      
      // If the response has data property, return the first item
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }
      
      // If it's a direct object, return it
      if (response && typeof response === 'object') {
        return response;
      }
      
      return null;
    } catch (error) {
      console.error('getCustomerDetails error:', error);
      throw error;
    }
  }

  // Renew customer
  async renewCustomer(userId: string, username: string, packageId: string): Promise<SigmaCustomer> {
    const payload = {
      userId,
      username,
      packageId
    };

    console.log('=== Sigma renewCustomer called ===');
    console.log('Payload:', payload);

    return this.makeRequest('customer/renew', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Update customer status
  async updateCustomerStatus(userId: string, username: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    const payload = {
      userId,
      username,
      status
    };

    await this.makeRequest('customer/status', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // Delete customer
  async deleteCustomer(userId: string, username: string): Promise<void> {
    const payload = {
      userId,
      username
    };

    await this.makeRequest('customer', {
      method: 'DELETE',
      body: JSON.stringify(payload)
    });
  }
}

// Helper function to create Sigma API instance
export function createSigmaAPI(config: SigmaConfig): SigmaAPI {
  return new SigmaAPI(config);
}

// Validate Sigma configuration
export function validateSigmaConfig(config: Partial<SigmaConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.url?.trim()) {
    errors.push('URL do painel é obrigatória');
  } else if (!config.url.startsWith('http')) {
    errors.push('URL deve começar com http:// ou https://');
  }
  
  if (!config.username?.trim()) {
    errors.push('Usuário é obrigatório');
  }
  
  if (!config.token?.trim()) {
    errors.push('Token é obrigatório');
  }
  
  return errors;
}