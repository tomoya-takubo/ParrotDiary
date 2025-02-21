import { User } from "@/app/types/auth";

let users: User[] = [];  // 開発用の仮のデータストア

export async function signUp(email: string, password: string): Promise<User> {
  if (users.find(u => u.email === email)) {
    throw new Error('このメールアドレスは既に登録されています');
  }
  
  const newUser = { email, password };
  users.push(newUser);
  return newUser;
}

export async function signIn(email: string, password: string): Promise<User> {
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }
  return user;
}
