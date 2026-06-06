'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FeedbackModal } from './FeedbackModal';
import { cn } from '@/lib/utils';

/**
 * Floating chat icon.
 *
 * Per the MASS MVP spec ("Floating Chat Icon"): always pinned to the
 * bottom-right corner after login. Tapping it opens the feedback modal
 * which surfaces two options — Request a feature, Report a bug. On
 * mobile, the bottom offset is bumped so the icon clears any mobile
 * tab bar that may sit above the home indicator.
 */
export function FeedbackButton() {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              onClick={() => setOpened(true)}
              aria-label="Send feedback"
              className={cn(
                'fixed z-50 h-14 w-14 rounded-full',
                'bottom-6 right-6',
                'bg-primary text-primary-foreground',
                'shadow-medium hover:shadow-large',
                'transition-all duration-250 ease-out',
                'hover:-translate-y-0.5 hover:bg-primary/90',
                'active:translate-y-0 active:scale-95'
              )}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="sr-only">Send Feedback</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Feedback &amp; bug reports</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <FeedbackModal opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
