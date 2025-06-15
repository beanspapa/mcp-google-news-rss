let mcpServer: any = null;
let mcpConnected = false;

export function setLoggerServer(serverInstance: any) {
  mcpServer = serverInstance;
  if (mcpServer && typeof mcpServer.on === "function") {
    mcpServer.on("connect", () => {
      mcpConnected = true;
    });
    mcpServer.on("disconnect", () => {
      mcpConnected = false;
    });
  }
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function withTimestamp(message: string) {
  const ts = new Date().toISOString();
  return `[${ts}] ${message}`;
}

function canSendLog() {
  return isProduction() && mcpServer && mcpConnected;
}

export function logInfo(message: string) {
  const msg = withTimestamp(message);
  if (canSendLog()) {
    mcpServer.sendLoggingMessage({ level: "info", data: msg });
  } else {
    console.error(msg);
  }
}

export function logWarning(message: string) {
  const msg = withTimestamp(message);
  if (canSendLog()) {
    mcpServer.sendLoggingMessage({ level: "warning", data: msg });
  } else {
    console.error(msg);
  }
}

export function logError(message: string) {
  const msg = withTimestamp(message);
  if (canSendLog()) {
    mcpServer.sendLoggingMessage({ level: "error", data: msg });
  } else {
    console.error(msg);
  }
}
