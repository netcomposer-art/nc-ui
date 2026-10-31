export declare const HELP_ATTR: "data-nc-help";
export declare const HELP_DELAY: number;
export interface HelpRect { top: number; bottom: number; left: number }
export declare function placeHelp(
  anchor: HelpRect,
  tip: { width: number; height: number },
  viewportWidth: number,
  bandTop?: number,
  gap?: number,
  edge?: number,
): { top: number; left: number; side: "above" | "below" };
export interface HelpTips {
  /** Hide the bubble now. */
  hide(): void;
  /** Remove the listeners and the bubble. */
  uninstall(): void;
}
/** Hover help for every [data-nc-help] element on the page. Idempotent per document. */
export declare function installHelpTips(opts?: { document?: Document; delay?: number }): HelpTips;
