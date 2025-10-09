"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SigmaTest() {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('Fazendo requisição para:', '/api/sigma/test-connection');
      console.log('Dados:', { url, username, token });
      
      const response = await fetch('/api/sigma/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sigmaConfig: { url, username, token }
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      setResult(data);
    } catch (error) {
      console.error('Erro na requisição:', error);
      setResult({ success: false, error: `Erro na requisição: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Teste Sigma IPTV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seupainel.top"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Usuário</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Token</Label>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token"
          />
        </div>
        
        <Button 
          onClick={testConnection} 
          disabled={loading || !url || !username || !token}
          className="w-full"
        >
          {loading ? 'Testando...' : 'Testar Conexão'}
        </Button>
        
        {result && (
          <div className={`p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}