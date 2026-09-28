import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

// Socket.IO runs its own CORS check, which app.enableCors() does not reach. This gives it the
// same allowlist, with credentials on so the browser sends the host cookie in the handshake.
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly frontendUrls: string[],
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // IoAdapter types its return as any; it is the Socket.IO server.
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.frontendUrls, credentials: true },
    }) as Server;
  }
}
