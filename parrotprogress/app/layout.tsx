import { Metadata } from "next"
import { AuthProvider } from '@/lib/AuthContext';
import "./globals.css"
import { RewardProvider, useReward } from '@/lib/RewardContext';
import RewardNotification from "@/components/dashboard/Diary/RewardNotification";

export const metadata: Metadata = {
  title: "ぱろっとだいありー",
  description: "PartyParrotと一緒に楽しく継続！",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <RewardProvider> {/* ← これで囲まれている必要あり */}
            {children}
            <RewardNotification /> {/* これが RewardContext を使って通知表示 */}
          </RewardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}