import { Metadata } from "next"
import { AuthProvider } from '@/lib/AuthContext';
import "./globals.css"

export const metadata: Metadata = {
  title: "ぱろっとぷろぐれす",
  description: "PartyParrotと一緒に楽しく継続！",
}

export default function RootLayout({
  children,
}:{
  children: React.ReactNode
}){
  return (
    <AuthProvider>
      <html lang="ja">
        <body>{children}</body>
      </html>
    </AuthProvider>
  )
}