"use client";

import { SocketEventsEnum } from "@/enum/socket-events.enum";
import { refreshAccessToken } from "@/lib/authRefresh";
import { emitAuthLogout, getAccessToken } from "@/lib/authTokenStore";
import { io, Socket } from "socket.io-client";

type SocketTransport = "polling" | "websocket";

type SocketRuntimeConfig = {
  baseUrl: string;
  transports: SocketTransport[];
  addTrailingSlash: boolean;
};

const DEFAULT_LOCAL_SOCKET_URL = "http://localhost:3001";
const SOCKET_PATH = "/socket.io";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || "";
const isProductionBuild = process.env.NODE_ENV === "production";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getSocketRuntimeConfig = (): SocketRuntimeConfig => {
  // Explicit socket URL (e.g. a real backend host with TLS) -> connect directly, allow upgrade.
  if (SOCKET_URL) {
    return {
      baseUrl: trimTrailingSlash(SOCKET_URL),
      transports: ["websocket", "polling"],
      addTrailingSlash: true,
    };
  }

  // Local dev fallback uses polling to avoid noisy browser-level WebSocket upgrade
  // failures when the local backend or proxy rejects `ws://localhost:3001`.
  if (!isProductionBuild) {
    return {
      baseUrl: DEFAULT_LOCAL_SOCKET_URL,
      transports: ["polling"],
      addTrailingSlash: true,
    };
  }

  // Vercel prod with no explicit socket URL: connect to same origin via `/socket.io`
  // and use polling only, so the Vercel rewrite can proxy it to the backend
  // (Vercel cannot proxy the WebSocket upgrade). Empty baseUrl -> io(options).
  return {
    baseUrl: "",
    transports: ["polling"],
    addTrailingSlash: false,
  };
};

const SOCKET_RUNTIME_CONFIG = getSocketRuntimeConfig();

const SOCKET_NAMESPACES = {
  AUTH: "/auth",
  NOTIFICATION: "/notification",
  CHAT: "/chat",
  PATIENT_PROFILE: "/patient-profile",
  APPOINTMENT: "/appointment",
  APPOINTMENT_FIELDS_DATA: "/appointment/fields-data",
  PAYMENT_VNPAY: "/payment/vnpay",
} as const;

type SocketNamespace = (typeof SOCKET_NAMESPACES)[keyof typeof SOCKET_NAMESPACES];

class SocketClient {
  private socket: Socket;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatMs = 25_000;
  private onTokenRefreshed?: () => void;
  private onAuthLogout?: () => void;
  private isHandlingConnectError = false;

  constructor(
    private readonly baseUrl: string,
    private readonly namespace?: SocketNamespace
  ) {
    this.socket = this.createSocket();
    this.bindAuthLifecycle();
  }

  private bindAuthLifecycle() {
    if (typeof window === "undefined") {
      return;
    }

    this.onTokenRefreshed = () => {
      const token = this.getAccessToken();
      if (!token) {
        return;
      }
      this.updateAuthToken(token);
    };

    this.onAuthLogout = () => {
      this.disconnect();
    };

    window.addEventListener("token-refreshed", this.onTokenRefreshed);
    window.addEventListener("auth-logout", this.onAuthLogout);
  }

  private createSocket(): Socket {
    const url = this.namespace ? `${this.baseUrl}${this.namespace}` : this.baseUrl;
    const options = {
      path: SOCKET_PATH,
      // Local/direct Socket.IO servers in this project expect `/socket.io/`,
      // while the Vercel rewrite path must stay `/socket.io` to avoid redirects.
      // the no-slash form matches the rewrite directly — no redirect, no 404.
      addTrailingSlash: SOCKET_RUNTIME_CONFIG.addTrailingSlash,
      transports: SOCKET_RUNTIME_CONFIG.transports,
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: {
        token: "",
      },
      autoConnect: false,
    };

    // Empty baseUrl (Vercel prod) -> io(options) connects to the current origin so the
    // `/socket.io` rewrite proxies polling to the backend, instead of io("/patient-profile")
    // resolving to the FE origin as a namespace.
    const socket = url ? io(url, options) : io(options);

    socket.on("connect", () => {
      this.startHeartbeat();
      console.log(`[Socket Connected] Namespace: ${this.namespace || "/"}, ID: ${socket.id}`);
    });

    socket.on("connect_error", (err) => {
      console.warn(`[Socket] Connect error (${this.namespace || "/"}):`, err.message);
      void this.handleConnectError(err);
    });

    socket.on("disconnect", (reason) => {
      this.stopHeartbeat();
      console.log(`[Socket] Disconnected (${this.namespace || "/"}):`, reason);
    });

    return socket;
  }

  private getAccessToken() {
    return getAccessToken();
  }

  private isUnauthorizedConnectError(error: Error) {
    const message = (error.message || "").toLowerCase();
    return (
      message.includes("unauthorized") ||
      message.includes("jwt") ||
      message.includes("token") ||
      message.includes("forbidden")
    );
  }

  private async handleConnectError(error: Error) {
    if (!this.isUnauthorizedConnectError(error)) {
      return;
    }

    if (this.isHandlingConnectError) {
      console.warn(`[Socket] Refresh already in progress (${this.namespace || "/"})`);
      return;
    }

    this.isHandlingConnectError = true;

    try {
      console.warn(`[Socket] Unauthorized connect_error -> refreshing token (${this.namespace || "/"})`);
      const newToken = await refreshAccessToken();
      this.updateAuthToken(newToken);
    } catch (refreshError) {
      console.error(`[Socket] Refresh failed after connect_error (${this.namespace || "/"})`, refreshError);
      this.disconnect();
      emitAuthLogout();
    } finally {
      this.isHandlingConnectError = false;
    }
  }

