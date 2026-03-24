import { Bell, Plus } from "lucide-react";

const mockAlerts = [
  {
    id: "1",
    asset: "Bitcoin",
    symbol: "BTC",
    condition: "Sentiment < -0.5",
    active: true,
    lastTriggered: null,
  },
  {
    id: "2",
    asset: "Ethereum",
    symbol: "ETH",
    condition: "Price < $3,000",
    active: true,
    lastTriggered: "2024-03-14T10:00:00Z",
  },
  {
    id: "3",
    asset: "Solana",
    symbol: "SOL",
    condition: "Sentiment > 0.8",
    active: false,
    lastTriggered: "2024-03-15T08:30:00Z",
  },
];

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your price and sentiment alerts
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      <div className="space-y-3">
        {mockAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center gap-4 rounded-2xl bg-surface-light border border-black/5 p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pastel-blue">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary">
                {alert.asset} ({alert.symbol})
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {alert.condition}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                  alert.active
                    ? "bg-pastel-green text-primary"
                    : "bg-black/5 text-text-secondary"
                }`}
              >
                {alert.active ? "Active" : "Paused"}
              </span>
              {alert.lastTriggered && (
                <p className="text-[10px] text-text-secondary mt-1">
                  Last:{" "}
                  {new Date(alert.lastTriggered).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
