import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentEditor } from "./cms/ContentEditor";
import { PlansEditor } from "./cms/PlansEditor";
import { ThemeEditor } from "./cms/ThemeEditor";
import { MediaLibrary } from "./cms/MediaLibrary";
import { AdvancedSettings } from "./cms/AdvancedSettings";

export const AdminTechnical = () => {
  const [activeTab, setActiveTab] = useState("pages");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pages">📄 Páginas</TabsTrigger>
          <TabsTrigger value="plans">💳 Planos</TabsTrigger>
          <TabsTrigger value="theme">🎨 Tema Visual</TabsTrigger>
          <TabsTrigger value="media">🖼️ Mídia</TabsTrigger>
          <TabsTrigger value="advanced">⚙️ Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <ContentEditor />
        </TabsContent>

        <TabsContent value="plans">
          <PlansEditor />
        </TabsContent>

        <TabsContent value="theme">
          <ThemeEditor />
        </TabsContent>

        <TabsContent value="media">
          <MediaLibrary />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
