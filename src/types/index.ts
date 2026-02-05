// Core data structures per spec

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedStyles {
  // Layout
  display: string;
  position: string;
  width: string;
  height: string;
  margin: string;
  padding: string;
  boxSizing: string;
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color: string;
  textAlign: string;
  // Flex
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  // Background/Border
  backgroundColor: string;
  borderRadius: string;
  border: string;
}

export interface AccessibilityInfo {
  role: string | null;
  ariaLabel: string | null;
  ariaLabelledBy: string | null;
  accessibleName: string | null;
}

export interface SelectedItem {
  index: number;
  tagName: string;
  selector: string;
  id: string | null;
  classList: string[];
  attributes: Record<string, string>;
  textSnippet: string;
  rectViewport: Rect;
  rectPage: Rect;
  htmlSnippet: string;
  computedStyles: ComputedStyles;
  accessibility: AccessibilityInfo;
  isStale: boolean;
}

export interface PageContext {
  url: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  scrollX: number;
  scrollY: number;
  timestamp: string;
}

export interface ExtractedData {
  pageContext: PageContext;
  items: SelectedItem[];
}

export interface Settings {
  includeHtml: boolean;
  includeStyles: boolean;
  includeAccessibility: boolean;
  includeScreenshot: boolean;
  persistSelection: boolean;
  aibridgeUrl: string;
}

// Message types for communication between extension components

export type MessageType =
  | 'PING'
  | 'START_SELECTION'
  | 'STOP_SELECTION'
  | 'GET_SELECTION_STATE'
  | 'SELECTION_UPDATED'
  | 'EXTRACT_DATA'
  | 'CAPTURE_SCREENSHOT'
  | 'SCREENSHOT_READY'
  | 'CLEAR_SELECTION'
  | 'ANNOTATE_SCREENSHOT';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface StartSelectionMessage extends Message {
  type: 'START_SELECTION';
}

export interface StopSelectionMessage extends Message {
  type: 'STOP_SELECTION';
}

export interface GetSelectionStateMessage extends Message {
  type: 'GET_SELECTION_STATE';
}

export interface SelectionUpdatedMessage extends Message {
  type: 'SELECTION_UPDATED';
  payload: {
    count: number;
    isActive: boolean;
  };
}

export interface ExtractDataMessage extends Message {
  type: 'EXTRACT_DATA';
  payload: {
    settings: Settings;
  };
}

export interface CaptureScreenshotMessage extends Message {
  type: 'CAPTURE_SCREENSHOT';
  payload: {
    rects: Rect[];
  };
}

export interface ScreenshotReadyMessage extends Message {
  type: 'SCREENSHOT_READY';
  payload: {
    dataUrl: string;
    filename: string;
  };
}

export interface ClearSelectionMessage extends Message {
  type: 'CLEAR_SELECTION';
}

// AiBridge types

export interface AiBridgeStatus {
  connected: boolean;
  queueLength?: number;
}
