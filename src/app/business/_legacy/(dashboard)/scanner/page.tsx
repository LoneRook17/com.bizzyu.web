import ScannerClient from "./ScannerClient"

export const metadata = {
  title: "Scanner — Bizzy Business",
  description: "Batch QR scanner for event check-ins",
}

export default function ScannerPage() {
  return <ScannerClient />
}
