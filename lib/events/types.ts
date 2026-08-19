export type BaseEvent = {
  id: string;
  timestamp: number;
  status: "pending" | "complete" | "error";
  duration?: number;
  sessionId: string;
};

export type ScreenshotEvent = BaseEvent & {
  type: "screenshot";
  payload: {
    toolCallId: string;
    coordinate?: [number, number];
    imageData?: string;
  };
};

export type ClickEvent = BaseEvent & {
  type: "left_click" | "right_click" | "double_click";
  payload: {
    toolCallId: string;
    coordinate: [number, number];
  };
};

export type MouseMoveEvent = BaseEvent & {
  type: "mouse_move";
  payload: {
    toolCallId: string;
    coordinate: [number, number];
  };
};

export type TypeEvent = BaseEvent & {
  type: "type";
  payload: {
    toolCallId: string;
    text: string;
  };
};

export type KeyEvent = BaseEvent & {
  type: "key";
  payload: {
    toolCallId: string;
    key: string;
  };
};

export type ScrollEvent = BaseEvent & {
  type: "scroll";
  payload: {
    toolCallId: string;
    direction: "up" | "down";
    amount: number;
  };
};

export type WaitEvent = BaseEvent & {
  type: "wait";
  payload: {
    toolCallId: string;
    duration: number;
  };
};

export type BashEvent = BaseEvent & {
  type: "bash";
  payload: {
    toolCallId: string;
    command: string;
    output?: string;
  };
};

// Browser-agent action (navigate / click / type / read / screenshot / goBack).
export type BrowserAction =
  | "navigate"
  | "click"
  | "type"
  | "read"
  | "screenshot"
  | "goBack";

export type BrowserEvent = BaseEvent & {
  type: "browser";
  payload: {
    toolCallId: string;
    action: BrowserAction;
    /** Short human-readable summary of the action (e.g. the URL or clicked text). */
    summary: string;
    /** Screenshot (base64 PNG, no data: prefix) for screenshot actions. */
    imageData?: string;
    /** Extracted / result text for read/navigate actions. */
    output?: string;
  };
};

export type AgentEvent =
  | ScreenshotEvent
  | ClickEvent
  | MouseMoveEvent
  | TypeEvent
  | KeyEvent
  | ScrollEvent
  | WaitEvent
  | BashEvent
  | BrowserEvent;

export type EventCounts = Record<string, number>;

export type AgentStatus = "idle" | "thinking" | "executing";

