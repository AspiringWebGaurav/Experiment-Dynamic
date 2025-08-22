declare module 'y-webrtc' {
  export class WebrtcProvider {
    constructor(roomName: string, doc: any, opts?: any);
    awareness: any;
    destroy(): void;
  }
}
