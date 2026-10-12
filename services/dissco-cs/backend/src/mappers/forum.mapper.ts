import { ForumReplyDto, ForumTopicDto } from '@dissco-cs/shared-types';
import { ForumReplyRow, ForumTopicWithReplyCount } from '../repositories/forum.repository.js';

// site_id is site scoping, never part of the wire DTO.
export function toForumTopicDto(topic: ForumTopicWithReplyCount): ForumTopicDto {
  return {
    id: topic.id,
    author_user_id: topic.author_user_id,
    author_name: topic.author_name,
    title: topic.title,
    task_url: topic.task_url,
    project_slug: topic.project_slug,
    project_label: topic.project_label,
    body: topic.body,
    created_at: topic.created_at.toISOString(),
    last_activity: topic.last_activity.toISOString(),
    closed_at: topic.closed_at ? topic.closed_at.toISOString() : null,
    reply_count: topic.reply_count,
    last_seen_reply_count: topic.last_seen_reply_count,
  };
}

export function toForumReplyDto(row: ForumReplyRow): ForumReplyDto {
  return {
    id: row.id,
    topic_id: row.topic_id,
    author_user_id: row.author_user_id,
    author_name: row.author_name,
    body: row.body,
    created_at: row.created_at.toISOString(),
  };
}
