import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Store, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: '🖼️ Frames',
  badge: '🏅 Badges',
  title: '🎭 Titles',
  name_flair: '✨ Flair',
  progress_bar: '📊 Bars',
  theme: '🌙 Themes',
};

const AdminShopEditor = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: '', description: '', price: 0 });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('shop_items')
      .select('id, name, description, category, price, active')
      .order('category')
      .order('price');
    setItems((data as ShopItem[]) || []);
  }, []);

  useEffect(() => { if (open) fetchItems(); }, [open, fetchItems]);

  const startEdit = (item: ShopItem) => {
    setEditingId(item.id);
    setEditValues({ name: item.name, description: item.description, price: item.price });
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async () => {
    if (!editingId || !editValues.name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('shop_items')
      .update({
        name: editValues.name.trim(),
        description: editValues.description.trim(),
        price: Math.max(0, editValues.price),
      })
      .eq('id', editingId);
    setSaving(false);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item updated ✅' });
      setEditingId(null);
      fetchItems();
    }
  };

  const toggleActive = async (item: ShopItem) => {
    const { error } = await supabase
      .from('shop_items')
      .update({ active: !item.active })
      .eq('id', item.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchItems();
    }
  };

  // Group by category
  const grouped = items.reduce<Record<string, ShopItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="cozy-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-accent-foreground" />
            <h2 className="cozy-title text-lg">Shop Editor</h2>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-muted-foreground font-body mb-1.5">
                {CATEGORY_LABELS[cat] || cat} ({catItems.length})
              </h3>
              <div className="space-y-1">
                {catItems.map(item => (
                  <div key={item.id} className={`rounded-xl border p-2 ${item.active ? 'border-border' : 'border-border/40 opacity-50'}`}>
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editValues.name}
                          onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                          placeholder="Name"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editValues.description}
                          onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                          placeholder="Description"
                          className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editValues.price}
                            onChange={e => setEditValues(v => ({ ...v, price: parseInt(e.target.value) || 0 }))}
                            className="h-8 text-sm w-24"
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground">🍎</span>
                          <div className="ml-auto flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveEdit} disabled={saving}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} aria-label="Cancel edit">
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{item.price}🍎</span>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => startEdit(item)} aria-label="Edit item">
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant={item.active ? 'outline' : 'default'}
                          className="h-7 text-[10px] shrink-0"
                          onClick={() => toggleActive(item)}
                        >
                          {item.active ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground font-body py-4 text-center">No shop items found.</p>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AdminShopEditor;
