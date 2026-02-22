import { useState } from "react";
import { 
  Palette, 
  Type, 
  LayoutTemplate, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Save, 
  Undo2 
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import { Switch } from "@/app/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Separator } from "@/app/components/ui/separator";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { toast } from "sonner";
import BlogPreview, { BlogConfig } from "@/app/components/BlogPreview";

export default function Configure() {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  const defaultConfig: BlogConfig = {
    typography: {
      fontFamily: "Inter, sans-serif",
      headingFont: "Inter, sans-serif",
      baseSize: 16,
    },
    colors: {
      accent: "#111827",
      background: "#ffffff",
      text: "#1f2937",
      cardBg: "#ffffff",
    },
    layout: {
      gridColumns: 3,
      gap: 32,
      showAuthor: true,
      showDate: true,
      cardStyle: 'bordered',
    },
  };

  const [config, setConfig] = useState<BlogConfig>(defaultConfig);

  const handleSave = () => {
    toast.success("Configuration saved successfully!");
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    toast.info("Configuration reset to defaults.");
  };

  const updateConfig = (section: keyof BlogConfig, key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden bg-neutral-100">
      {/* Configuration Sidebar */}
      <aside className="w-80 bg-white border-r border-neutral-200 flex flex-col z-10 shadow-sm">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Settings</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSave} title="Save">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="layout" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="layout" className="flex gap-2">
                <LayoutTemplate className="h-4 w-4" />
                <span className="sr-only">Layout</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex gap-2">
                <Type className="h-4 w-4" />
                <span className="sr-only">Typography</span>
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex gap-2">
                <Palette className="h-4 w-4" />
                <span className="sr-only">Colors</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              
              {/* Layout Settings */}
              <TabsContent value="layout" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Card Style</Label>
                    <Select 
                      value={config.layout.cardStyle} 
                      onValueChange={(v) => updateConfig('layout', 'cardStyle', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="bordered">Bordered</SelectItem>
                        <SelectItem value="shadow">Shadow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Grid Columns</Label>
                      <span className="text-xs text-neutral-500">{config.layout.gridColumns}</span>
                    </div>
                    <Slider 
                      min={1} 
                      max={4} 
                      step={1} 
                      value={[config.layout.gridColumns]} 
                      onValueChange={([v]) => updateConfig('layout', 'gridColumns', v)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Gap Size</Label>
                      <span className="text-xs text-neutral-500">{config.layout.gap}px</span>
                    </div>
                    <Slider 
                      min={16} 
                      max={64} 
                      step={4} 
                      value={[config.layout.gap]} 
                      onValueChange={([v]) => updateConfig('layout', 'gap', v)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-author">Show Author</Label>
                    <Switch 
                      id="show-author" 
                      checked={config.layout.showAuthor}
                      onCheckedChange={(v) => updateConfig('layout', 'showAuthor', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-date">Show Date</Label>
                    <Switch 
                      id="show-date" 
                      checked={config.layout.showDate}
                      onCheckedChange={(v) => updateConfig('layout', 'showDate', v)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Typography Settings */}
              <TabsContent value="typography" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Heading Font</Label>
                    <Select 
                      value={config.typography.headingFont} 
                      onValueChange={(v) => updateConfig('typography', 'headingFont', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                        <SelectItem value="Playfair Display, serif">Playfair Display</SelectItem>
                        <SelectItem value="Merriweather, serif">Merriweather</SelectItem>
                        <SelectItem value="Oswald, sans-serif">Oswald</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Body Font</Label>
                    <Select 
                      value={config.typography.fontFamily} 
                      onValueChange={(v) => updateConfig('typography', 'fontFamily', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                        <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                        <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                        <SelectItem value="Lora, serif">Lora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Base Size</Label>
                      <span className="text-xs text-neutral-500">{config.typography.baseSize}px</span>
                    </div>
                    <Slider 
                      min={12} 
                      max={24} 
                      step={1} 
                      value={[config.typography.baseSize]} 
                      onValueChange={([v]) => updateConfig('typography', 'baseSize', v)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Colors Settings */}
              <TabsContent value="colors" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-8 h-8 rounded-full border border-neutral-200 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: "#111827" }}
                        onClick={() => updateConfig('colors', 'accent', "#111827")}
                      />
                      <div 
                        className="w-8 h-8 rounded-full border border-neutral-200 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: "#2563eb" }}
                        onClick={() => updateConfig('colors', 'accent', "#2563eb")}
                      />
                      <div 
                        className="w-8 h-8 rounded-full border border-neutral-200 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: "#dc2626" }}
                        onClick={() => updateConfig('colors', 'accent', "#dc2626")}
                      />
                      <div 
                        className="w-8 h-8 rounded-full border border-neutral-200 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: "#16a34a" }}
                        onClick={() => updateConfig('colors', 'accent', "#16a34a")}
                      />
                      <div 
                        className="w-8 h-8 rounded-full border border-neutral-200 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: "#9333ea" }}
                        onClick={() => updateConfig('colors', 'accent', "#9333ea")}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Background</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant={config.colors.background === "#ffffff" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          updateConfig('colors', 'background', "#ffffff");
                          updateConfig('colors', 'cardBg', "#ffffff");
                          updateConfig('colors', 'text', "#1f2937");
                        }}
                      >
                        Light Mode
                      </Button>
                      <Button 
                        variant={config.colors.background === "#1f2937" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          updateConfig('colors', 'background', "#1f2937");
                          updateConfig('colors', 'cardBg', "#374151");
                          updateConfig('colors', 'text', "#f3f4f6");
                        }}
                      >
                        Dark Mode
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </aside>

      {/* Preview Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-100/50">
        <div className="h-14 border-b border-neutral-200 bg-white px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="font-medium text-neutral-900">Live Preview</span>
            <span>•</span>
            <span>Changes auto-save</span>
          </div>
          
          <div className="flex items-center bg-neutral-100 rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${device === 'desktop' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              onClick={() => setDevice('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${device === 'tablet' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              onClick={() => setDevice('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${device === 'mobile' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <div 
            className={`bg-white shadow-xl transition-all duration-300 origin-top overflow-hidden
              ${device === 'desktop' ? 'w-full h-full' : ''}
              ${device === 'tablet' ? 'w-[768px] h-[1024px] rounded-lg my-4 border-8 border-neutral-800' : ''}
              ${device === 'mobile' ? 'w-[375px] h-[812px] rounded-[2rem] my-4 border-8 border-neutral-800' : ''}
            `}
          >
            <div className="h-full w-full overflow-y-auto">
              <BlogPreview config={config} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
