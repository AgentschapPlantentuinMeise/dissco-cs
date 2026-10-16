import { Hono } from 'hono';
import { ForumRepository, toForumReplyDto, toForumTopicDto } from '../repositories/forum.repository.js';
import { MadocUserIdentity, requireUser } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { intId, validateParams } from '../infrastructure/validate-params.js';
import { forumReplyInputSchema, forumTopicInputSchema } from '@dissco-cs/shared-types';

function isOwnerOrAdmin(identity: MadocUserIdentity, authorUserId: number): boolean {
  return identity.userId === authorUserId || identity.scope.includes('site.admin');
}

export function forumController(forumRepository: ForumRepository): Hono {
  const app = new Hono();

  app.get('/topics', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const topics = await forumRepository.listTopics(identity.siteId, identity.userId);
    return c.json({ topics: topics.map(toForumTopicDto) });
  });

  app.post('/topics/visit', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    await forumRepository.markAllEmptyTopicsSeen(identity.siteId, identity.userId);
    return c.body(null, 204);
  });

  app.post('/topics', validateJson(forumTopicInputSchema), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const topic = await forumRepository.createTopic({
      siteId: identity.siteId,
      authorUserId: identity.userId,
      authorName: identity.name,
      title: input.title,
      taskUrl: input.taskUrl,
      projectSlug: input.projectSlug,
      projectLabel: input.projectLabel,
      body: input.body,
    });

    await forumRepository.markTopicSeen(identity.userId, topic.id, 0);

    // A new topic has no replies yet, so both counts are 0 without asking the database.
    return c.json(toForumTopicDto({ ...topic, reply_count: 0, last_seen_reply_count: 0 }), 201);
  });

  app.get('/topics/:id/replies', validateParams({ id: intId }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: topicId } = c.req.valid('param');

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }

    const replies = await forumRepository.listReplies(identity.siteId, topicId);
    await forumRepository.markTopicSeen(identity.userId, topicId, replies.length);
    return c.json(replies.map(toForumReplyDto));
  });

  app.delete('/topics/:id', validateParams({ id: intId }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: topicId } = c.req.valid('param');

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, topic.author_user_id)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const deleted = await forumRepository.deleteTopic(identity.siteId, topicId);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.post('/topics/:id/close', validateParams({ id: intId }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: topicId } = c.req.valid('param');

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, topic.author_user_id)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const closed = await forumRepository.closeTopic(identity.siteId, topicId);
    const replies = await forumRepository.listReplies(identity.siteId, topicId);
    return c.json(toForumTopicDto({ ...(closed ?? topic), reply_count: replies.length, last_seen_reply_count: replies.length }));
  });

  app.delete('/topics/:id/replies/:replyId', validateParams({ id: intId, replyId: intId }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: topicId, replyId } = c.req.valid('param');

    const reply = await forumRepository.getReply(identity.siteId, replyId);
    if (!reply || Number(reply.topic_id) !== topicId) {
      return c.notFound();
    }
    if (!isOwnerOrAdmin(identity, reply.author_user_id)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const deleted = await forumRepository.deleteReply(identity.siteId, replyId);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.post('/topics/:id/replies', validateParams({ id: intId }), validateJson(forumReplyInputSchema), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id: topicId } = c.req.valid('param');

    const input = c.req.valid('json');

    const topic = await forumRepository.getTopic(identity.siteId, topicId);
    if (!topic) {
      return c.notFound();
    }
    if (topic.closed_at) {
      return c.json({ error: 'This topic is closed' }, 403);
    }

    const reply = await forumRepository.createReply({
      siteId: identity.siteId,
      topicId,
      authorUserId: identity.userId,
      authorName: identity.name,
      body: input.body,
    });

    if (!reply) {
      return c.notFound();
    }

    const replies = await forumRepository.listReplies(identity.siteId, topicId);
    await forumRepository.markTopicSeen(identity.userId, topicId, replies.length);

    return c.json(toForumReplyDto(reply), 201);
  });

  return app;
}
