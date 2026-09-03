export type DoorMessage = {
  message: string;
  id: string;
  style?: any;
  fontColor?: string;
  font?: string;
  reactions?: {
    poop?: number;
    laugh?: number;
    fire?: number;
    heart?: number;
  };
};
