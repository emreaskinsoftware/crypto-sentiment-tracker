import { User, Bell, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your account preferences
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              defaultValue="Emre Askin"
              className="w-full rounded-xl border-none bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Email
            </label>
            <input
              type="email"
              defaultValue="emre@example.com"
              className="w-full rounded-xl border-none bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Bell className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold text-text-primary">
            Notifications
          </h2>
        </div>
        <div className="space-y-4">
          {[
            {
              label: "Email Notifications",
              desc: "Receive alerts via email",
              defaultChecked: true,
            },
            {
              label: "Push Notifications",
              desc: "Browser push alerts",
              defaultChecked: false,
            },
            {
              label: "Sentiment Alerts",
              desc: "When sentiment drops below threshold",
              defaultChecked: true,
            },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between p-4 rounded-xl bg-bg-light cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {item.label}
                </p>
                <p className="text-xs text-text-secondary">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={item.defaultChecked}
                className="h-5 w-5 rounded border-text-secondary/30 text-primary focus:ring-primary"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="h-5 w-5 text-yellow-600" />
          <h2 className="text-lg font-bold text-text-primary">Security</h2>
        </div>
        <button className="w-full rounded-xl bg-bg-light py-3 px-4 text-sm font-medium text-text-primary hover:bg-black/5 transition-colors text-left">
          Change Password
        </button>
      </div>

      {/* Save Button */}
      <button className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
        Save Changes
      </button>
    </div>
  );
}
