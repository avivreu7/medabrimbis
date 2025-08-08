'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PendingApprovalPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-100 bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-[#1877F2] mb-4">💬 הבקשה נשלחה</h1>
        <p className="text-gray-700 mb-6 text-sm leading-relaxed">
          בקשת ההצטרפות שלך התקבלה ונשלחה לאישור מנהלת הקהילה.<br />
          לאחר שתאושר – תוכל להיכנס למערכת.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 text-[#1877F2] hover:underline font-medium text-sm"
        >
          חזרה לדף הבית
        </button>
      </div>
    </div>
  )
}
