import { describe, expect, it } from 'vitest';

import { toAnnouncementDto } from '../../src/repositories/announcements.repository.js';
import { toFeedbackMessageDto, toFeedbackThreadDto } from '../../src/repositories/feedback.repository.js';
import { toForumReplyDto, toForumTopicDto } from '../../src/repositories/forum.repository.js';
import { toInstitutionDto } from '../../src/repositories/institutions.repository.js';
import { toManualDetailDto, toManualSummaryDto } from '../../src/repositories/manuals.repository.js';
import { toNavItemDto } from '../../src/repositories/nav-items.repository.js';
import { toSiteColors } from '../../src/repositories/site-theme.repository.js';
import { toSiteImageDto } from '../../src/repositories/site-images.repository.js';
import { toHomeStepDto } from '../../src/repositories/home-steps.repository.js';

// The DTO rule (see CLAUDE.md): camelCase, every field listed explicitly, never internal columns
// such as site_id. Checking the exact key set catches both a forgotten rename and a `...row`
// that would leak any (future) column.
const created = new Date('2026-01-02T03:04:05.000Z');
const later = new Date('2026-02-03T04:05:06.000Z');

describe('DTO mappers', () => {
  it('toAnnouncementDto', () => {
    const dto = toAnnouncementDto({
      id: '7', site_id: 3, title: { nl: 'T' }, description: { nl: 'D' }, target_type: 'project',
      target_project_slug: 'p', is_active: true, start_date: created, end_date: null, created_at: created,
    });
    expect(dto).toEqual({
      id: '7', title: { nl: 'T' }, description: { nl: 'D' }, targetType: 'project', targetProjectSlug: 'p',
      isActive: true, startDate: '2026-01-02T03:04:05.000Z', endDate: null,
    });
  });

  it('toInstitutionDto', () => {
    const dto = toInstitutionDto({
      id: 1, site_id: 3, slug: 'meise', name: { nl: 'Meise' }, description: {}, email: null, phone: null,
      website: null, logo: null, is_active: false, sort_order: 2, created_at: created, updated_at: later,
    });
    expect(Object.keys(dto).sort()).toEqual(
      ['description', 'email', 'id', 'isActive', 'logo', 'name', 'phone', 'slug', 'sortOrder', 'website']
    );
    expect(dto).toMatchObject({ isActive: false, sortOrder: 2 });
  });

  it('toSiteColors', () => {
    const colors = toSiteColors({
      site_id: 3, primary_color: '#111111', secondary_color: '#222222', accent_color: '#333333',
      dark_color: '#444444', tertiary_color: '#555555', site_name: 'DoeDat', updated_at: later,
    });
    expect(colors).toEqual({
      primary: '#111111', secondary: '#222222', accent: '#333333', dark: '#444444', tertiary: '#555555',
    });
  });

  it('toSiteColors is null for a site with only a name of its own', () => {
    const colors = toSiteColors({
      site_id: 3, primary_color: null, secondary_color: null, accent_color: null,
      dark_color: null, tertiary_color: null, site_name: 'DoeDat', updated_at: later,
    });
    expect(colors).toBeNull();
  });

  it('toSiteImageDto', () => {
    const dto = toSiteImageDto({ image_key: 'home', credit: 'Photo: X', updated_at: later });
    expect(dto).toEqual({ key: 'home', credit: 'Photo: X', updatedAt: '2026-02-03T04:05:06.000Z' });
  });

  it('toHomeStepDto keeps only title and body', () => {
    const dto = toHomeStepDto({ title: { nl: 'Kies' }, body: { nl: 'Een project' }, extra: 1 } as Parameters<typeof toHomeStepDto>[0]);
    expect(dto).toEqual({ title: { nl: 'Kies' }, body: { nl: 'Een project' } });
  });

  it('toNavItemDto leaves the admin-only contact email out', () => {
    const dto = toNavItemDto({
      site_id: 3, page_key: 'contact', is_active: true, content: { nl: 'x' }, intro: { nl: 'i' }, show_contact_form: true,
      contact_email: 'secret@example.org', sort_order: 4, updated_at: later,
    } as Parameters<typeof toNavItemDto>[0]);
    expect(dto).toEqual({ pageKey: 'contact', isActive: true, content: { nl: 'x' }, intro: { nl: 'i' }, showContactForm: true, sortOrder: 4 });
  });

  it('toFeedbackThreadDto and toFeedbackMessageDto', () => {
    const thread = toFeedbackThreadDto({
      id: 1, site_id: 3, reviewer_user_id: 10, reviewer_name: 'R', recipient_user_id: 11, recipient_name: 'S',
      subject: 'Hi', created_at: created, last_activity: later, reviewer_hidden_at: null, recipient_hidden_at: null,
      role: 'recipient', message_count: 2, unread_count: 1,
    } as Parameters<typeof toFeedbackThreadDto>[0]);
    expect(Object.keys(thread).sort()).toEqual([
      'createdAt', 'id', 'lastActivity', 'messageCount', 'recipientName', 'recipientUserId',
      'reviewerName', 'reviewerUserId', 'role', 'subject', 'unreadCount',
    ]);
    expect(thread.lastActivity).toBe('2026-02-03T04:05:06.000Z');

    const message = toFeedbackMessageDto({
      id: 5, thread_id: 1, author_user_id: 10, author_name: 'R', body: 'B', read_at: null, created_at: created,
    } as Parameters<typeof toFeedbackMessageDto>[0]);
    expect(message).toEqual({ id: 5, threadId: 1, authorUserId: 10, authorName: 'R', body: 'B', createdAt: '2026-01-02T03:04:05.000Z' });
  });

  it('toForumTopicDto and toForumReplyDto', () => {
    const topic = toForumTopicDto({
      id: 1, site_id: 3, author_user_id: 10, author_name: 'A', title: 'T', task_url: null, project_slug: 'p',
      project_label: 'P', body: 'B', created_at: created, last_activity: later, closed_at: null,
      reply_count: 4, last_seen_reply_count: null,
    } as Parameters<typeof toForumTopicDto>[0]);
    expect(Object.keys(topic).sort()).toEqual([
      'authorName', 'authorUserId', 'body', 'closedAt', 'createdAt', 'id', 'lastActivity',
      'lastSeenReplyCount', 'projectLabel', 'projectSlug', 'replyCount', 'taskUrl', 'title',
    ]);
    expect(topic.closedAt).toBeNull();

    const reply = toForumReplyDto({
      id: 9, site_id: 3, topic_id: 1, author_user_id: 10, author_name: 'A', body: 'B', created_at: created,
    } as Parameters<typeof toForumReplyDto>[0]);
    expect(reply).toEqual({ id: 9, topicId: 1, authorUserId: 10, authorName: 'A', body: 'B', createdAt: '2026-01-02T03:04:05.000Z' });
  });

  it('BIGSERIAL ids (strings from pg) become numbers in every DTO that promises one', () => {
    const institution = toInstitutionDto({
      id: '4', site_id: 3, slug: 's', name: {}, description: {}, email: null, phone: null,
      website: null, logo: null, is_active: true, sort_order: 0, created_at: created, updated_at: later,
    } as unknown as Parameters<typeof toInstitutionDto>[0]);
    expect(institution.id).toBe(4);

    const manual = toManualDetailDto(
      { id: '2', site_id: 3, title: {}, content: {}, updated_at: later } as unknown as Parameters<typeof toManualDetailDto>[0],
      []
    );
    expect(manual.id).toBe(2);

    const message = toFeedbackMessageDto({
      id: '8', thread_id: '6', author_user_id: 10, author_name: 'A', body: 'B', read_at: null, created_at: created,
    } as unknown as Parameters<typeof toFeedbackMessageDto>[0]);
    expect(message).toMatchObject({ id: 8, threadId: 6 });
  });

  it('the forum mappers turn BIGSERIAL ids (strings from pg) into numbers', () => {
    const topic = toForumTopicDto({
      id: '5', site_id: 3, author_user_id: 10, author_name: 'A', title: 'T', task_url: null, project_slug: null,
      project_label: null, body: 'B', created_at: created, last_activity: later, closed_at: null,
      reply_count: 0, last_seen_reply_count: null,
    } as unknown as Parameters<typeof toForumTopicDto>[0]);
    expect(topic.id).toBe(5);

    const reply = toForumReplyDto({
      id: '9', site_id: 3, topic_id: '5', author_user_id: 10, author_name: 'A', body: 'B', created_at: created,
    } as unknown as Parameters<typeof toForumReplyDto>[0]);
    expect(reply).toMatchObject({ id: 9, topicId: 5 });
  });

  it('toManualSummaryDto and toManualDetailDto', () => {
    const row = { id: 2, site_id: 3, title: { nl: 'H' }, content: { nl: 'C' }, updated_at: later };
    const summary = toManualSummaryDto({ ...row, linkedProjectSlugs: ['p'], attachmentLangs: ['nl'] } as Parameters<typeof toManualSummaryDto>[0]);
    expect(summary).toEqual({
      id: 2, title: { nl: 'H' }, content: { nl: 'C' }, updatedAt: '2026-02-03T04:05:06.000Z',
      linkedProjectSlugs: ['p'], attachmentLangs: ['nl'],
    });

    const detail = toManualDetailDto(row as Parameters<typeof toManualDetailDto>[0], [
      { lang: 'nl', filename: 'a.pdf', mime_type: 'application/pdf', file_size: 123 } as Parameters<typeof toManualDetailDto>[1][number],
    ]);
    expect(detail.attachments).toEqual({ nl: { filename: 'a.pdf', mimeType: 'application/pdf', size: 123 } });
  });
});
