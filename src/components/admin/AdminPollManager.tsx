import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Plus, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from '../ConfirmDialog';

interface Poll {
  id: string;
  question: string;
  options: string[];
  multiple_choice: boolean;
  active: boolean;
  created_at: string;
}

const AdminPollManager = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => { fetchPolls(); }, []);

  const fetchPolls = async () => {
    const { data } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setPolls(data.map((p: any) => ({
        ...p,
        options: Array.isArray(p.options) ? p.options : [],
      })));
    }
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;

    setSubmitting(true);
    try {
      await supabase.from('polls').insert({
        created_by: user.id,
        question: question.trim(),
        options: cleanOptions as any,
        multiple_choice: multipleChoice,
      });
      setQuestion('');
      setOptions(['', '']);
      setMultipleChoice(false);
      setShowForm(false);
      fetchPolls();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('polls').update({ active: !currentActive }).eq('id', id);
    fetchPolls();
  };

  const deletePoll = async (id: string) => {
    await supabase.from('polls').delete().eq('id', id);
    setPendingDelete(null);
    fetchPolls();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-terracotta" />
          <h2 className="cozy-title text-xl">Polls</h2>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-terracotta text-white shadow-md hover:bg-terracotta/90 transition-all"
        >
          <Plus className={`h-4 w-4 transition-transform duration-200 ${showForm ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPoll} className="mb-4 space-y-3 rounded-xl bg-peach/50 p-4">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Poll question"
            className="cozy-input w-full"
            maxLength={300}
            required
          />
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={e => {
                  const copy = [...options];
                  copy[i] = e.target.value;
                  setOptions(copy);
                }}
                placeholder={`Option ${i + 1}`}
                className="cozy-input flex-1"
                maxLength={100}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button type="button" onClick={addOption} className="text-xs text-terracotta font-body hover:underline">
              + Add option
            </button>
          )}
          <label className="flex items-center gap-2 text-sm font-body">
            <input type="checkbox" checked={multipleChoice} onChange={e => setMultipleChoice(e.target.checked)} className="accent-terracotta" />
            Allow multiple selections
          </label>
          <button type="submit" disabled={submitting} className="cozy-btn-primary w-full text-sm disabled:opacity-50">
            {submitting ? 'Creating…' : '📊 Create Poll'}
          </button>
        </form>
      )}

      {polls.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {polls.map(poll => (
            <div key={poll.id} className={`flex items-center justify-between rounded-lg border p-3 ${poll.active ? 'border-border' : 'border-border/50 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-serif truncate">{poll.question}</p>
                <p className="text-[11px] text-muted-foreground font-body">
                  {poll.options.length} options · {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => toggleActive(poll.id, poll.active)}
                  className={`text-xs px-2 py-1 rounded-md font-body ${poll.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}
                >
                  {poll.active ? 'Live' : 'Closed'}
                </button>
                <button onClick={() => setPendingDelete(poll.id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <p className="py-4 text-center text-sm text-muted-foreground font-body">No polls yet</p>
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        message="This poll and all votes will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deletePoll(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default AdminPollManager;
