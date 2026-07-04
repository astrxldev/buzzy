// oxlint-disable react-hooks/exhaustive-deps
"use client";

// adaptation of react-document-picture-in-picture that use createPortal instead
// cuz events dont propagate into the new window

import type { ReactNode } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type DocumentPictureInPictureRef = {
  window: () => Window | undefined;
  isOpen: boolean;
  open: () => Promise<void>;
  close: () => void;
  toggle: () => Promise<void>;
};

export enum FeatureUnavailableReasonEnum {
  USING_UNSECURE_PROTOCOL = "USING_UNSECURE_PROTOCOL",
  API_NOT_SUPPORTED = "API_NOT_SUPPORTED",
}

export type DocumentPictureInPictureProps = {
  width?: number | string;
  height?: number | string;

  shareStyles?: boolean;

  children?: ReactNode;

  onOpen?: () => void;
  onClose?: () => void;
  onResize?: (width: number, height: number) => void;

  featureUnavailableRenderer?:
    | ReactNode
    | ((reason: FeatureUnavailableReasonEnum) => ReactNode);

  buttonRenderer?:
    | ReactNode
    | ((props: {
        open: () => Promise<void>;
        close: () => void;
        toggle: () => Promise<void>;
        isOpen: boolean;
      }) => ReactNode);
};

export const DocumentPictureInPicture = forwardRef<
  DocumentPictureInPictureRef,
  DocumentPictureInPictureProps
>(function DocumentPictureInPicture(props, ref) {
  const pipWindow = useRef<Window>(undefined);
  const resizeHandler = useRef<() => void>(undefined);
  const pageHideHandler = useRef<() => void>(undefined);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const absoluteDimensions = useMemo(() => {
    let width = 500;
    let height = 400;

    if (typeof props.width === "number") width = props.width;
    else if (typeof props.width === "string") {
      if (props.width.endsWith("px")) width = parseInt(props.width);
      else if (props.width.endsWith("%"))
        width = (window.innerWidth * parseInt(props.width)) / 100;
    }

    if (typeof props.height === "number") height = props.height;
    else if (typeof props.height === "string") {
      if (props.height.endsWith("px")) height = parseInt(props.height);
      else if (props.height.endsWith("%"))
        height = (window.innerHeight * parseInt(props.height)) / 100;
    }

    return { width, height };
  }, [props.width, props.height]);

  const copyStyles = useCallback((target: Document) => {
    target.title = document.title;
    target.documentElement.lang = document.documentElement.lang;
    target.documentElement.dir = document.documentElement.dir;

    for (const sheet of [...document.styleSheets]) {
      try {
        const style = document.createElement("style");

        style.textContent = [...sheet.cssRules]
          .map((r) => r.cssText)
          .join("\n");

        target.head.appendChild(style);
      } catch {
        if (!sheet.href) continue;

        const link = document.createElement("link");

        link.rel = "stylesheet";
        link.href = sheet.href;
        link.type = sheet.type;

        if (sheet.media.length > 0) {
          link.media = sheet.media.mediaText;
        }

        target.head.appendChild(link);
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (pipWindow.current) {
      if (resizeHandler.current) {
        pipWindow.current.removeEventListener("resize", resizeHandler.current);
      }

      if (pageHideHandler.current) {
        pipWindow.current.removeEventListener(
          "pagehide",
          pageHideHandler.current,
        );
      }
    }

    setContainer(null);
    pipWindow.current = undefined;
    setIsOpen(false);
  }, []);

  const close = useCallback(() => {
    const win = pipWindow.current;

    if (!win) return;

    cleanup();

    win.close();

    props.onClose?.();
  }, [cleanup, props.onClose]);

  const open = useCallback(async () => {
    if (pipWindow.current) return;

    const win =
      await window.documentPictureInPicture.requestWindow(absoluteDimensions);

    pipWindow.current = win;

    if (props.shareStyles) {
      copyStyles(win.document);
    }

    win.document.body.style.margin = "0";

    const div = win.document.createElement("div");

    div.style.width = "100%";
    div.style.height = "100%";
    div.style.background = "black";
    div.style.backgroundImage = "radial-gradient(#222 1px, transparent 1px)";
    div.style.backgroundSize = "24px 24px";
    div.style.height = "100svh";
    div.style.display = "flex";
    div.style.justifyContent = "center";
    div.style.alignItems = "center";

    win.document.body.appendChild(div);

    resizeHandler.current = () => {
      props.onResize?.(win.innerWidth, win.innerHeight);
    };

    pageHideHandler.current = () => {
      cleanup();
      props.onClose?.();
    };

    win.addEventListener("resize", resizeHandler.current);
    win.addEventListener("pagehide", pageHideHandler.current);

    setContainer(div);
    setIsOpen(true);

    props.onOpen?.();
  }, [
    absoluteDimensions,
    cleanup,
    copyStyles,
    props.onOpen,
    props.onClose,
    props.onResize,
    props.shareStyles,
  ]);

  const toggle = useCallback(async () => {
    if (isOpen) close();
    else await open();
  }, [isOpen, open, close]);

  useImperativeHandle(
    ref,
    () => ({
      window: () => pipWindow.current,
      isOpen,
      open,
      close,
      toggle,
    }),
    [isOpen, open, close, toggle],
  );

  useEffect(() => close, []);

  const unavailable = (() => {
    if (!window.isSecureContext)
      return FeatureUnavailableReasonEnum.USING_UNSECURE_PROTOCOL;

    if (!("documentPictureInPicture" in window))
      return FeatureUnavailableReasonEnum.API_NOT_SUPPORTED;

    return null;
  })();

  if (unavailable) {
    if (!props.featureUnavailableRenderer) return null;

    return typeof props.featureUnavailableRenderer === "function"
      ? props.featureUnavailableRenderer(unavailable)
      : props.featureUnavailableRenderer;
  }

  return (
    <>
      {typeof props.buttonRenderer === "function"
        ? props.buttonRenderer({
            open,
            close,
            toggle,
            isOpen,
          })
        : props.buttonRenderer}

      {container && createPortal(props.children, container)}
    </>
  );
});
