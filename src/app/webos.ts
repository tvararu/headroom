export type RemoteAction = "layout" | "theme" | "exit";

export function mapKey(keyCode: number): RemoteAction | null {
  if (keyCode === 13) return "layout";
  if (keyCode === 403 || keyCode === 404 || keyCode === 405 || keyCode === 406)
    return "theme";
  if (keyCode === 461 || keyCode === 27) return "exit";
  return null;
}

export function initScreenSaverBridge(clientName: string): void {
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.WebOSServiceBridge === "undefined") return;
  try {
    const Ctor = w.WebOSServiceBridge as new () => {
      onservicecallback: ((msg: string) => void) | null;
      call(uri: string, params: string): void;
    };
    const bridge = new Ctor();
    bridge.onservicecallback = (msg: string) => {
      try {
        const response = JSON.parse(msg) as {
          state?: string;
          timestamp?: number;
        };
        if (response.state === "Active") {
          bridge.call(
            "luna://com.webos.service.tvpower/power/responseScreenSaverRequest",
            JSON.stringify({
              clientName: clientName,
              ack: false,
              timestamp: response.timestamp,
            }),
          );
        }
      } catch (e) {
        console.error("ScreenSaver callback error", e);
      }
    };
    bridge.call(
      "luna://com.webos.service.tvpower/power/registerScreenSaverRequest",
      JSON.stringify({ subscribe: true, clientName: clientName }),
    );
  } catch (e) {
    console.warn("Could not initialize WebOSServiceBridge", e);
  }
}

export function loadJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => {
      if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(
            new Error(
              `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
        }
      } else {
        reject(new Error(`Failed to load ${url}: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error(`Network error loading ${url}`));
    xhr.send();
  });
}
