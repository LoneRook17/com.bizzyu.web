import LineSkipScanClient from "./LineSkipScanClient"

interface LineSkipScanPageProps {
  params: Promise<{ uuid: string }>
}

export default async function LineSkipScanPage({ params }: LineSkipScanPageProps) {
  const { uuid } = await params
  return <LineSkipScanClient uuid={uuid} />
}