  private setAuthToken(token: string) {
    this.socket.auth = {
      ...(typeof this.socket.auth === "object" && this.socket.auth ? this.socket.auth : {}),
      token,
    };
  }

  private ensureAuthToken() {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    this.setAuthToken(token);
    return true;
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket.connected) {
        this.socket.emit(SocketEventsEnum.HEARTBEAT);
      }
    }, this.heartbeatMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async waitForConnect(): Promise<boolean> {
    if (this.socket.connected) {
      return true;
    }

    if (!this.ensureAuthToken()) {
      console.warn(`[Socket] Cannot connect (${this.namespace || "/"}): missing access token`);
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      const cleanup = () => {
        this.socket.off("connect", handleConnect);
        this.socket.off("connect_error", handleError);
      };

      const handleConnect = () => {
        cleanup();
        resolve(true);
      };

      const handleError = (error: Error) => {
        cleanup();
        console.warn(`[Socket] Connect error (${this.namespace || "/"}):`, error.message);
        resolve(false);
      };

      this.socket.once("connect", handleConnect);
      this.socket.once("connect_error", handleError);
      this.socket.connect();
    });
  }

  public connect() {
    if (this.socket.connected) {
      return true;
    }

    if (!this.ensureAuthToken()) {
      console.warn(`[Socket] Connect skipped (${this.namespace || "/"}): missing access token`);
      return false;
    }

    this.socket.connect();
    return true;
  }

  public reconnect() {
    if (!this.ensureAuthToken()) {
      console.warn(`[Socket] Reconnect skipped (${this.namespace || "/"}): missing access token`);
      return;
    }

    if (this.socket.connected) {
      this.socket.disconnect();
    }

    this.socket.connect();
  }

  public updateAuthToken(newToken: string) {
    this.setAuthToken(newToken);

    if (this.socket.connected) {
      this.socket.disconnect();
    }

    this.socket.connect();
  }

  public disconnect() {
    this.stopHeartbeat();
    this.socket.disconnect();
  }

  public destroy() {
    this.disconnect();

    if (typeof window !== "undefined") {
      if (this.onTokenRefreshed) {
        window.removeEventListener("token-refreshed", this.onTokenRefreshed);
      }
      if (this.onAuthLogout) {
        window.removeEventListener("auth-logout", this.onAuthLogout);
      }
    }
  }

  emit<T>(event: SocketEventsEnum, data?: T) {
    if (typeof data === "undefined") {
      this.socket.emit(event);
      return;
    }

    this.socket.emit(event, data);
  }

  async emitSafe<T>(event: SocketEventsEnum, data?: T) {
    const connected = await this.waitForConnect();
    if (!connected) {
      return false;
    }

    this.emit(event, data);
    return true;
  }

  on<T>(event: SocketEventsEnum, callback: (data: T) => void) {
    this.socket.on(event, callback);
  }

  once<T>(event: SocketEventsEnum, callback: (data: T) => void) {
    this.socket.once(event, callback);
  }

  off(event: SocketEventsEnum, callback?: (...args: unknown[]) => void) {
    this.socket.off(event, callback);
  }

  onConnect(cb: () => void) {
    this.socket.on("connect", cb);
  }

  offConnect(cb: () => void) {
    this.socket.off("connect", cb);
  }

  onDisconnect(cb: (reason: Socket.DisconnectReason) => void) {
    this.socket.on("disconnect", cb);
  }

  offDisconnect(cb: (reason: Socket.DisconnectReason) => void) {
    this.socket.off("disconnect", cb);
  }

  isConnected() {
    return this.socket.connected;
  }

  async joinRoom() {
    return await this.emitSafe(SocketEventsEnum.JOIN_ROOM);
  }

  async joinUser() {
    return await this.emitSafe(SocketEventsEnum.CHAT_JOIN_USER);
  }

  async leaveUser() {
    return await this.emitSafe(SocketEventsEnum.CHAT_LEAVE_USER);
  }

  async joinConversation(conversationId: string) {
    return await this.emitSafe(SocketEventsEnum.CHAT_JOIN_CONVERSATION, { conversationId });
  }

  async leaveConversation(conversationId: string) {
    return await this.emitSafe(SocketEventsEnum.CHAT_LEAVE_CONVERSATION, { conversationId });
  }
}

const socketRegistry = new Map<string, SocketClient>();

const getSocketService = (namespace?: SocketNamespace) => {
  const key = namespace || "/";
  const cached = socketRegistry.get(key);
  if (cached) {
    return cached;
  }

  const service = new SocketClient(SOCKET_RUNTIME_CONFIG.baseUrl, namespace);
  socketRegistry.set(key, service);
  return service;
};

export const socketService = getSocketService();
export const authSocket = getSocketService(SOCKET_NAMESPACES.AUTH);
export const createNotificationSocket = () => getSocketService(SOCKET_NAMESPACES.NOTIFICATION);
export const createNotiSocket = () => createNotificationSocket();
export const createChatSocket = () => getSocketService(SOCKET_NAMESPACES.CHAT);
export const createPatientProfileSocket = () => getSocketService(SOCKET_NAMESPACES.PATIENT_PROFILE);
export const createAppointmentSocket = () => getSocketService(SOCKET_NAMESPACES.APPOINTMENT);
export const createFetchDataFieldsAppointmentSocket = () =>
  getSocketService(SOCKET_NAMESPACES.APPOINTMENT_FIELDS_DATA);
export const createShiftSocket = () => getSocketService(SOCKET_NAMESPACES.APPOINTMENT);
export const createPaymentVnPaySocket = () => getSocketService(SOCKET_NAMESPACES.PAYMENT_VNPAY);
