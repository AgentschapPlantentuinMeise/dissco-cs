import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { MadocUserIdentity, requestMadocUserIdentity, requireUser } from '../jwt.js';
import { CreateReplyBody, CreateTopicBody, isNonEmptyString } from '../validators.js';

// A piece of forum content (topic or reply) can be removed/closed by whoever wrote it, or by
// any site admin -- same rule for both content types and both actions (delete, close).
function isOwnerOrAdmin(identity: MadocUserIdentity, authorUserId: number): boolean {
  return identity.userId === authorUserId || identity.scope.includes('site.admin');
}

export function forumRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/topics', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const topics = await repository.forum.listTopics(identity.siteId, identity.userId);
    return c.json({ topics });
  });

  app.post('/topics/visit', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    await repository.forum.markAllEmptyTopicsSeen(identity.siteId, identity.userId);
    return c.body(null, 204);
  });

  app.post('/topics', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => null)) as CreateTopicBody | null;
    if (!payload || !isNonEmptyString(payload.title) || !isNonEmptyString(payload.body)) {
      return c.text('title and body are required', 400);
    }

    const taskUrl = isNonEmptyString(payload.taskUrl) ? payload.taskUrl : null;
    const projectSlug = isNonEmptyString(payload.projectSlug) ? payload.projectSlug : null;
    const projectLabel = isNonEmptyString(payload.projectLabel) ? payload.projectLabel : null;

    const topic = await repository.forum.createTopic({
      siteId: identity.siteId,
      authorUserId: identity.userId,
      authorName: identity.name,
      title: payload.title,
      taskUrl,
      projectSlug,
      projectLabel,
      body: payload.body,
    });

    await repository.forum.markTopicSeen(identity.userId, topic.id, 0);

    return c.json(topic, 201);
  });

  app.get('/topics/:id', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const topicId = Number(c.req.param('id'));
    if (!Number.isInteger(topicId)) {
      return c.notFound();
    }

    const topic = await repository.forum.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }

    const replies = await repository.forum.listReplies(identity.siteId, topicId);
    await repository.forum.markTopicSeen(identity.userId, topicId, replies.length);
    return c.json({ ...topic, replies });
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

    const topic = await repository.forum.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, topic.author_user_id)) {
      return c.text('Forbidden', 403);
    }

    const deleted = await repository.forum.deleteTopic(identity.siteId, topicId);
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

    const topic = await repository.forum.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, topic.author_user_id)) {
      return c.text('Forbidden', 403);
    }

    const closed = await repository.forum.closeTopic(identity.siteId, topicId);
    return c.json(closed ?? topic);
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

    const reply = await repository.forum.getReply(identity.siteId, replyId);
    if (!reply || Number(reply.topic_id) !== Number(c.req.param('id'))) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, reply.author_user_id)) {
      return c.text('Forbidden', 403);
    }

    const deleted = await repository.forum.deleteReply(identity.siteId, replyId);
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

    const payload = (await c.req.json().catch(() => null)) as CreateReplyBody | null;
    if (!payload || !isNonEmptyString(payload.body)) {
      return c.text('body is required', 400);
    }

    const topic = await repository.forum.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (topic.closed_at) {
      return c.text('This topic is closed', 403);
    }

    const reply = await repository.forum.createReply({
      siteId: identity.siteId,
      topicId,
      authorUserId: identity.userId,
      authorName: identity.name,
      body: payload.body,
    });

    if (!reply) {
      return c.notFound();
    }

    const replies = await repository.forum.listReplies(identity.siteId, topicId);
    await repository.forum.markTopicSeen(identity.userId, topicId, replies.length);

    return c.json(reply, 201);
  });

  return app;
}
