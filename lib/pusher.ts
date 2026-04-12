import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherInstance) {
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
      throw new Error('Missing Pusher environment variables');
    }
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherInstance;
}
