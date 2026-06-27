
-- Helper: club id of a book (used by book-scoped tables that don't carry club_id directly via join)
-- Already have is_club_member / is_club_admin

-- BOOKS
DROP POLICY IF EXISTS "Authenticated users can view books" ON public.books;
DROP POLICY IF EXISTS "Privileged users can insert books" ON public.books;
DROP POLICY IF EXISTS "Privileged users can update books" ON public.books;
DROP POLICY IF EXISTS "Privileged users can delete books" ON public.books;
CREATE POLICY "Members can view club books" ON public.books FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Club admins can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club admins can update books" ON public.books FOR UPDATE TO authenticated USING (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id)) WITH CHECK (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club admins can delete books" ON public.books FOR DELETE TO authenticated USING (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));

-- DISCUSSIONS
DROP POLICY IF EXISTS "Authenticated users can view discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can insert own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can delete own discussions" ON public.discussions;
CREATE POLICY "Members can view club discussions" ON public.discussions FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert discussions" ON public.discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Users or admins can delete discussions" ON public.discussions FOR DELETE TO authenticated USING (auth.uid() = user_id OR (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id)));

-- DISCUSSION_REACTIONS
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.discussion_reactions;
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.discussion_reactions;
CREATE POLICY "Members can view discussion reactions" ON public.discussion_reactions FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert discussion reactions" ON public.discussion_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- ACTIVITY_REACTIONS
DROP POLICY IF EXISTS "Authenticated users can view activity reactions" ON public.activity_reactions;
DROP POLICY IF EXISTS "Users can insert own activity reactions" ON public.activity_reactions;
CREATE POLICY "Members can view activity reactions" ON public.activity_reactions FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert activity reactions" ON public.activity_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- MEETING_RSVPS
DROP POLICY IF EXISTS "Authenticated users can view RSVPs" ON public.meeting_rsvps;
DROP POLICY IF EXISTS "Users can insert own RSVPs" ON public.meeting_rsvps;
DROP POLICY IF EXISTS "Users can update own RSVPs" ON public.meeting_rsvps;
CREATE POLICY "Members can view club RSVPs" ON public.meeting_rsvps FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert own RSVPs" ON public.meeting_rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can update own RSVPs" ON public.meeting_rsvps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- READING_PROGRESS
DROP POLICY IF EXISTS "Users can view all progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.reading_progress;
CREATE POLICY "Members can view club reading progress" ON public.reading_progress FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert own progress" ON public.reading_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Users update own progress" ON public.reading_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLLS
DROP POLICY IF EXISTS "Authenticated can view polls" ON public.polls;
DROP POLICY IF EXISTS "Privileged can insert polls" ON public.polls;
DROP POLICY IF EXISTS "Privileged can update polls" ON public.polls;
DROP POLICY IF EXISTS "Privileged can delete polls" ON public.polls;
CREATE POLICY "Members can view club polls" ON public.polls FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Club admins can insert polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club admins can update polls" ON public.polls FOR UPDATE TO authenticated USING (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id)) WITH CHECK (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club admins can delete polls" ON public.polls FOR DELETE TO authenticated USING (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));

-- POLL_VOTES
DROP POLICY IF EXISTS "Authenticated can view poll votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON public.poll_votes;
CREATE POLICY "Members can view poll votes" ON public.poll_votes FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert own votes" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- BOOK_VOTES (suggestions)
DROP POLICY IF EXISTS "Authenticated users can view suggestions" ON public.book_votes;
DROP POLICY IF EXISTS "Users can insert own suggestions" ON public.book_votes;
DROP POLICY IF EXISTS "Users can delete own suggestions" ON public.book_votes;
DROP POLICY IF EXISTS "Privileged can delete any suggestion" ON public.book_votes;
CREATE POLICY "Members can view book suggestions" ON public.book_votes FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert suggestions" ON public.book_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Owner or club admin can delete suggestion" ON public.book_votes FOR DELETE TO authenticated USING (auth.uid() = user_id OR (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id)));

-- VOTE_LIKES
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.vote_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.vote_likes;
CREATE POLICY "Members can view vote likes" ON public.vote_likes FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert vote likes" ON public.vote_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- SUGGESTION_COMMENTS
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.suggestion_comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.suggestion_comments;
DROP POLICY IF EXISTS "Privileged can delete any suggestion comment" ON public.suggestion_comments;
CREATE POLICY "Members can view suggestion comments" ON public.suggestion_comments FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert comments" ON public.suggestion_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Owner or club admin can delete comment" ON public.suggestion_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id)));

-- BOOK_QUOTES
DROP POLICY IF EXISTS "Authenticated can view quotes" ON public.book_quotes;
DROP POLICY IF EXISTS "Users can insert own quotes" ON public.book_quotes;
CREATE POLICY "Members can view club quotes" ON public.book_quotes FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert quotes" ON public.book_quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- BOOK_RATINGS
DROP POLICY IF EXISTS "Authenticated can view ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON public.book_ratings;
CREATE POLICY "Members can view club ratings" ON public.book_ratings FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert ratings" ON public.book_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "Authenticated can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Privileged users can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Privileged users can delete announcements" ON public.announcements;
CREATE POLICY "Members can view announcements" ON public.announcements FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Club admins can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club admins can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (club_id IS NOT NULL AND public.is_club_admin(auth.uid(), club_id));

-- ANNOUNCEMENT_READS (keep user-scoped, no club gating needed)

-- CHEERS
DROP POLICY IF EXISTS "Authenticated can view cheers" ON public.cheers;
DROP POLICY IF EXISTS "Users can insert own cheers" ON public.cheers;
CREATE POLICY "Members can view club cheers" ON public.cheers FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert cheers" ON public.cheers FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));

-- MESSAGES (community board)
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Members can view messages" ON public.messages FOR SELECT TO authenticated USING (club_id IS NULL OR public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Members can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND club_id IS NOT NULL AND public.is_club_member(auth.uid(), club_id));
