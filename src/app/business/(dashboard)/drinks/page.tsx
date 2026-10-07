"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/business/auth-context"
import { isKnightBusiness } from "@/lib/business/knight"
import DrinkMenuEditor from "@/components/business/v2/drinks/DrinkMenuEditor"

/**
 * Knight-only Lib Menu tab. Other businesses never see the nav item; this page
 * also redirects Home if somehow reached.
 */
export default function BusinessDrinksPage() {
  const { business, isLoading } = useAuth()
  const router = useRouter()
  const knight = isKnightBusiness(business)

  useEffect(() => {
    if (!isLoading && !knight) {
      router.replace("/business")
    }
  }, [isLoading, knight, router])

  if (isLoading) return null
  if (!knight) return null

  return <DrinkMenuEditor />
}
