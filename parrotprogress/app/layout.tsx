import { Metadata } from "next"
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
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}