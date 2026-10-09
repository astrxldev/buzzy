import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const dynamic = "force-dynamic";
