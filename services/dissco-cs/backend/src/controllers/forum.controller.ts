import { Hono } from 'hono';
import { ForumRepository } from '../repositories/forum.repository.js';
import { MadocUserIdentity, requestMadocUserIdentity, requireUser } from '../auth/auth.js';
import { forumReplyInputSchema, forumTopicInputSchema } from '@dissco-cs/shared-types';

// A piece of forum content (topic or reply) can be removed/closed by whoever wrote it, or by
// any site admin -- same rule for both content types and both actions (delete, close).
function isOwnerOrAdmin(identity: MadocUserIdentity, authorUserId: number): boolean {
  return identity.userId === authorUserId || identity.scope.includes('site.admin');
}

export function forumController(forumRepository: ForumRepository): Hono {
  const app = new Hono();

  app.get('/topics', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const topics = await forumRepository.listTopics(identity.siteId, identity.userId);
    return c.json({ topics });
  });

  app.post('/topics/visit', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    await forumRepository.markAllEmptyTopicsSeen(identity.siteId, identity.userId);
    return c.body(null, 204);
  });

  app.post('/topics', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const result = forumTopicInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('title and body are required', 400);
    }

    const topic = await forumRepository.createTopic({
      siteId: identity.siteId,
      authorUserId: identity.userId,
      authorName: identity.name,
      title: result.data.title,
      taskUrl: result.data.taskUrl,
      projectSlug: result.data.projectSlug,
      projectLabel: result.data.projectLabel,
      body: result.data.body,
    });

    await forumRepository.markTopicSeen(identity.userId, topic.id, 0);

    // A freshly created topic trivially has no replies yet -- no extra query needed.
    return c.json({ ...topic, reply_count: 0, last_seen_reply_count: 0 }, 201);
  });

  app.get('/topics/:id/replies', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const topicId = Number(c.req.param('id'));
    if (!Number.isInteger(topicId)) {
      return c.notFound();
    }

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }

    const replies = await forumRepository.listReplies(identity.siteId, topicId);
    await forumRepository.markTopicSeen(identity.userId, topicId, replies.length);
    return c.json(replies);
  });

  app.delete('/topics/:id', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const topicId = Number(c.req.param('id'));
    if (!Number.isInteger(topicId)) {
      return c.notFound();
    }

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, topic.author_user_id)) {
      return c.text('Forbidden', 403);
    }

    const deleted = await forumRepository.deleteTopic(identity.siteId, topicId);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.post('/topics/:id/close', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const topicId = Number(c.req.param('id'));
    if (!Number.isInteger(topicId)) {
      return c.notFound();
    }

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, topic.author_user_id)) {
      return c.text('Forbidden', 403);
    }

    const closed = await forumRepository.closeTopic(identity.siteId, topicId);
    const replies = await forumRepository.listReplies(identity.siteId, topicId);
    return c.json({ ...(closed ?? topic), reply_count: replies.length, last_seen_reply_count: replies.length });
  });

  app.delete('/topics/:id/replies/:replyId', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const replyId = Number(c.req.param('replyId'));
    if (!Number.isInteger(replyId)) {
      return c.notFound();
    }

    const reply = await forumRepository.getReply(identity.siteId, replyId);
    if (!reply || Number(reply.topic_id) !== Number(c.req.param('id'))) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, reply.author_user_id)) {
      return c.text('Forbidden', 403);
    }

    const deleted = await forumRepository.deleteReply(identity.siteId, replyId);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.post('/topics/:id/replies', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const topicId = Number(c.req.param('id'));
    if (!Number.isInteger(topicId)) {
      return c.notFound();
    }

    const result = forumReplyInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('body is required', 400);
    }

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (topic.closed_at) {
      return c.text('This topic is closed', 403);
    }

    const reply = await forumRepository.createReply({
      siteId: identity.siteId,
      topicId,
      authorUserId: identity.userId,
      authorName: identity.name,
      body: result.data.body,
    });

    if (!reply) {
      return c.notFound();
    }

    const replies = await forumRepository.listReplies(identity.siteId, topicId);
    await forumRepository.markTopicSeen(identity.userId, topicId, replies.length);

    return c.json(reply, 201);
  });

  return app;
}
