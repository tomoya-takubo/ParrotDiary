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

export function validateEmailFormat(email: string): {
  isValid: boolean;
  message: string;
} {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  
  if (!email) return {
    isValid: false,
    message: 'メールアドレスを入力してください'
  };

  if (!emailRegex.test(email)) return {
    isValid: false,
    message: 'メールアドレスの形式が正しくありません'
  };

  if (email.length > 254) return {
    isValid: false,
    message: 'メールアドレスが長すぎます'
  };

  const [localPart] = email.split('@');
  if (localPart.length > 64) return {
    isValid: false,
    message: 'メールアドレスのローカル部が長すぎます'
  };

  return { isValid: true, message: '' };
}