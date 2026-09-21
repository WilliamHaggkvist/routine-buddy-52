ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 2;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_range CHECK (priority BETWEEN 1 AND 3);