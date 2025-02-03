import { useState, useEffect } from 'react';

type AuthState = {
  isLoggedIn: boolean;
  email: string | null;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    email: null
  });

  useEffect(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      setAuthState(JSON.parse(savedAuth));
    }
  }, []);

  const login = (email: string) => {
    const newState = { isLoggedIn: true, email };
    localStorage.setItem('auth', JSON.stringify(newState));
    setAuthState(newState);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAuthState({ isLoggedIn: false, email: null });
  };

  return { ...authState, login, logout };
};