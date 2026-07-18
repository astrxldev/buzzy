import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SettingsAccountSection } from "./account";
import { getSettongs } from "./api";
import { SettingsServicesSection } from "./services";

export default async function () {
  const { enka, donatePromptpay, donateTruemoney } = await getSettongs();

  return (
    <div className="grid h-full w-full gap-8 p-2 pl-0">
      <Tabs defaultValue="external">
        <TabsList className="w-full">
          <TabsTrigger value="external">บริการนอก</TabsTrigger>
          <TabsTrigger value="account">บัญชี</TabsTrigger>
        </TabsList>
        <TabsContent value="external">
          <SettingsServicesSection
            enka={enka}
            donPp={donatePromptpay}
            donTmn={donateTruemoney}
          />
        </TabsContent>
        <TabsContent value="account">
          <SettingsAccountSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

export const dynamic = "force-dynamic";
