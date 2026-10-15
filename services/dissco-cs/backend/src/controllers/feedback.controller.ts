import { Hono } from 'hono';
import { FeedbackRepository, toFeedbackMessageDto, toFeedbackThreadDto } from '../repositories/feedback.repository.js';
import { requireUser } from '../auth/auth.js';
import { feedbackReplyInputSchema, feedbackThreadInputSchema } from '@dissco-cs/shared-types';
import { isReviewerOrAdmin } from './review.controller.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { intId, validateParams } from '../infrastructure/validate-params.js';

export function feedbackController(feedbackRepository: FeedbackRepository): Hono {
  const app = new Hono();

  app.get('/threads', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const threads = await feedbackRepository.listThreadsForUser(identity.siteId, identity.userId);
    return c.json({ threads: threads.map(toFeedbackThreadDto) });
  });

  app.post('/threads', validateJson(feedbackThreadInputSchema), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    if (!(await isReviewerOrAdmin(identity))) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const input = c.req.valid('json');

    const thread = await feedbackRepository.createThread({
      siteId: identity.siteId,
      reviewerUserId: identity.userId,
      reviewerName: identity.name,
      recipientUserId: input.recipientUserId,
      recipientName: input.recipientName,
      subject: input.subject,
      body: input.body,
    });

    // The creator is always the reviewer (gated above), with the one message just inserted --
    // nothing to count via an extra query.
    return c.json(toFeedbackThreadDto({ ...thread, role: 'reviewer', message_count: 1, unread_count: 0 }), 201);
  });

  app.get('/threads/:id', validateParams({ id: intId }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: threadId } = c.req.valid('param');

    const result = await feedbackRepository.getThread(identity.siteId, threadId, identity.userId);
    if (!result) {
      return c.notFound();
    }

    await feedbackRepository.markThreadSeen(identity.userId, threadId);
    // markThreadSeen above just cleared this user's unread messages, so unread_count is 0 here --
    // no extra query needed.
    const role = identity.userId === result.thread.recipient_user_id ? 'recipient' : 'reviewer';
    return c.json({
      thread: toFeedbackThreadDto({ ...result.thread, role, message_count: result.messages.length, unread_count: 0 }),
      messages: result.messages.map(toFeedbackMessageDto),
    });
  });

  app.post('/threads/:id/replies', validateParams({ id: intId }), validateJson(feedbackReplyInputSchema), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: threadId } = c.req.valid('param');

    const input = c.req.valid('json');

    const reply = await feedbackRepository.createReply({
      siteId: identity.siteId,
      threadId,
      authorUserId: identity.userId,
      authorName: identity.name,
      body: input.body,
    });

    if (!reply) {
      return c.notFound();
    }

    await feedbackRepository.markThreadSeen(identity.userId, threadId);
    return c.json(toFeedbackMessageDto(reply), 201);
  });

  app.delete('/threads/:id', validateParams({ id: intId }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: threadId } = c.req.valid('param');

    const result = await feedbackRepository.deleteThreadForUser(identity.siteId, threadId, identity.userId);
    if (!result) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
