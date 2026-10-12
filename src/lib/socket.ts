import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api.ts';

let socket: Socket | null = null;
let currentUserId: string | null = null;
const activeProjectRooms = new Set<string>();

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '0.0.0.0');

/**
 * Returns the sanitized target Socket.IO URL.
 * - In Development (localhost): Empty string to leverage Vite proxy
 * - In Production: VITE_API_URL or API_BASE_URL (with trailing / and /api stripped), or window.location.origin
 */
export function getSocketUrl(): string {
  if (isLocalhost) return '';

  const rawEnv = (((import.meta as any).env?.VITE_API_URL || '') as string).trim();
  const cleanedEnv = rawEnv.replace(/\/api\/?$/, '').replace(/\/$/, '');
  if (cleanedEnv) return cleanedEnv;

  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

/**
 * Returns the singleton Socket.IO client instance.
 * Configured with HTTP polling transport to guarantee zero 400 handshake errors across serverless and standard hosting.
 */
export function getSocket(userId?: string): Socket {
  const socketUrl = getSocketUrl();

  if (userId) {
    currentUserId = userId;
  }

  if (!socket) {
    console.log('[Socket] Initializing Socket.IO client (polling transport) pointing to:', socketUrl || '(same origin / local proxy)');
    socket = io(socketUrl, {
      auth: { userId: currentUserId || undefined },
      query: currentUserId ? { userId: currentUserId } : undefined,
      transports: ['polling'],
      upgrade: false, // Prevent attempted WebSocket upgrades on environments that block WebSockets (like Vercel Serverless)
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server, id:', socket?.id);
      if (currentUserId) {
        socket?.emit('authenticate', { userId: currentUserId }, (res: any) => {
          console.log('[Socket] Auth on connect response:', res);
        });
      }
      // Re-join all active project rooms upon initial connect or reconnection
      activeProjectRooms.forEach((projectId) => {
        console.log('[Socket] Re-joining project room on connect:', projectId);
        socket?.emit('join:project', { projectId, userId: currentUserId }, (res: any) => {
          console.log('[Socket] Room join response for', projectId, ':', res);
        });
      });
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });
  } else if (userId && (socket.auth as any)?.userId !== userId) {
    currentUserId = userId;
    socket.auth = { userId };
    if (socket.connected) {
      socket.emit('authenticate', { userId }, (res: any) => {
        console.log('[Socket] Dynamic auth response:', res);
      });
      activeProjectRooms.forEach((projectId) => {
        socket?.emit('join:project', { projectId, userId });
      });
    } else {
      socket.connect();
    }
  }

  return socket;
}

/**
 * Joins a project room and tracks it so it is automatically re-joined on reconnects.
 */
export function joinProjectRoom(projectId: string, userId?: string, callback?: (res: any) => void) {
  if (!projectId) return;
  activeProjectRooms.add(projectId);
  if (userId) currentUserId = userId;
  const s = getSocket(userId || currentUserId || undefined);
  console.log('[Socket] Emitting join:project for room:', projectId, 'user:', userId || currentUserId);
  s.emit('join:project', { projectId, userId: userId || currentUserId }, (res: any) => {
    console.log('[Socket] join:project response:', res);
    if (callback) callback(res);
  });
}

/**
 * Leaves a project room and untracks it.
 */
export function leaveProjectRoom(projectId: string) {
  if (!projectId) return;
  activeProjectRooms.delete(projectId);
  if (socket) {
    socket.emit('leave:project', { projectId });
  }
}


