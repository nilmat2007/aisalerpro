import FacebookBroadcastClient from './FacebookBroadcastClient'

export default function FacebookBroadcastPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📢 Facebook Broadcast</h1>
          <p className="text-slate-400 text-sm mt-1">บรอดแคสต์ข้อความถึงลูกค้าทาง Facebook Messenger</p>
        </div>
      </div>
      <FacebookBroadcastClient />
    </div>
  )
}
