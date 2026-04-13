import LineSkipSuccessClient from "./LineSkipSuccessClient"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}

export default async function LineSkipSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { session_id } = await searchParams

  if (!session_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-white/60">Invalid session. Please try again.</p>
      </div>
    )
  }

  return <LineSkipSuccessClient slugId={slug} sessionId={session_id} />
}
