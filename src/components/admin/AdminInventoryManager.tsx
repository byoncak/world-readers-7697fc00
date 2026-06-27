import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Package, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import StyledName from '@/components/StyledName';

interface Profile {
  user_id: string;
  display_name: string | null;
}

interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface InventoryRow {
  id: string;
  user_id: string;
  item_id: string;
  equipped: boolean;
  purchased_at: string;
  shop_items: { name: string; category: string } | null;
}

const AdminInventoryManager = () => {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [profRes, itemRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name').order('display_name'),
      supabase.from('shop_items').select('id, name, category, price').eq('active', true).order('name'),
    ]);
    setProfiles(profRes.data || []);
    setShopItems(itemRes.data || []);
    setLoading(false);
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!selectedUser) { setInventory([]); return; }
    const { data } = await supabase
      .from('user_inventory')
      .select('id, user_id, item_id, equipped, purchased_at, shop_items(name, category)')
      .eq('user_id', selectedUser);
    setInventory((data as unknown as InventoryRow[]) || []);
  }, [selectedUser]);

  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);
  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const grantItem = async () => {
    if (!selectedUser || !selectedItem) return;
    // Check if already owned
    const exists = inventory.some(i => i.item_id === selectedItem);
    if (exists) {
      toast({ title: 'Already owned', description: 'This member already has that item.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('user_inventory').insert({ user_id: selectedUser, item_id: selectedItem });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item granted ✅' });
      setSelectedItem('');
      fetchInventory();
    }
  };

  const revokeItem = async (invId: string) => {
    const { error } = await supabase.from('user_inventory').delete().eq('id', invId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item revoked 🗑️' });
      fetchInventory();
    }
  };

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.display_name || 'Reader';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="cozy-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent-foreground" />
            <h2 className="cozy-title text-lg">Inventory Manager</h2>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground font-body py-4 text-center">Loading…</p>
          ) : (
            <>
              {/* Member select */}
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="cozy-input text-xs py-1 w-full"
              >
                <option value="">Select a member…</option>
                {profiles.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.display_name || 'Reader'}</option>
                ))}
              </select>

              {selectedUser && (
                <>
                  {/* Grant item row */}
                  <div className="flex gap-2 items-end">
                    <select
                      value={selectedItem}
                      onChange={e => setSelectedItem(e.target.value)}
                      className="cozy-input text-xs py-1 flex-1"
                    >
                      <option value="">Pick an item to grant…</option>
                      {shopItems.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category}) — {s.price}🍎</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={grantItem} disabled={!selectedItem} className="shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Grant
                    </Button>
                  </div>

                  {/* Current inventory */}
                  <div>
                    <h3 className="text-xs font-semibold font-body text-muted-foreground mb-1.5">
                      {getName(selectedUser)}'s Inventory ({inventory.length})
                    </h3>
                    {inventory.length === 0 ? (
                      <p className="text-xs text-muted-foreground font-body">No items yet.</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {inventory.map(inv => (
                          <div key={inv.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold">{inv.shop_items?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">{inv.shop_items?.category}</span>
                              {inv.equipped && <span className="ml-1.5 text-[10px] text-primary font-semibold">Equipped</span>}
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => revokeItem(inv.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AdminInventoryManager;
