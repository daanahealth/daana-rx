'use client';

import { useState } from 'react';
import { ArrowLeft, Bug, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { notifications } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  opened: boolean;
  onClose: () => void;
}

type FeedbackType = 'Feature_Request' | 'Bug';

interface OptionDef {
  value: FeedbackType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

const OPTIONS: OptionDef[] = [
  {
    value: 'Feature_Request',
    title: 'Request a feature',
    description: 'Suggest something new or improved.',
    icon: Sparkles,
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    value: 'Bug',
    title: 'Report a bug',
    description: 'Tell us about something that broke or feels off.',
    icon: Bug,
    iconClass: 'bg-destructive/10 text-destructive',
  },
];

export function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setFeedbackType(null);
    setTitle('');
    setBody('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!feedbackType || !title.trim() || !body.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please add a title and a short description.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend currently exposes a placeholder feedback service
      // (`/notifications/feedback`). The orchestrator will swap in
      // `/api/feedback` when the dedicated route ships; the body shape
      // we send already carries title + body for forward compatibility.
      const composed = `Title: ${title.trim()}\n\n${body.trim()}`;
      await notifications.submitFeedback(feedbackType, composed);
      toast({
        title: 'Thanks for the feedback',
        description:
          feedbackType === 'Bug'
            ? 'Bug report sent to the Daana team.'
            : 'Feature request sent to the Daana team.',
      });
      reset();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit feedback.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeOption = OPTIONS.find((o) => o.value === feedbackType) ?? null;

  return (
    <Dialog open={opened} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/60 shadow-large">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {feedbackType && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => !isSubmitting && reset()}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {activeOption ? activeOption.title : 'How can we help?'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {activeOption
              ? activeOption.description
              : 'Pick the option that best fits your feedback.'}
          </DialogDescription>
        </DialogHeader>

        {!feedbackType && (
          <div className="grid gap-3 py-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeedbackType(opt.value)}
                  className={cn(
                    'group flex items-center gap-4 rounded-xl border border-border/60 bg-background/60 p-4 text-left',
                    'transition-all duration-200 ease-out',
                    'hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 hover:shadow-soft'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      opt.iconClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{opt.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {feedbackType && (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="feedback-title">Title</Label>
              <Input
                id="feedback-title"
                placeholder={
                  feedbackType === 'Bug'
                    ? 'Short summary of the issue'
                    : 'Short summary of your idea'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-body">Details</Label>
              <Textarea
                id="feedback-body"
                placeholder={
                  feedbackType === 'Bug'
                    ? 'What happened? What were you trying to do?'
                    : 'What problem does this solve? Any context that helps?'
                }
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isSubmitting}
                className="resize-none"
                maxLength={2000}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {feedbackType && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !body.trim()}
            >
              {isSubmitting ? 'Sending…' : 'Send'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
