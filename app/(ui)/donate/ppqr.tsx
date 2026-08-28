"use client";
import PromptpayImage from "#/assets/promptpay.jpg";
import { useFormContext } from "@/components/form";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { generateQrcode } from "./api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DynamicPPQR() {
  const form = useFormContext();
  const [current, setCurrent] = useState(form.values.amount as string);
  const [qrcode, setQrcode] = useState("");
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const amount = form.values.amount as string;
    if (!amount) {
      setCurrent("");
      setQrcode("");
      setChanged(false);
      return;
    }
    let timeout: any;
    generateQrcode(amount).then(
      (v) => (
        setQrcode(v),
        setCurrent(amount),
        setChanged(true),
        (timeout = setTimeout(() => setChanged(false), 2000))
      ),
    );
    return () => clearTimeout(timeout);
  }, [form.values.amount]);
  return (
    <Tooltip open={changed}>
      <TooltipTrigger asChild>
        {form.values.amount ? (
          current === form.values.amount ? (
            <div className="shrink-0 rounded bg-white p-1">
              <QRCode value={qrcode} size={128 - 8} />
            </div>
          ) : (
            <div className="size-32 shrink-0 animate-pulse overflow-hidden rounded">
              <Image
                src={PromptpayImage}
                alt="Promptpay QR Code"
                className="max-w-32 shrink-0 rounded blur-md"
              />
            </div>
          )
        ) : (
          <Image
            src={PromptpayImage}
            alt="Promptpay QR Code"
            className="max-w-32 shrink-0 rounded"
          />
        )}
      </TooltipTrigger>
      <TooltipContent>จำนวน {current} บาท</TooltipContent>
    </Tooltip>
  );
}
