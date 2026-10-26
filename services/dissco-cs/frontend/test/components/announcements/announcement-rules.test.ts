import { describe, expect, it } from 'vitest';
import { AnnouncementDto } from '@dissco-cs/shared-types';

import {
  announcementSignature,
  announcementTargetsFor,
  mergeAnnouncements,
  unseenAnnouncements,
} from '../../../src/components/announcements/announcement-rules';

function announcement(id: string, title = 'T'): AnnouncementDto {
  return {
    id, title: { nl: title }, description: { nl: 'D' }, targetType: 'homepage', targetProjectSlug: null,
    isActive: true, startDate: null, endDate: null,
  };
}

describe('announcementTargetsFor', () => {
  it('home and the project list have their own place', () => {
    expect(announcementTargetsFor('/')).toEqual({ page: { target: 'homepage' } });
    expect(announcementTargetsFor('/explore/')).toEqual({ page: { target: 'projects' } });
  });

  it('a project page shows the strip for that project', () => {
    expect(announcementTargetsFor('/explore/herbarium')).toEqual({
      page: { target: 'project', projectSlug: 'herbarium' },
      projectSlug: 'herbarium',
    });
  });

  it('the annotate page keeps the project for the pin, but gets no strip', () => {
    expect(announcementTargetsFor('/explore/herbarium/manifests/12/annotate')).toEqual({ page: null, projectSlug: 'herbarium' });
  });

  it('other pages have no announcements of their own', () => {
    expect(announcementTargetsFor('/forum')).toEqual({ page: null });
  });
});

describe('unseenAnnouncements', () => {
  it('leaves out what was seen', () => {
    const a = announcement('1');
    const b = announcement('2');
    expect(unseenAnnouncements([a, b], [announcementSignature(a)])).toEqual([b]);
  });

  it('an edited announcement counts as new again', () => {
    const seen = [announcementSignature(announcement('1', 'Old title'))];
    expect(unseenAnnouncements([announcement('1', 'New title')], seen)).toHaveLength(1);
  });
});

describe('mergeAnnouncements', () => {
  it('keeps each announcement once, in the order of the lists', () => {
    const a = announcement('1');
    const b = announcement('2');
    expect(mergeAnnouncements([b], [a, b]).map(x => x.id)).toEqual(['2', '1']);
  });
});
