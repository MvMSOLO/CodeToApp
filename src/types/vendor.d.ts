declare module "qrcode" {
  export function toDataURL(
    text: string,
    opts?: {
      margin?: number;
      width?: number;
      color?: { dark?: string; light?: string };
    },
  ): Promise<string>;
}

declare module "lottie-web" {
  interface AnimationItem {
    destroy(): void;
  }
  interface LottiePlayer {
    loadAnimation(opts: {
      container: Element;
      renderer: "svg" | "canvas" | "html";
      loop?: boolean;
      autoplay?: boolean;
      animationData?: object;
    }): AnimationItem;
  }
  const lottie: LottiePlayer;
  export default lottie;
}

declare module "lottie-web/build/player/lottie_light" {
  import lottie from "lottie-web";
  export default lottie;
}
