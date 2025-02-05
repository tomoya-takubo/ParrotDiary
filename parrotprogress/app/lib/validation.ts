export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message: string;
} {
  if (password.length < 8) return {
    isValid: false,
    message: 'パスワードは8文字以上必要です'
  };

  if (!/[A-Z]/.test(password)) return {
    isValid: false,
    message: '大文字を含める必要があります'
  };

  if (!/[a-z]/.test(password)) return {
    isValid: false,
    message: '小文字を含める必要があります'
  };

  if (!/[0-9]/.test(password)) return {
    isValid: false,
    message: '数字を含める必要があります'
  };

  return { isValid: true, message: '' };
}