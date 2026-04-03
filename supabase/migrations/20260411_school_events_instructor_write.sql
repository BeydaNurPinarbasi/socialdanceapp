create policy "Assigned instructors can insert school events"
on public.school_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
);

create policy "Assigned instructors can update school events"
on public.school_events
for update
to authenticated
using (
  exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
);

create policy "Assigned instructors can delete school events"
on public.school_events
for delete
to authenticated
using (
  exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
);
