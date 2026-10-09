import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { description?: string }) {
  return (
    <Card className={cn("h-full", className)} {...props}>
      <CardHeader>
        {title && <CardTitle className="text-2xl">{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-full">{children}</CardContent>
    </Card>
  );
}
