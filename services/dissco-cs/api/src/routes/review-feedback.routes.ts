import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requestMadocUserIdentity } from '../jwt.js';
import {
  CreateFeedbackReplyBody,
  CreateFeedbackThreadBody,
  isNonEmptyString,
  parseCreateFeedbackThreadBody,
} from '../validators.js';
import { isReviewerOrAdmin } from './review.routes.js';

export function reviewFeedbackRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/threads', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const threads = await repository.reviewFeedback.listThreadsForUser(identity.siteId, identity.userId);
    return c.json({ threads });
  });

  app.post('/threads', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    if (!(await isReviewerOrAdmin(identity))) {
      return c.text('Forbidden', 403);
    }

    const payload = (await c.req.json().catch(() => null)) as CreateFeedbackThreadBody | null;
    const parsed = parseCreateFeedbackThreadBody(payload);
    if (!parsed) {
      return c.text('recipientUserId, recipientName, body and a non-empty tasks array are required', 400);
    }

    const thread = await repository.reviewFeedback.createThread({
      siteId: identity.siteId,
      reviewerUserId: identity.userId,
      reviewerName: identity.name,
      recipientUserId: parsed.recipientUserId,
      recipientName: parsed.recipientName,
      body: parsed.body,
      tasks: parsed.tasks,
    });

    return c.json(thread, 201);
  });

  app.get('/threads/:id', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const threadId = Number(c.req.param('id'));
    if (!Number.isInteger(threadId)) {
      return c.notFound();
    }

    const result = await repository.reviewFeedback.getThread(identity.siteId, threadId, identity.userId);
    if (!result) {
      return c.notFound();
    }

    await repository.reviewFeedback.markThreadSeen(identity.userId, threadId);
    return c.json(result);
  });

  app.post('/threads/:id/replies', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const threadId = Number(c.req.param('id'));
    if (!Number.isInteger(threadId)) {
      return c.notFound();
    }

    const payload = (await c.req.json().catch(() => null)) as CreateFeedbackReplyBody | null;
    if (!payload || !isNonEmptyString(payload.body)) {
      return c.text('body is required', 400);
    }

    const reply = await repository.reviewFeedback.createReply({
      siteId: identity.siteId,
      threadId,
      authorUserId: identity.userId,
      authorName: identity.name,
      body: payload.body,
    });

    if (!reply) {
      return c.notFound();
    }

    await repository.reviewFeedback.markThreadSeen(identity.userId, threadId);
    return c.json(reply, 201);
  });

  return app;
}
