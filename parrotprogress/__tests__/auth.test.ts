import { signIn, signUp } from '../app/lib/auth';

describe('認証機能のテスト', () => {
  test('新規ユーザー登録', async () => {
    const user = await signUp('test@example.com', 'Password123');
    expect(user.email).toBe('test@example.com');
  });

  test('重複メールアドレスでの登録', async () => {
    await expect(
      signUp('test@example.com', 'Password123')
    ).rejects.toThrow('このメールアドレスは既に登録されています');
  });

  test('正常なログイン', async () => {
    const user = await signIn('test@example.com', 'Password123');
    expect(user.email).toBe('test@example.com');
  });

  test('誤認証情報でのログイン', async () => {
    await expect(
      signIn('wrong@example.com', 'WrongPass123')
    ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
  });
});