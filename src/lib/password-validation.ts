// Password validation for Sigma IPTV integration
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateSigmaPassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length (8 characters)
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('1 letra maiúscula');
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    errors.push('1 número');
  }

  // Check for at least one special character
  if (!/[@!$%#&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('1 caractere especial (@!$%# etc.)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getPasswordStrengthMessage(password: string): { 
  strength: 'weak' | 'medium' | 'strong'; 
  message: string;
  color: string;
} {
  const validation = validateSigmaPassword(password);
  
  if (validation.isValid) {
    return {
      strength: 'strong',
      message: '✅ Senha forte - adequada para o Sigma IPTV',
      color: 'text-green-600'
    };
  }
  
  if (password.length === 0) {
    return {
      strength: 'weak',
      message: 'Digite uma senha',
      color: 'text-gray-500'
    };
  }
  
  return {
    strength: 'weak',
    message: `❌ Senha fraca. Faltam: ${validation.errors.join(', ')}`,
    color: 'text-red-600'
  };
}