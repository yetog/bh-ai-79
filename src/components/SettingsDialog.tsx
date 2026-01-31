import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { getApiBaseUrl, health } from "@/lib/api";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, onSaved }) => {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"unknown" | "ok" | "error">("unknown");

  useEffect(() => {
    if (open) {
      setBaseUrl(getApiBaseUrl());
      setApiKey(localStorage.getItem("BLACKHOLE_API_KEY") || "");
      setStatus("unknown");
    }
  }, [open]);

  const save = async () => {
    try {
      if (!baseUrl) {
        toast({ title: "Missing Base URL", description: "Please enter your API base URL" });
        return;
      }
      localStorage.setItem("BLACKHOLE_API_BASE_URL", baseUrl);
      if (apiKey) localStorage.setItem("BLACKHOLE_API_KEY", apiKey); else localStorage.removeItem("BLACKHOLE_API_KEY");
      toast({ title: "Saved", description: "API settings updated" });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unexpected error" });
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      await health();
      setStatus("ok");
      toast({ title: "Connected", description: "Backend is reachable" });
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Connection failed", description: e?.message || "Could not reach backend" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Configure the backend connection. These values are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">API Base URL</Label>
            <Input id="baseUrl" placeholder="http://localhost:8000" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (optional)</Label>
            <Input id="apiKey" placeholder="Your X-API-Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          {status !== "unknown" && (
            <div className={status === "ok" ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {status === "ok" ? "Connected" : "Connection failed"}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={check} disabled={checking}>
            {checking ? "Checking..." : "Test Connection"}
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
