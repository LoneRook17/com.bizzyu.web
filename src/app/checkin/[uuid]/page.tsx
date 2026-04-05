import CheckinClient from "./CheckinClient"

interface CheckinPageProps {
  params: Promise<{ uuid: string }>
}

export default async function CheckinPage({ params }: CheckinPageProps) {
  const { uuid } = await params
  return <CheckinClient uuid={uuid} />
}
